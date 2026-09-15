"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { AuthError, requireRole } from "@/lib/auth";
import {
  LISTING_MAX_KG,
  lotValue,
  PLATFORM_FEE_PER_TRANSACTION,
} from "@/lib/waste";
import { completeWastePurchase } from "@/lib/waste-purchase";

export type PurchaseState = { error?: string; ok?: string };

function revalidateBoth() {
  revalidatePath("/mitra");
  revalidatePath("/mitra/bursa");
  revalidatePath("/pedagang");
  revalidatePath("/pedagang/penjualan");
}

/**
 * Pengolah mengambil satu lot dari bursa.
 *
 * Harga per kg disalin dari tarif yang berlaku saat ini ke dalam pembelian,
 * supaya perubahan tarif di kemudian hari tidak mengubah kesepakatan yang
 * sudah berjalan. Nilai yang tercatat di sini masih perkiraan; yang mengikat
 * adalah hasil timbangan di lokasi.
 */
export async function claimListingAction(
  _prev: PurchaseState,
  formData: FormData,
): Promise<PurchaseState> {
  let user;

  try {
    user = await requireRole("PROCESSOR", "ADMIN");
  } catch (error) {
    if (error instanceof AuthError) return { error: error.message };
    throw error;
  }

  const listingId = String(formData.get("listingId") ?? "");
  const pickupDateRaw = String(formData.get("pickupDate") ?? "");

  const profile = await db.processorProfile.findUnique({
    where: { userId: user.id },
  });

  if (!profile) {
    return { error: "Profil unit pengolahan belum lengkap." };
  }

  if (!profile.buysWaste) {
    return {
      error:
        "Akun Anda terdaftar sebagai peternak maggot mandiri yang memakai bahan baku sendiri, jadi belum bisa membeli di bursa. Hubungi pengelola untuk mengubahnya.",
    };
  }

  const listing = await db.wasteListing.findUnique({
    where: { id: listingId },
    include: { tariff: true },
  });

  if (!listing) {
    return { error: "Lot ini tidak ditemukan." };
  }

  if (listing.status !== "open") {
    return { error: "Lot ini sudah diambil pengolah lain." };
  }

  const pickupDate = pickupDateRaw
    ? new Date(`${pickupDateRaw}T00:00:00`)
    : new Date(listing.readyDate);

  if (Number.isNaN(pickupDate.getTime())) {
    return { error: "Tanggal penjemputan tidak valid." };
  }

  const readyDate = new Date(listing.readyDate);
  readyDate.setHours(0, 0, 0, 0);

  if (pickupDate < readyDate) {
    return {
      error: "Tanggal jemput tidak boleh lebih awal dari tanggal sampah siap.",
    };
  }

  // Kunci lot dulu lewat updateMany bersyarat. Kalau baris yang berubah nol,
  // ada pengolah lain yang menang cepat dan pembelian tidak jadi dibuat.
  const locked = await db.wasteListing.updateMany({
    where: { id: listingId, status: "open" },
    data: { status: "reserved" },
  });

  if (locked.count === 0) {
    return { error: "Lot ini baru saja diambil pengolah lain." };
  }

  try {
    await db.wastePurchase.create({
      data: {
        listingId: listing.id,
        processorId: profile.id,
        tariffId: listing.tariffId,
        unitPricePerKg: listing.tariff.pricePerKg,
        estimatedKg: listing.estimatedKg,
        estimatedAmount: lotValue(listing.tariff.pricePerKg, listing.estimatedKg),
        // Biaya layanan ikut dikunci saat lot diambil, supaya perubahan tarif
        // platform tidak mengubah kesepakatan yang sudah berjalan.
        platformFee: PLATFORM_FEE_PER_TRANSACTION,
        pickupDate,
      },
    });
  } catch {
    // Pembelian gagal dibuat, lot dikembalikan ke bursa supaya tidak tersangkut.
    await db.wasteListing.updateMany({
      where: { id: listingId, status: "reserved" },
      data: { status: "open" },
    });
    return { error: "Lot gagal diambil. Coba lagi." };
  }

  revalidateBoth();

  return { ok: "Lot diambil. Jadwal penjemputan masuk ke daftar Anda." };
}

const weighSchema = z.object({
  purchaseId: z.string().min(1),
  actualKg: z.coerce
    .number()
    .int("Berat harus berupa angka bulat")
    .min(1, "Berat minimal 1 kg")
    .max(LISTING_MAX_KG, "Berat melebihi batas wajar satu kali penjemputan"),
});

/**
 * Penimbangan ulang di lokasi penjemputan.
 *
 * Titik ini yang mengunci nilai transaksi: perkiraan pedagang tidak pernah
 * dipakai untuk menghitung uang maupun untuk statistik dampak. ImpactRecord
 * dibuat di sini, bukan saat pembayaran, karena sampahnya memang sudah
 * teralihkan dari TPA terlepas dari bagaimana nanti dibayar.
 */
export async function recordWeighInAction(
  _prev: PurchaseState,
  formData: FormData,
): Promise<PurchaseState> {
  let user;

  try {
    user = await requireRole("PROCESSOR", "ADMIN");
  } catch (error) {
    if (error instanceof AuthError) return { error: error.message };
    throw error;
  }

  const parsed = weighSchema.safeParse({
    purchaseId: formData.get("purchaseId"),
    actualKg: formData.get("actualKg"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  const purchase = await db.wastePurchase.findUnique({
    where: { id: parsed.data.purchaseId },
    include: { processor: { select: { userId: true } } },
  });

  if (!purchase) {
    return { error: "Penjemputan tidak ditemukan." };
  }

  if (user.role !== "ADMIN" && purchase.processor.userId !== user.id) {
    return { error: "Penjemputan ini bukan milik unit pengolahan Anda." };
  }

  if (purchase.status !== "scheduled") {
    return { error: "Penjemputan ini sudah ditimbang sebelumnya." };
  }

  const finalAmount = lotValue(purchase.unitPricePerKg, parsed.data.actualKg);
  const weighedAt = new Date();

  try {
    await db.$transaction([
      db.wastePurchase.updateMany({
        where: { id: purchase.id, status: "scheduled" },
        data: {
          status: "weighed",
          actualKg: parsed.data.actualKg,
          finalAmount,
          weighedAt,
        },
      }),
      // purchaseId unik, jadi baris dampak kedua ditolak database.
      db.impactRecord.create({
        data: {
          purchaseId: purchase.id,
          wasteKg: parsed.data.actualKg,
          recordedAt: weighedAt,
        },
      }),
    ]);
  } catch {
    return {
      error: "Penjemputan ini sudah tercatat. Muat ulang halaman untuk melihat data terbaru.",
    };
  }

  revalidateBoth();
  revalidatePath("/dashboard-dampak");

  return { ok: `Berat ${parsed.data.actualKg} kg tercatat. Nilai akhir terkunci.` };
}

/**
 * Pembayaran tunai di lokasi.
 *
 * Pengolah hanya menyatakan sudah menyerahkan uang. Transaksi belum lunas
 * sampai pedagang mengonfirmasi sendiri bahwa uangnya diterima, supaya tidak
 * ada pihak yang bisa menutup transaksi sendirian.
 */
export async function payCashAction(
  _prev: PurchaseState,
  formData: FormData,
): Promise<PurchaseState> {
  let user;

  try {
    user = await requireRole("PROCESSOR", "ADMIN");
  } catch (error) {
    if (error instanceof AuthError) return { error: error.message };
    throw error;
  }

  const purchaseId = String(formData.get("purchaseId") ?? "");

  const purchase = await db.wastePurchase.findUnique({
    where: { id: purchaseId },
    include: { processor: { select: { userId: true } }, payment: true },
  });

  if (!purchase) {
    return { error: "Penjemputan tidak ditemukan." };
  }

  if (user.role !== "ADMIN" && purchase.processor.userId !== user.id) {
    return { error: "Penjemputan ini bukan milik unit pengolahan Anda." };
  }

  if (purchase.status !== "weighed") {
    return {
      error:
        purchase.status === "scheduled"
          ? "Timbang sampahnya dulu sebelum membayar."
          : "Pembayaran untuk penjemputan ini sudah dicatat.",
    };
  }

  // QRIS yang masih menunggu pembayaran tidak boleh ditinggalkan begitu saja,
  // supaya tidak ada kemungkinan terbayar dua kali.
  if (purchase.payment && purchase.payment.status === "PENDING") {
    return {
      error:
        "Masih ada kode QRIS aktif untuk penjemputan ini. Tunggu sampai kedaluwarsa atau selesaikan pembayaran lewat QRIS.",
    };
  }

  const updated = await db.wastePurchase.updateMany({
    where: { id: purchase.id, status: "weighed" },
    data: { status: "awaiting_cash_confirmation", paymentMethod: "cash" },
  });

  if (updated.count === 0) {
    return { error: "Status penjemputan sudah berubah. Muat ulang halaman." };
  }

  revalidateBoth();

  return {
    ok: "Tercatat sebagai pembayaran tunai. Menunggu pedagang mengonfirmasi uangnya diterima.",
  };
}

/** Pedagang mengakui uang tunai sudah diterima. Ini yang melunasi transaksi. */
export async function confirmCashReceivedAction(
  _prev: PurchaseState,
  formData: FormData,
): Promise<PurchaseState> {
  let user;

  try {
    user = await requireRole("TRADER");
  } catch (error) {
    if (error instanceof AuthError) return { error: error.message };
    throw error;
  }

  const purchaseId = String(formData.get("purchaseId") ?? "");

  const purchase = await db.wastePurchase.findUnique({
    where: { id: purchaseId },
    include: { listing: { include: { trader: { select: { userId: true } } } } },
  });

  if (!purchase || purchase.listing.trader.userId !== user.id) {
    return { error: "Transaksi ini tidak ditemukan di daftar Anda." };
  }

  if (purchase.status === "paid") {
    return { ok: "Transaksi ini memang sudah lunas." };
  }

  if (purchase.status !== "awaiting_cash_confirmation") {
    return {
      error: "Belum ada pembayaran tunai yang perlu dikonfirmasi untuk lot ini.",
    };
  }

  await completeWastePurchase(purchase.id);

  revalidateBoth();
  revalidatePath("/pedagang/pencairan");

  return { ok: "Terima kasih. Transaksi ditutup sebagai lunas tunai." };
}

/** Pengolah membatalkan penjemputan yang belum dijalankan. Lot kembali ke bursa. */
export async function cancelPurchaseAction(
  _prev: PurchaseState,
  formData: FormData,
): Promise<PurchaseState> {
  let user;

  try {
    user = await requireRole("PROCESSOR", "ADMIN");
  } catch (error) {
    if (error instanceof AuthError) return { error: error.message };
    throw error;
  }

  const purchaseId = String(formData.get("purchaseId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  const purchase = await db.wastePurchase.findUnique({
    where: { id: purchaseId },
    include: { processor: { select: { userId: true } } },
  });

  if (!purchase) {
    return { error: "Penjemputan tidak ditemukan." };
  }

  if (user.role !== "ADMIN" && purchase.processor.userId !== user.id) {
    return { error: "Penjemputan ini bukan milik unit pengolahan Anda." };
  }

  if (purchase.status !== "scheduled") {
    return {
      error:
        "Sampah sudah ditimbang, jadi penjemputan ini tidak bisa dibatalkan. Selesaikan pembayarannya.",
    };
  }

  await db.$transaction([
    db.wastePurchase.updateMany({
      where: { id: purchase.id, status: "scheduled" },
      data: {
        status: "cancelled",
        cancelledAt: new Date(),
        cancelReason: reason || null,
      },
    }),
    // Lot dikembalikan ke bursa, bukan ikut dibatalkan: pedagangnya tidak
    // melakukan kesalahan apa pun dan sampahnya masih ada.
    db.wasteListing.update({
      where: { id: purchase.listingId },
      data: { status: "open" },
    }),
  ]);

  revalidateBoth();

  return { ok: "Penjemputan dibatalkan. Lot kembali terbuka di bursa." };
}

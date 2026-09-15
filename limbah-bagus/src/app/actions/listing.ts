"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { AuthError, requireRole } from "@/lib/auth";
import {
  isReadyWindow,
  LISTING_MAX_DAYS_AHEAD,
  LISTING_MAX_KG,
} from "@/lib/waste";

export type ListingState = { error?: string; ok?: string };

/**
 * Perhatikan tidak ada field harga di sini.
 *
 * Harga sampah ditetapkan pemerintah daerah dan sama untuk semua pedagang,
 * jadi form hanya mengirim jenis sampahnya. Rupiahnya dibaca server dari
 * tabel WasteTariff. Harga yang dikirim klien tidak pernah dipakai.
 */
const listingSchema = z.object({
  tariffId: z.string().min(1, "Pilih jenis sampah terlebih dahulu"),
  estimatedKg: z.coerce
    .number()
    .int("Perkiraan berat harus berupa angka bulat")
    .min(5, "Perkiraan berat minimal 5 kg agar layak dijemput")
    .max(LISTING_MAX_KG, "Perkiraan berat melebihi batas satu lot"),
  readyDate: z.string().min(1, "Pilih tanggal siap jemput"),
  readyWindow: z.string().refine(isReadyWindow, "Pilih waktu siap jemput"),
  note: z.string().trim().max(300, "Catatan terlalu panjang").optional(),
});

function startOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

/** Pedagang menawarkan satu lot sampah organik ke bursa. */
export async function createListingAction(
  _prev: ListingState,
  formData: FormData,
): Promise<ListingState> {
  let user;

  try {
    user = await requireRole("TRADER");
  } catch (error) {
    if (error instanceof AuthError) return { error: error.message };
    throw error;
  }

  const parsed = listingSchema.safeParse({
    tariffId: formData.get("tariffId"),
    estimatedKg: formData.get("estimatedKg"),
    readyDate: formData.get("readyDate"),
    readyWindow: formData.get("readyWindow"),
    note: formData.get("note") ?? undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data belum lengkap." };
  }

  const readyDate = new Date(`${parsed.data.readyDate}T00:00:00`);

  if (Number.isNaN(readyDate.getTime())) {
    return { error: "Tanggal siap jemput tidak valid." };
  }

  if (readyDate < startOfToday()) {
    return { error: "Tanggal siap jemput tidak boleh di masa lalu." };
  }

  const latest = new Date(startOfToday());
  latest.setDate(latest.getDate() + LISTING_MAX_DAYS_AHEAD);

  if (readyDate > latest) {
    return {
      error: `Sampah organik cepat busuk, jadi tanggal jemput paling jauh ${LISTING_MAX_DAYS_AHEAD} hari dari sekarang.`,
    };
  }

  const [profile, tariff] = await Promise.all([
    db.traderProfile.findUnique({ where: { userId: user.id } }),
    db.wasteTariff.findUnique({ where: { id: parsed.data.tariffId } }),
  ]);

  if (!profile) {
    return { error: "Profil pedagang belum lengkap. Hubungi pengelola." };
  }

  if (!tariff || !tariff.isActive) {
    return { error: "Jenis sampah ini sedang tidak diterima." };
  }

  await db.wasteListing.create({
    data: {
      traderId: profile.id,
      tariffId: tariff.id,
      estimatedKg: parsed.data.estimatedKg,
      readyDate,
      readyWindow: parsed.data.readyWindow,
      note: parsed.data.note?.trim() || null,
    },
  });

  revalidatePath("/pedagang");
  revalidatePath("/pedagang/penjualan");
  revalidatePath("/mitra/bursa");

  return {
    ok: `Lot ${parsed.data.estimatedKg} kg ${tariff.name.toLowerCase()} sudah masuk bursa.`,
  };
}

/** Pedagang menarik lot yang belum diambil pengolah mana pun. */
export async function cancelListingAction(
  _prev: ListingState,
  formData: FormData,
): Promise<ListingState> {
  let user;

  try {
    user = await requireRole("TRADER");
  } catch (error) {
    if (error instanceof AuthError) return { error: error.message };
    throw error;
  }

  const listingId = String(formData.get("listingId") ?? "");

  const listing = await db.wasteListing.findUnique({
    where: { id: listingId },
    include: { trader: { select: { userId: true } } },
  });

  if (!listing || listing.trader.userId !== user.id) {
    return { error: "Lot ini tidak ditemukan di daftar Anda." };
  }

  if (listing.status !== "open") {
    return {
      error:
        "Lot ini sudah diambil pengolah. Hubungi penjemputnya lewat nomor di halaman penjualan kalau perlu dibatalkan.",
    };
  }

  // Filter status di updateMany menutup celah balapan dengan pengolah yang
  // menekan tombol ambil pada detik yang sama.
  const result = await db.wasteListing.updateMany({
    where: { id: listingId, status: "open" },
    data: { status: "cancelled" },
  });

  if (result.count === 0) {
    return { error: "Lot ini baru saja diambil pengolah, jadi tidak bisa ditarik." };
  }

  revalidatePath("/pedagang");
  revalidatePath("/pedagang/penjualan");
  revalidatePath("/mitra/bursa");

  return { ok: "Lot ditarik dari bursa." };
}

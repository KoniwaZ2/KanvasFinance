import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { chargeQris, MidtransConfigError, qrImageUrl } from "@/lib/midtrans";
import { processorTotal } from "@/lib/waste";

const requestSchema = z.object({
  purchaseId: z.string().min(1),
});

/**
 * Menerbitkan QRIS untuk satu pembelian sampah yang sudah ditimbang.
 *
 * Nominal selalu dihitung ulang di server: berat timbangan dikali harga satuan
 * yang terkunci di pembelian, ditambah biaya layanan platform yang ditanggung
 * pengolah. Klien tidak pernah mengirim nominal.
 *
 * Status pembayaran hanya boleh berubah lewat notifikasi Midtrans atau
 * auto-check (lihat src/lib/payment-sync.ts), tidak pernah dari halaman ini.
 */
export async function POST(request: Request) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ message: "Silakan masuk." }, { status: 401 });
  }

  if (user.role !== "PROCESSOR" && user.role !== "ADMIN") {
    return NextResponse.json(
      { message: "Hanya pengolah yang membayar penjemputan." },
      { status: 403 },
    );
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Permintaan tidak valid" },
      { status: 400 },
    );
  }

  const purchase = await db.wastePurchase.findUnique({
    where: { id: parsed.data.purchaseId },
    include: {
      payment: true,
      processor: { select: { userId: true, unitName: true } },
      listing: {
        include: { trader: { include: { user: true } }, tariff: true },
      },
    },
  });

  if (!purchase) {
    return NextResponse.json(
      { message: "Penjemputan tidak ditemukan" },
      { status: 404 },
    );
  }

  if (user.role !== "ADMIN" && purchase.processor.userId !== user.id) {
    return NextResponse.json({ message: "Tidak diizinkan" }, { status: 403 });
  }

  if (purchase.status === "paid") {
    return NextResponse.json(
      { message: "Penjemputan ini sudah lunas." },
      { status: 409 },
    );
  }

  if (purchase.status === "awaiting_cash_confirmation") {
    return NextResponse.json(
      {
        message:
          "Penjemputan ini sudah ditandai dibayar tunai dan sedang menunggu konfirmasi pedagang.",
      },
      { status: 409 },
    );
  }

  if (purchase.status !== "weighed" || purchase.finalAmount === null) {
    return NextResponse.json(
      { message: "Timbang sampahnya dulu supaya nominalnya pasti." },
      { status: 409 },
    );
  }

  const trader = purchase.listing.trader;

  // Uang QRIS singgah di akun platform sebelum diteruskan. Tanpa rekening
  // tujuan, dana itu tidak punya jalan pulang ke pedagang.
  if (
    !trader.payoutBankName ||
    !trader.payoutAccountNumber ||
    !trader.payoutAccountName
  ) {
    return NextResponse.json(
      {
        message:
          "Pedagang belum mengisi rekening pencairan, jadi pembayaran QRIS belum bisa dipakai. Bayar tunai untuk penjemputan ini.",
      },
      { status: 409 },
    );
  }

  const grossAmount = processorTotal(purchase.finalAmount, purchase.platformFee);

  // Kode QRIS yang masih berlaku dipakai ulang, tidak diterbitkan ganda.
  const existing = purchase.payment;
  if (
    existing &&
    existing.status === "PENDING" &&
    existing.qrisUrl &&
    existing.grossAmount === grossAmount &&
    (!existing.expiryAt || existing.expiryAt > new Date())
  ) {
    return NextResponse.json({
      midtransOrderId: existing.midtransOrderId,
      qrisUrl: existing.qrisUrl,
      amount: existing.grossAmount,
      wasteAmount: purchase.finalAmount,
      platformFee: purchase.platformFee,
      expiryAt: existing.expiryAt,
      reused: true,
    });
  }

  // Waktu ikut masuk ke order_id supaya kode yang kedaluwarsa bisa digantikan
  // kode baru. Midtrans menolak order_id yang sudah pernah dipakai.
  const midtransOrderId = `WST-${purchase.id.slice(-10).toUpperCase()}-${Date.now()
    .toString()
    .slice(-5)}`;

  try {
    const charge = await chargeQris({
      orderId: midtransOrderId,
      amount: grossAmount,
      customer: {
        first_name: purchase.processor.unitName,
        email: trader.user.email,
        phone: trader.user.phone ?? undefined,
      },
    });

    const payment = await db.payment.create({
      data: {
        midtransOrderId,
        purpose: "WASTE_PURCHASE",
        status: "PENDING",
        grossAmount,
        method: charge.payment_type,
        qrisUrl: qrImageUrl(charge),
        qrString: charge.qr_string ?? null,
        expiryAt: charge.expiry_time
          ? new Date(charge.expiry_time.replace(" ", "T"))
          : null,
      },
    });

    await db.wastePurchase.update({
      where: { id: purchase.id },
      data: { paymentId: payment.id, paymentMethod: "qris" },
    });

    return NextResponse.json({
      midtransOrderId,
      qrisUrl: payment.qrisUrl,
      amount: payment.grossAmount,
      wasteAmount: purchase.finalAmount,
      platformFee: purchase.platformFee,
      expiryAt: payment.expiryAt,
    });
  } catch (error) {
    if (error instanceof MidtransConfigError) {
      return NextResponse.json({ message: error.message }, { status: 503 });
    }

    console.error("[waste] Gagal menerbitkan QRIS:", error);
    return NextResponse.json(
      {
        message:
          "Kode QRIS belum bisa dibuat. Coba lagi, atau selesaikan dengan pembayaran tunai.",
      },
      { status: 502 },
    );
  }
}

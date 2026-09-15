import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { chargeQris, MidtransConfigError, qrImageUrl } from "@/lib/midtrans";
import { CATALOG_QRIS_EXPIRY_MINUTES } from "@/lib/waste";

const requestSchema = z.object({
  orderId: z.string().min(1),
});

/**
 * Menerbitkan ulang kode QRIS untuk satu pesanan katalog.
 *
 * Kode pertama sudah dibuat bersamaan dengan pesanannya di POST /api/orders.
 * Endpoint ini dipakai kalau kode itu kedaluwarsa sebelum sempat dibayar,
 * supaya pembeli tidak perlu menyusun ulang keranjangnya dari awal.
 *
 * Nominal dibaca ulang dari pesanan di database, tidak pernah dari klien.
 */
export async function POST(request: Request) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ message: "Silakan masuk." }, { status: 401 });
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Permintaan tidak valid" },
      { status: 400 },
    );
  }

  const order = await db.order.findUnique({
    where: { id: parsed.data.orderId },
    include: {
      payment: true,
      items: { include: { product: { select: { id: true, name: true } } } },
    },
  });

  if (!order) {
    return NextResponse.json(
      { message: "Pesanan tidak ditemukan" },
      { status: 404 },
    );
  }

  if (order.buyerId !== user.id && user.role !== "ADMIN") {
    return NextResponse.json({ message: "Tidak diizinkan" }, { status: 403 });
  }

  if (order.status === "paid" || order.status === "fulfilled") {
    return NextResponse.json(
      { message: "Pesanan ini sudah lunas." },
      { status: 409 },
    );
  }

  if (order.status === "cancelled") {
    return NextResponse.json(
      {
        message:
          "Pesanan ini sudah dibatalkan. Silakan buat pesanan baru dari katalog.",
      },
      { status: 409 },
    );
  }

  // Kode yang masih berlaku dipakai ulang, tidak diterbitkan ganda.
  const existing = order.payment;
  if (
    existing &&
    existing.status === "PENDING" &&
    existing.qrisUrl &&
    existing.grossAmount === order.totalAmount &&
    (!existing.expiryAt || existing.expiryAt > new Date())
  ) {
    return NextResponse.json({
      midtransOrderId: existing.midtransOrderId,
      qrisUrl: existing.qrisUrl,
      amount: existing.grossAmount,
      expiryAt: existing.expiryAt,
      reused: true,
    });
  }

  // Waktu ikut masuk ke order_id karena Midtrans menolak order_id yang sudah
  // pernah dipakai, termasuk oleh kode yang sudah kedaluwarsa.
  const midtransOrderId = `ORD-${order.id.slice(-10).toUpperCase()}-${Date.now()
    .toString()
    .slice(-5)}`;

  try {
    const charge = await chargeQris({
      orderId: midtransOrderId,
      amount: order.totalAmount,
      customer: {
        first_name: order.recipientName,
        email: user.email,
        phone: order.recipientPhone,
      },
      items: order.items.map((item) => ({
        id: item.productId,
        price: item.unitPrice,
        quantity: item.quantityKg,
        name: item.product.name,
      })),
      expiryMinutes: CATALOG_QRIS_EXPIRY_MINUTES,
    });

    const payment = await db.payment.create({
      data: {
        midtransOrderId,
        purpose: "ORDER",
        status: "PENDING",
        grossAmount: order.totalAmount,
        method: charge.payment_type,
        qrisUrl: qrImageUrl(charge),
        qrString: charge.qr_string ?? null,
        expiryAt: charge.expiry_time
          ? new Date(charge.expiry_time.replace(" ", "T"))
          : null,
      },
    });

    await db.order.update({
      where: { id: order.id },
      data: { paymentId: payment.id },
    });

    return NextResponse.json({
      midtransOrderId,
      qrisUrl: payment.qrisUrl,
      amount: payment.grossAmount,
      expiryAt: payment.expiryAt,
    });
  } catch (error) {
    if (error instanceof MidtransConfigError) {
      return NextResponse.json({ message: error.message }, { status: 503 });
    }

    console.error("[orders] Gagal menerbitkan ulang QRIS:", error);
    return NextResponse.json(
      { message: "Kode QRIS belum bisa dibuat. Coba lagi sebentar lagi." },
      { status: 502 },
    );
  }
}

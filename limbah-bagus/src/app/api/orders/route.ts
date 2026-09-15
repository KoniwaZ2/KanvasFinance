import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { chargeQris, MidtransConfigError, qrImageUrl } from "@/lib/midtrans";
import { CATALOG_QRIS_EXPIRY_MINUTES } from "@/lib/waste";

const orderSchema = z.object({
  recipientName: z.string().trim().min(2, "Nama penerima terlalu pendek"),
  recipientPhone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s]{8,20}$/, "Nomor telepon tidak valid"),
  deliveryAddress: z.string().trim().min(10, "Alamat pengiriman terlalu pendek"),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantityKg: z.number().int().positive().max(5000),
      }),
    )
    .min(1, "Keranjang masih kosong"),
});

/**
 * Membuat pesanan lalu menerbitkan kode QRIS untuk membayarnya.
 *
 * QRIS adalah satu-satunya metode pembayaran di aplikasi ini, jadi tidak ada
 * langkah pemilihan metode: kode QR-nya langsung tampil di halaman pesanan.
 *
 * Pesanan selalu dibuat dengan status awaiting_payment dan pembayaran PENDING.
 * Stok baru dikurangi setelah Midtrans mengonfirmasi pembayaran
 * (lihat applySettlementEffects di src/lib/payment-sync.ts).
 */
export async function POST(request: Request) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json(
      { message: "Silakan masuk terlebih dahulu untuk memesan." },
      { status: 401 },
    );
  }

  // Katalog hanya untuk pembeli. Menyembunyikan keranjang dari peran lain di
  // tampilan tidak cukup, permintaan langsung ke endpoint ini juga ditolak.
  if (user.role !== "BUYER") {
    return NextResponse.json(
      {
        message:
          "Akun pedagang dan mitra pengolah tidak bisa berbelanja di katalog. Gunakan akun pembeli untuk memesan pakan atau pupuk.",
      },
      { status: 403 },
    );
  }

  const parsed = orderSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Data pesanan tidak valid" },
      { status: 400 },
    );
  }

  const { items, recipientName, recipientPhone, deliveryAddress } = parsed.data;

  const products = await db.product.findMany({
    where: { id: { in: items.map((item) => item.productId) }, isActive: true },
  });

  if (products.length !== items.length) {
    return NextResponse.json(
      { message: "Ada produk yang sudah tidak tersedia. Muat ulang katalog." },
      { status: 409 },
    );
  }

  // Harga selalu diambil dari database, tidak pernah dari kiriman klien.
  const lines = items.map((item) => {
    const product = products.find((candidate) => candidate.id === item.productId)!;
    return { product, quantityKg: item.quantityKg };
  });

  const insufficient = lines.find(
    (line) => line.quantityKg > line.product.stockKg,
  );

  if (insufficient) {
    return NextResponse.json(
      {
        message: `Stok ${insufficient.product.name} tinggal ${insufficient.product.stockKg} kg.`,
      },
      { status: 409 },
    );
  }

  const totalAmount = lines.reduce(
    (sum, line) => sum + line.product.pricePerKg * line.quantityKg,
    0,
  );

  const order = await db.order.create({
    data: {
      buyerId: user.id,
      status: "awaiting_payment",
      totalAmount,
      recipientName,
      recipientPhone,
      deliveryAddress,
      items: {
        create: lines.map((line) => ({
          productId: line.product.id,
          quantityKg: line.quantityKg,
          unitPrice: line.product.pricePerKg,
        })),
      },
    },
  });

  const midtransOrderId = `ORD-${order.id.slice(-10).toUpperCase()}`;

  try {
    const charge = await chargeQris({
      orderId: midtransOrderId,
      amount: totalAmount,
      customer: {
        first_name: recipientName,
        email: user.email,
        phone: recipientPhone,
      },
      items: lines.map((line) => ({
        id: line.product.id,
        price: line.product.pricePerKg,
        quantity: line.quantityKg,
        name: line.product.name,
      })),
      expiryMinutes: CATALOG_QRIS_EXPIRY_MINUTES,
    });

    const payment = await db.payment.create({
      data: {
        midtransOrderId,
        purpose: "ORDER",
        status: "PENDING",
        grossAmount: totalAmount,
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
      orderId: order.id,
      midtransOrderId,
      qrisUrl: payment.qrisUrl,
      amount: totalAmount,
      expiryAt: payment.expiryAt,
    });
  } catch (error) {
    // Pesanan yang gagal disiapkan pembayarannya langsung dibatalkan
    // supaya tidak menggantung di daftar pesanan pembeli.
    await db.order.update({
      where: { id: order.id },
      data: { status: "cancelled" },
    });

    if (error instanceof MidtransConfigError) {
      return NextResponse.json({ message: error.message }, { status: 503 });
    }

    console.error("[orders] Gagal menerbitkan QRIS:", error);
    return NextResponse.json(
      {
        message:
          "Kode pembayaran belum bisa dibuat. Coba lagi beberapa saat atau hubungi kami.",
      },
      { status: 502 },
    );
  }
}

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { checkAndSyncPayment } from "@/lib/payment-sync";
import { isMidtransConfigured } from "@/lib/midtrans";

/**
 * Auto-check status satu transaksi.
 *
 * Halaman status memanggil endpoint ini secara berkala. Endpoint menanyakan
 * status langsung ke Midtrans lalu menyinkronkan database, jadi pembayaran
 * tetap terkonfirmasi walau notifikasi webhook tidak sampai (misalnya tunnel
 * ngrok sedang mati). Klien tetap tidak bisa menentukan status sendiri.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params;

  const payment = await db.payment.findUnique({
    where: { midtransOrderId: orderId },
    include: {
      order: { select: { id: true, buyerId: true, status: true } },
      purchase: {
        select: {
          id: true,
          status: true,
          processor: { select: { userId: true } },
          listing: { select: { trader: { select: { userId: true } } } },
        },
      },
    },
  });

  if (!payment) {
    return NextResponse.json(
      { message: "Transaksi tidak ditemukan" },
      { status: 404 },
    );
  }

  // Hanya pihak yang terlibat dalam transaksi yang boleh memeriksa statusnya.
  // Untuk pembelian sampah itu dua orang sekaligus: pengolah yang membayar
  // dan pedagang yang menunggu uangnya masuk.
  const user = await getSessionUser();
  const owners = [
    payment.order?.buyerId,
    payment.purchase?.processor.userId,
    payment.purchase?.listing.trader.userId,
  ].filter((id): id is string => Boolean(id));

  if (!user || (user.role !== "ADMIN" && !owners.includes(user.id))) {
    return NextResponse.json({ message: "Tidak diizinkan" }, { status: 403 });
  }

  // Status final tidak perlu ditanyakan ulang ke Midtrans.
  const isFinal = payment.status !== "PENDING";

  if (isFinal || !isMidtransConfigured()) {
    return NextResponse.json({
      orderId,
      status: payment.status,
      orderStatus: payment.order?.status ?? payment.purchase?.status ?? null,
      checked: false,
      lastCheckedAt: payment.lastCheckedAt,
    });
  }

  try {
    const result = await checkAndSyncPayment(orderId);

    return NextResponse.json({
      orderId,
      status: result.currentStatus,
      changed: result.changed,
      checked: true,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`[auto-check] Gagal memeriksa ${orderId}:`, error);
    // Kegagalan pengecekan tidak boleh mengubah status apa pun.
    return NextResponse.json(
      {
        orderId,
        status: payment.status,
        checked: false,
        message: "Status belum bisa diperiksa ke Midtrans saat ini.",
      },
      { status: 200 },
    );
  }
}

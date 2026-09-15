import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reconcilePendingPayments } from "@/lib/payment-sync";
import { isMidtransConfigured } from "@/lib/midtrans";

/**
 * Perapian berkala: menanyakan ulang pembayaran yang masih PENDING ke Midtrans
 * lalu menyinkronkan status yang berubah, sekaligus menutup lot sampah yang
 * tanggal siap jemputnya sudah lewat tanpa ada yang mengambil.
 *
 * Ini jaring pengaman kalau notifikasi webhook hilang. Jalankan berkala,
 * misalnya tiap 5 menit:
 *   curl -H "x-cron-secret: <CRON_SECRET>" http://localhost:3000/api/cron/reconcile
 */

/**
 * Sampah organik tidak bisa menunggu. Lot yang lewat tanggal siap jemput
 * ditutup supaya bursa tidak dipenuhi tawaran yang sampahnya sudah busuk atau
 * sudah dibuang. Pedagang bisa memasang lot baru kapan saja.
 */
async function expireStaleListings(): Promise<number> {
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);

  const result = await db.wasteListing.updateMany({
    where: { status: "open", readyDate: { lt: cutoff } },
    data: { status: "expired" },
  });

  return result.count;
}
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const provided =
    request.headers.get("x-cron-secret") ??
    new URL(request.url).searchParams.get("secret");

  if (!secret || provided !== secret) {
    return NextResponse.json({ message: "Tidak diizinkan" }, { status: 401 });
  }

  // Penutupan lot basi tidak bergantung pada Midtrans, jadi tetap dijalankan
  // walau kredensial pembayaran belum diisi.
  const expiredListings = await expireStaleListings();

  if (!isMidtransConfigured()) {
    return NextResponse.json(
      {
        message: "MIDTRANS_SERVER_KEY belum diisi, rekonsiliasi dilewati.",
        expiredListings,
      },
      { status: 503 },
    );
  }

  const results = await reconcilePendingPayments();
  const changed = results.filter((result) => result.changed);

  return NextResponse.json({
    checked: results.length,
    changed: changed.length,
    expiredListings,
    details: changed.map((result) => ({
      orderId: result.midtransOrderId,
      from: result.previousStatus,
      to: result.currentStatus,
    })),
    ranAt: new Date().toISOString(),
  });
}

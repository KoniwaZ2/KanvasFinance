import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Menandai pencairan yang sudah jatuh tempo sebagai cair.
 *
 * BATASAN MVP: disbursement sungguhan (Midtrans Iris) belum diintegrasikan.
 * Endpoint ini tidak memindahkan uang. Ia hanya menutup catatan pencairan
 * yang jadwalnya sudah lewat, dengan asumsi transfernya dikerjakan manual
 * oleh pengelola. Jangan tulis salinan produk yang mengklaim transfer
 * otomatis sudah berjalan.
 *
 * Jalankan sekali sehari:
 *   curl -H "x-cron-secret: <CRON_SECRET>" http://localhost:3000/api/cron/settle-payouts
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const provided =
    request.headers.get("x-cron-secret") ??
    new URL(request.url).searchParams.get("secret");

  if (!secret || provided !== secret) {
    return NextResponse.json({ message: "Tidak diizinkan" }, { status: 401 });
  }

  const now = new Date();

  const due = await db.payout.findMany({
    where: { status: "pending", scheduledAt: { lte: now } },
    select: { id: true, amount: true, traderId: true },
    take: 100,
  });

  if (due.length === 0) {
    return NextResponse.json({
      settled: 0,
      message: "Tidak ada pencairan yang jatuh tempo.",
      ranAt: now.toISOString(),
    });
  }

  // Filter status ikut diulang di updateMany supaya dua panggilan cron yang
  // bertabrakan tidak menutup pencairan yang sama dua kali.
  const result = await db.payout.updateMany({
    where: { id: { in: due.map((payout) => payout.id) }, status: "pending" },
    data: {
      status: "settled",
      settledAt: now,
      reference: `MANUAL-${now.toISOString().slice(0, 10)}`,
    },
  });

  return NextResponse.json({
    settled: result.count,
    totalAmount: due.reduce((sum, payout) => sum + payout.amount, 0),
    note: "Transfer dikerjakan manual oleh pengelola, endpoint ini hanya menutup catatannya.",
    ranAt: now.toISOString(),
  });
}

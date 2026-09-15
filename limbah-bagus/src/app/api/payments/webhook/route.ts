import { NextResponse } from "next/server";
import { applyMidtransStatus } from "@/lib/payment-sync";
import { verifyNotificationSignature } from "@/lib/midtrans";

/**
 * Endpoint notifikasi Midtrans.
 * Daftarkan URL ini di dashboard Midtrans:
 *   Settings -> Configuration -> Payment Notification URL
 *   https://eastbound-alienate-pretzel.ngrok-free.dev/api/payments/webhook
 *
 * Hanya notifikasi dengan signature yang benar yang boleh mengubah status.
 * Status pembayaran di database tidak pernah diubah dari sisi klien.
 */
export async function POST(request: Request) {
  let notification: Record<string, unknown>;

  try {
    notification = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Body notifikasi bukan JSON yang valid" },
      { status: 400 },
    );
  }

  const orderId = notification.order_id as string | undefined;

  if (!orderId) {
    return NextResponse.json(
      { message: "order_id tidak ada di notifikasi" },
      { status: 400 },
    );
  }

  if (
    !verifyNotificationSignature(
      notification as {
        order_id?: string;
        status_code?: string;
        gross_amount?: string;
        signature_key?: string;
      },
    )
  ) {
    console.warn(`[webhook] Signature tidak valid untuk order ${orderId}`);
    return NextResponse.json(
      { message: "Signature tidak valid" },
      { status: 403 },
    );
  }

  try {
    const result = await applyMidtransStatus(orderId, notification, "webhook");

    if (result.notFound) {
      // Midtrans tetap dibalas 200 supaya tidak retry selamanya untuk
      // order_id yang memang bukan milik aplikasi ini.
      console.warn(`[webhook] Pembayaran ${orderId} tidak ditemukan`);
      return NextResponse.json({ message: "Pembayaran tidak dikenal" });
    }

    console.log(
      `[webhook] ${orderId}: ${result.previousStatus} -> ${result.currentStatus}` +
        (result.changed ? "" : " (tidak ada perubahan)"),
    );

    return NextResponse.json({
      message: "Notifikasi diterima",
      orderId,
      status: result.currentStatus,
      changed: result.changed,
    });
  } catch (error) {
    console.error(`[webhook] Gagal memproses ${orderId}:`, error);
    // Balas 500 agar Midtrans mencoba kirim ulang notifikasi ini.
    return NextResponse.json(
      { message: "Gagal memproses notifikasi" },
      { status: 500 },
    );
  }
}

/** Penanda supaya URL notifikasi mudah dicek dari browser. */
export async function GET() {
  return NextResponse.json({
    service: "LimbahBagus Midtrans webhook",
    method: "POST",
    status: "aktif",
  });
}

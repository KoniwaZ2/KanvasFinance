import { db } from "@/lib/db";
import { completeWastePurchase } from "@/lib/waste-purchase";
import {
  getTransactionStatus,
  mapMidtransStatus,
  type PaymentStatus,
} from "@/lib/midtrans";

/**
 * Satu-satunya tempat status pembayaran boleh berubah.
 *
 * Aturan yang dijaga di sini:
 *  1. Status hanya naik ke SETTLEMENT kalau Midtrans yang bilang begitu,
 *     lewat notifikasi webhook atau lewat pengecekan langsung ke API Midtrans.
 *     Klien tidak pernah boleh menentukan status.
 *  2. Idempoten. Notifikasi yang sama dikirim ulang berkali-kali oleh Midtrans
 *     tidak boleh menggandakan efek samping seperti pengurangan stok.
 */

export type SyncSource = "webhook" | "auto-check";

export type SyncResult = {
  midtransOrderId: string;
  previousStatus: PaymentStatus | null;
  currentStatus: PaymentStatus | null;
  changed: boolean;
  notFound?: boolean;
};

type MidtransPayload = {
  transaction_status?: string;
  fraud_status?: string;
  payment_type?: string;
  settlement_time?: string;
  expiry_time?: string;
  [key: string]: unknown;
};

export async function applyMidtransStatus(
  midtransOrderId: string,
  payload: MidtransPayload,
  source: SyncSource,
): Promise<SyncResult> {
  const payment = await db.payment.findUnique({
    where: { midtransOrderId },
    include: { order: { include: { items: true } }, purchase: true },
  });

  if (!payment) {
    return {
      midtransOrderId,
      previousStatus: null,
      currentStatus: null,
      changed: false,
      notFound: true,
    };
  }

  const previousStatus = payment.status as PaymentStatus;
  const nextStatus = mapMidtransStatus(
    payload.transaction_status,
    payload.fraud_status,
  );

  // Selalu catat jejak audit dan waktu pengecekan terakhir, walau status tidak berubah.
  await db.payment.update({
    where: { id: payment.id },
    data: {
      status: nextStatus,
      method: payload.payment_type ?? payment.method,
      expiryAt: payload.expiry_time
        ? new Date(payload.expiry_time.replace(" ", "T"))
        : payment.expiryAt,
      paidAt:
        nextStatus === "SETTLEMENT"
          ? (payment.paidAt ??
            (payload.settlement_time
              ? new Date(payload.settlement_time.replace(" ", "T"))
              : new Date()))
          : payment.paidAt,
      rawNotification: JSON.stringify({ source, receivedAt: new Date(), payload }),
      lastCheckedAt: new Date(),
    },
  });

  if (nextStatus === previousStatus) {
    return {
      midtransOrderId,
      previousStatus,
      currentStatus: nextStatus,
      changed: false,
    };
  }

  // Efek samping hanya dijalankan pada transisi status yang benar-benar baru.
  if (nextStatus === "SETTLEMENT" && previousStatus !== "SETTLEMENT") {
    await applySettlementEffects(payment.id);
  }

  if (["EXPIRE", "CANCEL", "DENY"].includes(nextStatus)) {
    await applyFailureEffects(payment.id, nextStatus);
  }

  return {
    midtransOrderId,
    previousStatus,
    currentStatus: nextStatus,
    changed: true,
  };
}

/** Pembayaran terkonfirmasi: tandai pesanan lunas atau lunasi pembelian sampah. */
async function applySettlementEffects(paymentId: string) {
  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    include: {
      order: { include: { items: true } },
      purchase: { include: { listing: true } },
    },
  });

  if (!payment) return;

  if (payment.order && payment.order.status === "awaiting_payment") {
    await db.$transaction([
      db.order.update({
        where: { id: payment.order.id },
        data: { status: "paid" },
      }),
      // Stok baru dikurangi setelah pembayaran benar-benar terkonfirmasi.
      ...payment.order.items.map((item) =>
        db.product.update({
          where: { id: item.productId },
          data: { stockKg: { decrement: item.quantityKg } },
        }),
      ),
    ]);
  }

  if (payment.purchase && payment.purchase.status !== "paid") {
    await completeWastePurchase(payment.purchase.id);
  }
}

/**
 * Pembayaran gagal atau kedaluwarsa.
 *
 * Pesanan katalog dibatalkan supaya tidak menggantung dan stok tidak tersangkut.
 * Pembelian sampah sebaliknya TIDAK dibatalkan: sampahnya sudah diangkut dan
 * sudah ditimbang, jadi utangnya tetap ada. Transaksi kembali ke status
 * weighed supaya pengolah bisa menerbitkan QRIS baru atau membayar tunai.
 */
async function applyFailureEffects(paymentId: string, status: PaymentStatus) {
  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    include: { order: true, purchase: true },
  });

  if (!payment) return;

  if (payment.order && payment.order.status === "awaiting_payment") {
    await db.order.update({
      where: { id: payment.order.id },
      data: { status: "cancelled" },
    });
  }

  if (payment.purchase && payment.purchase.status !== "paid") {
    await db.wastePurchase.update({
      where: { id: payment.purchase.id },
      data: { status: "weighed", paymentMethod: null, paymentId: null },
    });

    console.warn(
      `[waste] QRIS ${payment.midtransOrderId} berakhir ${status}, pembelian ${payment.purchase.id} menunggu pembayaran ulang.`,
    );
  }
}

/**
 * Auto-check satu transaksi ke Midtrans lalu sinkronkan hasilnya.
 * Dipakai oleh polling halaman status dan oleh cron rekonsiliasi.
 */
export async function checkAndSyncPayment(
  midtransOrderId: string,
): Promise<SyncResult> {
  const status = await getTransactionStatus(midtransOrderId);

  // 404 dari Midtrans berarti transaksi belum terbentuk di sisi mereka.
  if (status.status_code === "404") {
    await db.payment.updateMany({
      where: { midtransOrderId },
      data: { lastCheckedAt: new Date() },
    });

    const existing = await db.payment.findUnique({ where: { midtransOrderId } });
    return {
      midtransOrderId,
      previousStatus: (existing?.status as PaymentStatus) ?? null,
      currentStatus: (existing?.status as PaymentStatus) ?? null,
      changed: false,
    };
  }

  return applyMidtransStatus(midtransOrderId, status, "auto-check");
}

/** Rekonsiliasi massal semua pembayaran yang masih menggantung. */
export async function reconcilePendingPayments(maxAgeHours = 48) {
  const since = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);

  const pending = await db.payment.findMany({
    where: { status: "PENDING", createdAt: { gte: since } },
    select: { midtransOrderId: true },
    orderBy: { createdAt: "asc" },
    take: 50,
  });

  const results: SyncResult[] = [];

  for (const payment of pending) {
    try {
      results.push(await checkAndSyncPayment(payment.midtransOrderId));
    } catch (error) {
      console.error(
        `Rekonsiliasi gagal untuk ${payment.midtransOrderId}:`,
        error,
      );
    }
  }

  return results;
}

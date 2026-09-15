import crypto from "node:crypto";

/**
 * Klien Midtrans tipis di atas REST API resmi.
 * Dipakai hanya di server. Server key tidak pernah dikirim ke klien.
 *
 * Satu metode pembayaran untuk seluruh aplikasi: QRIS lewat Core API charge.
 * Dipakai dua alur, dengan masa berlaku berbeda (lihat docs/BACKEND.md):
 *  - pembayaran sampah di lokasi penjemputan, berlaku singkat
 *  - checkout e-katalog, berlaku sehari
 *
 * Snap sengaja tidak dipakai. Kode QR ditampilkan langsung di halaman kita
 * sendiri, jadi pembeli tidak perlu berpindah ke antarmuka pihak lain dan
 * tidak perlu memilih metode pembayaran.
 */

const IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === "true";

const CORE_BASE = IS_PRODUCTION
  ? "https://api.midtrans.com"
  : "https://api.sandbox.midtrans.com";

export class MidtransConfigError extends Error {}
export class MidtransApiError extends Error {
  constructor(
    message: string,
    readonly statusCode?: string,
  ) {
    super(message);
  }
}

function serverKey(): string {
  const key = process.env.MIDTRANS_SERVER_KEY;
  if (!key) {
    throw new MidtransConfigError(
      "MIDTRANS_SERVER_KEY belum diisi di .env.local. Ambil server key sandbox dari dashboard Midtrans.",
    );
  }
  return key;
}

function authHeader(): string {
  return `Basic ${Buffer.from(`${serverKey()}:`).toString("base64")}`;
}

async function midtransFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: authHeader(),
      ...init?.headers,
    },
    cache: "no-store",
  });

  const payload = (await response.json()) as Record<string, unknown>;

  // Midtrans membalas 200/201 untuk sukses, 404 untuk transaksi yang belum ada.
  if (!response.ok && response.status !== 404) {
    const message =
      (payload.status_message as string) ??
      (Array.isArray(payload.error_messages)
        ? (payload.error_messages as string[]).join(", ")
        : `Permintaan ke Midtrans gagal dengan status ${response.status}`);
    throw new MidtransApiError(message, payload.status_code as string);
  }

  return payload as T;
}

export type MidtransCustomer = {
  first_name: string;
  email: string;
  phone?: string;
};

export type ChargeQrisResult = {
  status_code: string;
  transaction_id: string;
  order_id: string;
  gross_amount: string;
  payment_type: string;
  transaction_status: string;
  expiry_time?: string;
  qr_string?: string;
  actions?: { name: string; method: string; url: string }[];
};

/**
 * Menerbitkan kode QRIS lewat Core API.
 *
 * Masa berlaku ditentukan pemanggil karena dua alurnya berbeda sifat. Di
 * lokasi penjemputan kodenya berumur pendek: kalau pemindaian gagal, lebih
 * baik menerbitkan kode baru daripada meninggalkan tagihan menggantung setelah
 * mobilnya pergi. Di katalog pembeli butuh waktu lebih longgar.
 */
export async function chargeQris(params: {
  orderId: string;
  amount: number;
  customer: MidtransCustomer;
  items?: { id: string; price: number; quantity: number; name: string }[];
  expiryMinutes?: number;
}): Promise<ChargeQrisResult> {
  return midtransFetch<ChargeQrisResult>(`${CORE_BASE}/v2/charge`, {
    method: "POST",
    body: JSON.stringify({
      payment_type: "qris",
      transaction_details: {
        order_id: params.orderId,
        gross_amount: params.amount,
      },
      qris: { acquirer: "gopay" },
      item_details: params.items?.map((item) => ({
        ...item,
        // Midtrans membatasi nama item 50 karakter.
        name: item.name.slice(0, 50),
      })),
      customer_details: params.customer,
      custom_expiry: {
        expiry_duration: params.expiryMinutes ?? 30,
        unit: "minute",
      },
    }),
  });
}

/** URL gambar QR dari daftar actions Midtrans. */
export function qrImageUrl(charge: ChargeQrisResult): string | null {
  return (
    charge.actions?.find((action) => action.name === "generate-qr-code")?.url ??
    null
  );
}

export type TransactionStatusResult = {
  status_code: string;
  transaction_status?: string;
  fraud_status?: string;
  payment_type?: string;
  order_id?: string;
  gross_amount?: string;
  settlement_time?: string;
  transaction_time?: string;
  expiry_time?: string;
  va_numbers?: { bank: string; va_number: string }[];
  status_message?: string;
};

/**
 * Auto-check transaksi: tanya status langsung ke Midtrans.
 * Dipakai sebagai jaring pengaman kalau webhook tidak sampai
 * (misalnya tunnel ngrok sempat mati).
 */
export async function getTransactionStatus(
  midtransOrderId: string,
): Promise<TransactionStatusResult> {
  return midtransFetch<TransactionStatusResult>(
    `${CORE_BASE}/v2/${encodeURIComponent(midtransOrderId)}/status`,
  );
}

/**
 * Verifikasi signature notifikasi Midtrans.
 * SHA512(order_id + status_code + gross_amount + server_key).
 * Tanpa ini, siapa pun bisa memalsukan konfirmasi pembayaran.
 */
export function verifyNotificationSignature(notification: {
  order_id?: string;
  status_code?: string;
  gross_amount?: string;
  signature_key?: string;
}): boolean {
  const { order_id, status_code, gross_amount, signature_key } = notification;
  if (!order_id || !status_code || !gross_amount || !signature_key) {
    return false;
  }

  // Tanpa server key, tidak ada notifikasi yang bisa dipercaya. Ditolak, bukan
  // dilempar sebagai error, supaya webhook membalas 403 dan bukan 500.
  const key = process.env.MIDTRANS_SERVER_KEY;
  if (!key) {
    console.error(
      "[midtrans] MIDTRANS_SERVER_KEY kosong, semua notifikasi ditolak.",
    );
    return false;
  }

  const expected = crypto
    .createHash("sha512")
    .update(`${order_id}${status_code}${gross_amount}${key}`)
    .digest("hex");

  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(signature_key, "utf8");

  if (expectedBuffer.length !== receivedBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

export type PaymentStatus =
  | "PENDING"
  | "SETTLEMENT"
  | "EXPIRE"
  | "CANCEL"
  | "DENY"
  | "REFUND";

/** Pemetaan status Midtrans ke status internal, sesuai tabel di docs/BACKEND.md. */
export function mapMidtransStatus(
  transactionStatus: string | undefined,
  fraudStatus?: string,
): PaymentStatus {
  switch (transactionStatus) {
    case "capture":
      return fraudStatus === "challenge" ? "PENDING" : "SETTLEMENT";
    case "settlement":
      return "SETTLEMENT";
    case "pending":
      return "PENDING";
    case "deny":
      return "DENY";
    case "cancel":
      return "CANCEL";
    case "expire":
      return "EXPIRE";
    case "refund":
    case "partial_refund":
      return "REFUND";
    default:
      return "PENDING";
  }
}

export function isMidtransConfigured(): boolean {
  return Boolean(process.env.MIDTRANS_SERVER_KEY);
}

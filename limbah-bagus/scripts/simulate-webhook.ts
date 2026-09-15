/**
 * Menguji endpoint webhook secara lokal tanpa harus benar-benar membayar.
 *
 * Skrip ini menyusun notifikasi bergaya Midtrans lengkap dengan signature
 * yang sah (dihitung dari MIDTRANS_SERVER_KEY milik kamu sendiri), lalu
 * mengirimkannya ke endpoint webhook aplikasi. Gunanya untuk memastikan
 * alur "status hanya berubah setelah notifikasi" benar-benar bekerja.
 *
 * Pakai:
 *   npx tsx scripts/simulate-webhook.ts <midtransOrderId> [settlement|pending|expire|deny|cancel]
 *
 * Contoh:
 *   npx tsx scripts/simulate-webhook.ts ORD-SEED-000003 settlement
 */

import crypto from "node:crypto";

for (const file of [".env", ".env.local"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    // opsional
  }
}

const [, , orderId, statusArg = "settlement"] = process.argv;

if (!orderId) {
  console.error(
    "Sertakan midtransOrderId. Contoh: npx tsx scripts/simulate-webhook.ts ORD-SEED-000003 settlement",
  );
  process.exit(1);
}

const serverKey = process.env.MIDTRANS_SERVER_KEY;

if (!serverKey) {
  console.error(
    "MIDTRANS_SERVER_KEY belum diisi di .env.local. Signature tidak bisa dihitung.",
  );
  process.exit(1);
}

const target =
  process.env.WEBHOOK_TARGET ?? "http://localhost:3000/api/payments/webhook";

async function main() {
  // Nominal harus sama persis dengan yang tercatat, karena ikut ditandatangani.
  const { PrismaClient } = await import("@prisma/client");
  const { PrismaBetterSqlite3 } = await import(
    "@prisma/adapter-better-sqlite3"
  );

  const db = new PrismaClient({
    adapter: new PrismaBetterSqlite3({
      url: process.env.DATABASE_URL ?? "file:./dev.db",
    }),
  });

  const payment = await db.payment.findUnique({
    where: { midtransOrderId: orderId },
  });

  if (!payment) {
    console.error(`Pembayaran dengan order_id ${orderId} tidak ada di database.`);
    await db.$disconnect();
    process.exit(1);
  }

  const grossAmount = `${payment.grossAmount}.00`;
  const statusCode = statusArg === "settlement" ? "200" : "201";

  const signature = crypto
    .createHash("sha512")
    .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
    .digest("hex");

  const notification = {
    transaction_time: new Date().toISOString().slice(0, 19).replace("T", " "),
    transaction_status: statusArg,
    transaction_id: crypto.randomUUID(),
    status_message: "midtrans payment notification (simulasi lokal)",
    status_code: statusCode,
    signature_key: signature,
    settlement_time:
      statusArg === "settlement"
        ? new Date().toISOString().slice(0, 19).replace("T", " ")
        : undefined,
    payment_type: payment.method ?? "qris",
    order_id: orderId,
    merchant_id: process.env.MIDTRANS_MERCHANT_ID ?? "G000000000",
    gross_amount: grossAmount,
    fraud_status: "accept",
    currency: "IDR",
  };

  console.log(`Mengirim notifikasi "${statusArg}" untuk ${orderId} ke ${target}`);
  console.log(`Status pembayaran sebelum: ${payment.status}`);

  const response = await fetch(target, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(notification),
  });

  console.log(`Balasan webhook: ${response.status}`);
  console.log(await response.text());

  const after = await db.payment.findUnique({
    where: { midtransOrderId: orderId },
  });
  console.log(`Status pembayaran sesudah: ${after?.status}`);

  await db.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

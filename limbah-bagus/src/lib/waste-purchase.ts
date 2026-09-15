import { db } from "@/lib/db";
import { payoutScheduleFor } from "@/lib/waste";

/**
 * Pelunasan satu pembelian sampah.
 *
 * Dipanggil dari dua arah yang berbeda:
 *  - pembayaran QRIS, setelah Midtrans mengonfirmasi settlement
 *  - pembayaran tunai, setelah pedagang mengonfirmasi uangnya diterima
 *
 * Idempoten. Pembelian yang sudah lunas tidak diproses ulang, jadi notifikasi
 * Midtrans yang dikirim berkali-kali tidak menggandakan pencairan.
 */
export async function completeWastePurchase(purchaseId: string): Promise<void> {
  const purchase = await db.wastePurchase.findUnique({
    where: { id: purchaseId },
    include: {
      listing: { include: { trader: true } },
      payout: true,
    },
  });

  if (!purchase || purchase.status === "paid") return;

  const paidAt = new Date();

  await db.$transaction([
    // Filter status mencegah dua permintaan bersamaan melunasi dua kali.
    db.wastePurchase.updateMany({
      where: { id: purchaseId, status: { not: "paid" } },
      data: {
        status: "paid",
        paidAt,
        // Biaya layanan hanya benar-benar terpungut kalau uangnya lewat
        // platform. Pembayaran tunai menyisakannya sebagai tagihan pengolah.
        feeStatus:
          purchase.paymentMethod === "qris" ? "collected" : "outstanding",
      },
    }),
    db.wasteListing.update({
      where: { id: purchase.listingId },
      data: { status: "completed" },
    }),
  ]);

  // Tunai berpindah tangan langsung di lokasi, jadi tidak ada yang dicairkan.
  if (purchase.paymentMethod !== "qris" || purchase.payout) return;

  const trader = purchase.listing.trader;
  // Pedagang menerima utuh nilai sampahnya. Biaya layanan sudah ditambahkan di
  // atas nominal yang dibayar pengolah, jadi tidak dipotong di sini.
  const amount = purchase.finalAmount ?? purchase.estimatedAmount;

  // Rekening seharusnya sudah diisi sebelum QRIS boleh diterbitkan. Kalau
  // ternyata kosong, pencairan tetap dicatat sebagai gagal supaya uang yang
  // sudah masuk ke platform tidak hilang dari pembukuan tanpa jejak.
  const hasAccount =
    trader.payoutBankName &&
    trader.payoutAccountNumber &&
    trader.payoutAccountName;

  try {
    await db.payout.create({
      data: {
        purchaseId,
        traderId: trader.id,
        amount,
        bankName: trader.payoutBankName ?? "",
        accountNumber: trader.payoutAccountNumber ?? "",
        accountName: trader.payoutAccountName ?? "",
        status: hasAccount ? "pending" : "failed",
        failureReason: hasAccount
          ? null
          : "Rekening tujuan belum diisi pedagang.",
        scheduledAt: payoutScheduleFor(paidAt),
      },
    });
  } catch {
    // purchaseId unik, jadi pencairan kedua ditolak database. Itu memang tujuannya.
  }
}

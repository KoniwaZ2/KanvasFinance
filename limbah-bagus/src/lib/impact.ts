import { db } from "@/lib/db";

/**
 * Faktor emisi konservatif untuk sampah organik yang dialihkan dari landfill.
 * Metodologi dan rencana validasinya ada di docs/IMPACT-METRICS.md.
 * Angka ini estimasi kerja, bukan hasil pengukuran lapangan.
 */
export const EMISSION_FACTOR_KG_CO2E_PER_KG_WASTE = 0.5;

export type ImpactStats = {
  totalDivertedKg: number;
  emissionAvoidedKgCo2e: number;
  activeProcessors: number;
  buyersServed: number;
  activeTraders: number;
  traderEarningsRupiah: number;
  feedSoldKg: number;
  fertilizerSoldKg: number;
};

export async function getImpactStats(): Promise<ImpactStats> {
  const [wasteAgg, paidPurchases, paidOrders, soldItems] = await Promise.all([
    db.impactRecord.aggregate({ _sum: { wasteKg: true } }),
    // Hanya pembelian yang benar-benar lunas yang dihitung sebagai peredaran
    // uang. Transaksi yang baru ditimbang belum tentu jadi.
    db.wastePurchase.findMany({
      where: { status: "paid" },
      select: {
        processorId: true,
        finalAmount: true,
        listing: { select: { traderId: true } },
      },
    }),
    db.order.findMany({
      where: { status: { in: ["paid", "fulfilled"] } },
      select: { buyerId: true },
    }),
    db.orderItem.findMany({
      where: { order: { status: { in: ["paid", "fulfilled"] } } },
      select: { quantityKg: true, product: { select: { type: true } } },
    }),
  ]);

  const totalDivertedKg = wasteAgg._sum.wasteKg ?? 0;

  const feedSoldKg = soldItems
    .filter((item) => item.product.type !== "pupuk_kasgot")
    .reduce((sum, item) => sum + item.quantityKg, 0);

  const fertilizerSoldKg = soldItems
    .filter((item) => item.product.type === "pupuk_kasgot")
    .reduce((sum, item) => sum + item.quantityKg, 0);

  return {
    totalDivertedKg,
    emissionAvoidedKgCo2e: Math.round(
      totalDivertedKg * EMISSION_FACTOR_KG_CO2E_PER_KG_WASTE,
    ),
    activeProcessors: new Set(paidPurchases.map((p) => p.processorId)).size,
    activeTraders: new Set(paidPurchases.map((p) => p.listing.traderId)).size,
    traderEarningsRupiah: paidPurchases.reduce(
      (sum, p) => sum + (p.finalAmount ?? 0),
      0,
    ),
    buyersServed: new Set(paidOrders.map((order) => order.buyerId)).size,
    feedSoldKg,
    fertilizerSoldKg,
  };
}

/** Tonase per bulan untuk grafik tren di dashboard dampak. */
export async function getMonthlyDiversion(months = 6) {
  const records = await db.impactRecord.findMany({
    select: { wasteKg: true, recordedAt: true },
    orderBy: { recordedAt: "asc" },
  });

  const buckets = new Map<string, number>();
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.set(`${d.getFullYear()}-${d.getMonth()}`, 0);
  }

  for (const record of records) {
    const d = new Date(record.recordedAt);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + record.wasteKg);
    }
  }

  return Array.from(buckets.entries()).map(([key, wasteKg]) => {
    const [year, month] = key.split("-").map(Number);
    return {
      label: new Intl.DateTimeFormat("id-ID", { month: "short" }).format(
        new Date(year, month, 1),
      ),
      wasteKg,
    };
  });
}

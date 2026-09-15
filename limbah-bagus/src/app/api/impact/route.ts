import { NextResponse } from "next/server";
import { getImpactStats, EMISSION_FACTOR_KG_CO2E_PER_KG_WASTE } from "@/lib/impact";

/** Statistik dampak lingkungan untuk konsumsi publik. */
export async function GET() {
  const stats = await getImpactStats();

  return NextResponse.json({
    ...stats,
    totalDivertedTon: Number((stats.totalDivertedKg / 1000).toFixed(1)),
    emissionFactorKgCo2ePerKgWaste: EMISSION_FACTOR_KG_CO2E_PER_KG_WASTE,
    catatan:
      "Angka emisi adalah estimasi. Metodologi dijelaskan di docs/IMPACT-METRICS.md.",
    generatedAt: new Date().toISOString(),
  });
}

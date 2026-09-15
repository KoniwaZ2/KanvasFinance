import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRightIcon, InfoIcon } from "@phosphor-icons/react/dist/ssr";
import { db } from "@/lib/db";
import {
  getImpactStats,
  getMonthlyDiversion,
  EMISSION_FACTOR_KG_CO2E_PER_KG_WASTE,
} from "@/lib/impact";
import {
  formatKg,
  formatNumber,
  formatRupiah,
  formatTon,
  scaleRupiah,
} from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard dampak lingkungan",
  description:
    "Berapa ton sampah organik pasar Kabupaten Tangerang yang berhasil dialihkan dari TPA Jatiwaringin, dihitung dari timbangan penjemputan yang benar-benar terjadi.",
};

export default async function DashboardDampakPage() {
  const [stats, monthly, pickups] = await Promise.all([
    getImpactStats(),
    getMonthlyDiversion(6),
    db.wastePurchase.findMany({
      where: { actualKg: { not: null } },
      select: {
        actualKg: true,
        listing: { select: { trader: { select: { marketName: true } } } },
      },
    }),
  ]);

  // Agregasi per pasar asal, dihitung dari lot yang sudah ditimbang.
  const byMarket = new Map<string, number>();
  for (const pickup of pickups) {
    const market = pickup.listing.trader.marketName;
    byMarket.set(market, (byMarket.get(market) ?? 0) + (pickup.actualKg ?? 0));
  }
  const markets = Array.from(byMarket.entries()).sort((a, b) => b[1] - a[1]);
  const marketTotal = markets.reduce((sum, [, kg]) => sum + kg, 0);

  const peakMonth = Math.max(...monthly.map((month) => month.wasteKg), 1);

  // Nominal kumulatif dipecah jadi angka dan satuan. Ditulis utuh, deretan
  // digitnya melewati lebar kolom dan menabrak statistik di sebelahnya.
  const earnings = scaleRupiah(stats.traderEarningsRupiah);

  return (
    <div className="mx-auto max-w-7xl px-4 py-14 md:py-20">
      <header className="max-w-3xl">
        <p className="text-sm font-medium text-accent">Data terbuka</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink md:text-5xl">
          Dampak yang bisa dihitung ulang
        </h1>
        <p className="mt-4 max-w-[62ch] leading-relaxed text-ink-soft">
          Semua angka di halaman ini berasal dari timbangan di lokasi
          penjemputan, dicatat pengolah setelah sampah benar-benar diangkut.
          Perkiraan berat yang diisi pedagang tidak pernah ikut dihitung.
        </p>
      </header>

      <section className="mt-12 grid gap-10 border-y border-line py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="min-w-0">
          <p className="font-display text-4xl font-semibold tabular-nums text-ink md:text-5xl">
            {formatTon(stats.totalDivertedKg)}
          </p>
          <p className="mt-2 text-sm font-medium text-ink">
            Ton sampah organik dialihkan
          </p>
          <p className="mt-1 text-xs text-ink-soft">
            Kumulatif sejak program berjalan
          </p>
        </div>

        <div className="min-w-0">
          <p className="font-display text-4xl font-semibold tabular-nums text-ink md:text-5xl">
            {formatNumber(Math.round(stats.emissionAvoidedKgCo2e / 1000))}
          </p>
          <p className="mt-2 text-sm font-medium text-ink">
            Ton CO2e dihindari
          </p>
          <p className="mt-1 text-xs text-ink-soft">
            Estimasi, lihat metodologi di bawah
          </p>
        </div>

        <div className="min-w-0">
          <p className="font-display text-4xl font-semibold tabular-nums text-ink md:text-5xl">
            {earnings.amount}
          </p>
          <p className="mt-2 text-sm font-medium text-ink first-letter:uppercase">
            {earnings.unit ? `${earnings.unit} rupiah` : "Rupiah"} menjadi hak
            pedagang
          </p>
          <p className="mt-1 text-xs text-ink-soft">
            {formatRupiah(stats.traderEarningsRupiah)} dari{" "}
            {formatNumber(stats.activeTraders)} pedagang yang sudah menjual
          </p>
        </div>

        <div className="min-w-0">
          <p className="font-display text-4xl font-semibold tabular-nums text-ink md:text-5xl">
            {formatNumber(stats.feedSoldKg + stats.fertilizerSoldKg)}
          </p>
          <p className="mt-2 text-sm font-medium text-ink">
            Kilogram produk tersalurkan
          </p>
          <p className="mt-1 text-xs text-ink-soft">
            {formatKg(stats.feedSoldKg)} pakan dan{" "}
            {formatKg(stats.fertilizerSoldKg)} pupuk ke{" "}
            {formatNumber(stats.buyersServed)} pembeli
          </p>
        </div>
      </section>

      <div className="mt-16 grid gap-12 lg:grid-cols-[1.3fr_1fr] lg:gap-16">
        <section>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
            Sampah terolah enam bulan terakhir
          </h2>
          <p className="mt-2 text-sm text-ink-soft">
            Dihitung dari berat timbangan tiap lot yang sudah dijemput.
          </p>

          <div className="mt-8 flex h-64 items-end gap-3 border-b border-line">
            {monthly.map((month) => {
              const heightPct = Math.max((month.wasteKg / peakMonth) * 100, 2);
              return (
                <div
                  key={month.label}
                  className="flex flex-1 flex-col items-center justify-end gap-2"
                >
                  <span className="text-xs font-medium tabular-nums text-ink-soft">
                    {month.wasteKg > 0 ? formatTon(month.wasteKg) : "0"}
                  </span>
                  <div
                    className="w-full rounded-t-md bg-brand"
                    style={{ height: `${heightPct}%` }}
                    role="img"
                    aria-label={`${month.label}: ${formatKg(month.wasteKg)}`}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex gap-3">
            {monthly.map((month) => (
              <p
                key={month.label}
                className="flex-1 pt-2 text-center text-xs capitalize text-ink-soft"
              >
                {month.label}
              </p>
            ))}
          </div>
          <p className="mt-4 text-xs text-ink-soft">
            Satuan angka di atas batang adalah ton.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
            Asal sampah per pasar
          </h2>
          <p className="mt-2 text-sm text-ink-soft">
            Pasar tempat lot sampah yang terjual berasal.
          </p>

          <dl className="mt-8 divide-y divide-line border-t border-line">
            {markets.map(([market, kg]) => {
              const share = marketTotal > 0 ? (kg / marketTotal) * 100 : 0;
              return (
                <div key={market} className="py-4">
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="font-medium text-ink">{market}</dt>
                    <dd className="text-sm tabular-nums text-ink-soft">
                      {formatTon(kg)} ton
                      <span className="ml-2 text-ink">
                        {Math.round(share)} persen
                      </span>
                    </dd>
                  </div>
                  <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-surface-sunken">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${share}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </dl>
        </section>
      </div>

      <section className="mt-16 rounded-xl border border-line bg-surface-raised p-6 md:p-8">
        <div className="flex gap-3">
          <InfoIcon
            size={20}
            className="mt-0.5 shrink-0 text-ink-soft"
            aria-hidden
          />
          <div>
            <h2 className="font-display text-lg font-semibold text-ink">
              Cara angka emisi dihitung
            </h2>
            <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-ink-soft">
              Setiap kilogram sampah organik yang dialihkan dari TPA dihitung
              setara {EMISSION_FACTOR_KG_CO2E_PER_KG_WASTE} kg CO2e yang tidak
              jadi terlepas, memakai faktor estimasi konservatif untuk diversi
              sampah organik. Angka ini estimasi kerja, bukan hasil pengukuran
              lapangan, dan akan diperbarui begitu tersedia faktor emisi resmi
              yang lebih spesifik untuk komposisi sampah pasar Kabupaten
              Tangerang.
            </p>
            <Link
              href="/metodologi"
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-accent transition-colors hover:text-accent-hover"
            >
              Baca metodologi lengkap
              <ArrowUpRightIcon size={15} aria-hidden />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

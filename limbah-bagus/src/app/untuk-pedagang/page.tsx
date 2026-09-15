import type { Metadata } from "next";
import {
  CoinsIcon,
  ScalesIcon,
  StorefrontIcon,
} from "@phosphor-icons/react/dist/ssr";
import { db } from "@/lib/db";
import { getActiveTariffs } from "@/lib/tariffs";
import { ButtonLink, SectionHeading } from "@/components/ui";
import { formatKg, formatRupiah, formatTon } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Jual sampah organik lapak Anda",
  description:
    "Pedagang pasar dan rumah makan di Kabupaten Tangerang bisa menjual sampah organik dengan harga resmi yang sama untuk semua, dibayar di tempat setelah ditimbang.",
};

const STEPS = [
  {
    icon: StorefrontIcon,
    title: "Pasang sampah yang siap dijemput",
    body: "Pilih jenis sampahnya, isi perkiraan berat, dan tentukan kapan siap diambil. Tidak ada kolom harga karena harganya sudah ditetapkan.",
  },
  {
    icon: ScalesIcon,
    title: "Ditimbang di depan Anda",
    body: "Pengolah datang dan menimbang ulang di lokasi. Berat timbangan itulah yang dipakai menghitung uang, bukan perkiraan yang Anda isi.",
  },
  {
    icon: CoinsIcon,
    title: "Dibayar di tempat",
    body: "Tunai langsung, atau lewat QRIS yang dana masuknya diteruskan ke rekening Anda. Anda mengonfirmasi sendiri kalau uang tunainya sudah diterima.",
  },
];

export default async function UntukPedagangPage() {
  const [processors, tariffs, sellingTraders, wasteAgg, paidAgg] =
    await Promise.all([
      db.processorProfile.findMany({
        where: { buysWaste: true },
        orderBy: { capacityKgPerDay: "desc" },
      }),
      getActiveTariffs(),
      db.wastePurchase.findMany({
        where: { status: "paid" },
        select: { listing: { select: { traderId: true } } },
      }),
      db.impactRecord.aggregate({ _sum: { wasteKg: true } }),
      db.wastePurchase.aggregate({
        where: { status: "paid" },
        _sum: { finalAmount: true },
      }),
    ]);

  const traderCount = new Set(
    sellingTraders.map((purchase) => purchase.listing.traderId),
  ).size;

  const highestTariff = tariffs.reduce(
    (max, tariff) => Math.max(max, tariff.pricePerKg),
    0,
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-14 md:py-20">
      <header className="max-w-3xl">
        <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight text-ink md:text-5xl">
          Sampah sisa dagangan Anda ada harganya
        </h1>
        <p className="mt-4 max-w-[60ch] leading-relaxed text-ink-soft">
          Sisa sayur, ampas produksi, dan sisa makanan yang selama ini dibuang
          bisa dijual ke pengolah maggot. Harganya ditetapkan pemerintah daerah
          dan berlaku sama untuk semua pedagang, jadi tidak ada tawar-menawar
          dan tidak ada yang bisa menekan harga Anda.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <ButtonLink href="/daftar-pedagang" size="lg">
            Daftar dan Mulai Menjual
          </ButtonLink>
          <ButtonLink href="/harga-sampah" variant="ghost" size="lg">
            Lihat Daftar Harga
          </ButtonLink>
        </div>
      </header>

      <section className="mt-16 grid gap-8 border-y border-line py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-display text-3xl font-semibold tabular-nums text-ink">
            {formatRupiah(highestTariff)}
          </p>
          <p className="mt-1.5 text-sm text-ink-soft">
            Harga tertinggi per kg, untuk ampas produksi
          </p>
        </div>
        <div>
          <p className="font-display text-3xl font-semibold tabular-nums text-ink">
            {formatRupiah(paidAgg._sum.finalAmount ?? 0)}
          </p>
          <p className="mt-1.5 text-sm text-ink-soft">
            Sudah dibayarkan ke pedagang
          </p>
        </div>
        <div>
          <p className="font-display text-3xl font-semibold tabular-nums text-ink">
            {traderCount}
          </p>
          <p className="mt-1.5 text-sm text-ink-soft">
            Lapak yang sudah menjual sampahnya
          </p>
        </div>
        <div>
          <p className="font-display text-3xl font-semibold tabular-nums text-ink">
            {formatTon(wasteAgg._sum.wasteKg ?? 0)} ton
          </p>
          <p className="mt-1.5 text-sm text-ink-soft">
            Sudah diangkut dari pasar mitra
          </p>
        </div>
      </section>

      <section className="mt-20">
        <SectionHeading
          title="Harga resmi per jenis sampah"
          description="Satu harga untuk semua pedagang, besar maupun kecil. Ditetapkan pemerintah daerah, bukan oleh pembeli dan bukan oleh aplikasi ini."
        />

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {tariffs.map((tariff) => (
            <div
              key={tariff.id}
              className="flex flex-col rounded-xl border border-line bg-surface-raised p-6"
            >
              <h3 className="font-display text-lg font-semibold text-ink">
                {tariff.name}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-soft">
                {tariff.description}
              </p>
              <p className="mt-6 font-display text-3xl font-semibold tabular-nums text-ink">
                {formatRupiah(tariff.pricePerKg)}
              </p>
              <p className="mt-1 text-sm text-ink-soft">per kilogram</p>
            </div>
          ))}
        </div>

        <p className="mt-6 max-w-[65ch] text-sm text-ink-soft">
          Contoh, 50 kg sisa sayur yang biasanya dibuang bernilai{" "}
          {formatRupiah(50 * (tariffs[0]?.pricePerKg ?? 0))} sekali jemput.
          Mendaftar dan memasang lot tidak dipungut biaya, dan tidak ada iuran
          bulanan apa pun.
        </p>
      </section>

      <section className="mt-20 rounded-xl bg-brand px-6 py-14 md:px-12 md:py-16">
        <h2 className="max-w-2xl font-display text-2xl font-semibold tracking-tight text-brand-contrast md:text-3xl">
          Tiga langkah sampai uangnya di tangan
        </h2>

        <ol className="mt-10 grid gap-8 md:grid-cols-3 md:gap-10">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <li key={step.title}>
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-contrast/10 text-brand-contrast">
                    <Icon size={19} aria-hidden />
                  </span>
                  <span className="font-display text-sm font-medium tabular-nums text-brand-contrast/60">
                    {index + 1}
                  </span>
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold text-brand-contrast">
                  {step.title}
                </h3>
                <p className="mt-2 max-w-[42ch] text-sm leading-relaxed text-brand-contrast/80">
                  {step.body}
                </p>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="mt-20">
        <SectionHeading
          title="Pengolah yang membeli sampah Anda"
          description="Unit pengolahan maggot BSF yang beroperasi di wilayah Kabupaten Tangerang dan mengambil lot dari bursa."
        />

        <div className="mt-8 divide-y divide-line border-y border-line">
          {processors.map((processor) => (
            <div
              key={processor.id}
              className="grid gap-3 py-6 md:grid-cols-[1fr_2fr_auto] md:items-start md:gap-8"
            >
              <div>
                <p className="font-medium text-ink">{processor.unitName}</p>
                <p className="mt-1 text-sm text-ink-soft">
                  {processor.location}
                </p>
              </div>
              <p className="max-w-[60ch] text-sm leading-relaxed text-ink-soft">
                {processor.description}
              </p>
              <p className="text-sm tabular-nums text-ink-soft md:text-right">
                {formatKg(processor.capacityKgPerDay)} per hari
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

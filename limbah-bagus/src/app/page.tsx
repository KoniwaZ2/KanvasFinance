import Image from "next/image";
import Link from "next/link";
import {
  ArrowDownIcon,
  ArrowRightIcon,
  ArrowUpRightIcon,
  BasketIcon,
  PlantIcon,
  StorefrontIcon,
} from "@phosphor-icons/react/dist/ssr";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { ROLE_HOME } from "@/lib/access";
import { getImpactStats } from "@/lib/impact";
import { ButtonLink, SectionHeading } from "@/components/ui";
import { ProductCard } from "@/components/product-card";
import { formatNumber, formatTon } from "@/lib/format";

export const dynamic = "force-dynamic";

const FLOW_STEPS = [
  {
    icon: StorefrontIcon,
    actor: "Pedagang pasar dan resto",
    action:
      "Memasang sampah organiknya di bursa dengan harga resmi. Sisa dagangan yang dulu dibuang kini jadi pemasukan.",
  },
  {
    icon: PlantIcon,
    actor: "Pengolah maggot BSF",
    action:
      "Membeli lot sampah, menimbang dan membayar di lokasi, lalu mengolahnya jadi larva protein tinggi serta pupuk kasgot.",
  },
  {
    icon: BasketIcon,
    actor: "Petani dan peternak lokal",
    action:
      "Membeli pakan dan pupuk lewat katalog dengan harga jauh di bawah produk pabrikan.",
  },
];

export default async function HomePage() {
  // Landing page ini untuk pengunjung yang belum masuk. Pengguna yang sudah
  // masuk langsung diantar ke beranda perannya, karena penjelasan layanan
  // sudah tidak relevan lagi bagi mereka.
  const user = await getSessionUser();
  if (user) {
    redirect(ROLE_HOME[user.role]);
  }

  const [stats, featured] = await Promise.all([
    getImpactStats(),
    db.product.findMany({
      where: { isActive: true, stockKg: { gt: 0 } },
      include: { processor: true },
      orderBy: { stockKg: "desc" },
      take: 3,
    }),
  ]);

  const cheapest = featured.reduce<number | null>((lowest, product) => {
    if (!product.referenceMarketPrice) return lowest;
    const saving = Math.round(
      ((product.referenceMarketPrice - product.pricePerKg) /
        product.referenceMarketPrice) *
        100,
    );
    return lowest === null || saving > lowest ? saving : lowest;
  }, null);

  return (
    <>
      {/* Hero: split asimetris, bukan hero tersentris. */}
      <section className="mx-auto max-w-7xl px-4 pb-16 pt-12 md:pb-24 md:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div>
            <p className="text-sm font-medium text-accent">
              Kabupaten Tangerang
            </p>

            <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.08] tracking-tight text-balance text-ink md:text-5xl">
              Sampah pasar hari ini,
              <br />
              pakan ternak bulan depan.
            </h1>

            <p className="mt-6 max-w-[52ch] text-lg leading-relaxed text-ink-soft">
              Pedagang menjual sampah organiknya dengan harga resmi, pengolah
              mengubahnya jadi maggot BSF, petani dan peternak mendapat pakan
              dan pupuk murah.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/katalog" size="lg">
                Lihat katalog
              </ButtonLink>
              <ButtonLink href="/harga-sampah" variant="ghost" size="lg">
                Lihat harga sampah
              </ButtonLink>
            </div>
          </div>

          <div className="relative">
            <div className="relative aspect-[5/4] overflow-hidden rounded-xl border border-line">
              <Image
                src="/produk/maggot-kering.svg"
                alt="Tekstur maggot BSF kering hasil olahan mitra pengolah"
                fill
                priority
                unoptimized
                sizes="(max-width: 1024px) 100vw, 45vw"
                className="object-cover"
              />
            </div>

            <div className="absolute -bottom-6 left-4 right-4 rounded-xl border border-line bg-surface-raised p-5 shadow-sm sm:left-auto sm:right-6 sm:w-64">
              <p className="font-display text-3xl font-semibold tabular-nums text-ink">
                {formatTon(stats.totalDivertedKg)} ton
              </p>
              <p className="mt-1 text-sm leading-snug text-ink-soft">
                sampah organik dialihkan dari TPA Jatiwaringin
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Statistik nyata dari database, tanpa kotak kartu supaya angka bernapas. */}
      <section className="border-y border-line bg-surface-raised">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-6 gap-y-10 px-4 py-12 md:grid-cols-4 md:py-14">
          <div>
            <p className="font-display text-3xl font-semibold tabular-nums text-ink md:text-4xl">
              {formatTon(stats.totalDivertedKg)}
            </p>
            <p className="mt-1.5 text-sm text-ink-soft">Ton sampah diolah</p>
          </div>
          <div>
            <p className="font-display text-3xl font-semibold tabular-nums text-ink md:text-4xl">
              {formatNumber(Math.round(stats.emissionAvoidedKgCo2e / 1000))}
            </p>
            <p className="mt-1.5 text-sm text-ink-soft">
              Ton CO2e dihindari, estimasi
            </p>
          </div>
          <div>
            <p className="font-display text-3xl font-semibold tabular-nums text-ink md:text-4xl">
              {formatNumber(stats.activeTraders)}
            </p>
            <p className="mt-1.5 text-sm text-ink-soft">
              Pedagang yang sudah menjual
            </p>
          </div>
          <div>
            <p className="font-display text-3xl font-semibold tabular-nums text-ink md:text-4xl">
              {formatNumber(stats.activeProcessors)}
            </p>
            <p className="mt-1.5 text-sm text-ink-soft">Mitra pengolah aktif</p>
          </div>
        </div>
      </section>

      {/* Alur tiga pihak sebagai diagram, bukan tiga kartu seragam. */}
      <section className="mx-auto max-w-7xl px-4 py-20 md:py-28">
        <SectionHeading
          title="Satu rantai, tiga pihak yang sama-sama untung"
          description="Biaya angkut dari pedagang membiayai pengolahan. Hasil olahannya jadi pendapatan mitra dan pakan murah bagi peternak."
        />

        <ol className="mt-12 grid gap-4 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-stretch lg:gap-2">
          {FLOW_STEPS.map((step, index) => {
            const Icon = step.icon;
            // Simpul tengah adalah tempat pengolahan terjadi, jadi diberi
            // bobot visual berbeda supaya terbaca sebagai alur, bukan tiga
            // kartu sejajar yang setara.
            const isHub = index === 1;

            return (
              <li key={step.actor} className="contents">
                <div
                  className={`flex h-full flex-col rounded-xl border p-6 ${
                    isHub
                      ? "border-brand bg-brand"
                      : "border-line bg-surface-raised"
                  }`}
                >
                  <span
                    className={`grid h-11 w-11 place-items-center rounded-full ${
                      isHub
                        ? "bg-brand-contrast/15 text-brand-contrast"
                        : "bg-brand text-brand-contrast"
                    }`}
                  >
                    <Icon size={20} aria-hidden />
                  </span>
                  <h3
                    className={`mt-5 font-display text-lg font-semibold leading-snug ${
                      isHub ? "text-brand-contrast" : "text-ink"
                    }`}
                  >
                    {step.actor}
                  </h3>
                  <p
                    className={`mt-2 text-sm leading-relaxed ${
                      isHub ? "text-brand-contrast/80" : "text-ink-soft"
                    }`}
                  >
                    {step.action}
                  </p>
                </div>

                {index < FLOW_STEPS.length - 1 ? (
                  <div
                    className="flex items-center justify-center py-1 text-ink-soft lg:px-1"
                    aria-hidden
                  >
                    <ArrowDownIcon size={20} className="lg:hidden" />
                    <ArrowRightIcon size={20} className="hidden lg:block" />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      </section>

      {/* Dua pintu masuk pengguna, komposisi berbeda dari section sebelumnya. */}
      <section className="border-y border-line bg-surface-raised">
        <div className="mx-auto grid max-w-7xl gap-px overflow-hidden bg-line md:grid-cols-2">
          <div className="bg-surface-raised px-6 py-14 md:px-10 md:py-20">
            <p className="text-sm font-medium text-accent">Penghasil sampah</p>
            <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-ink md:text-3xl">
              Dibayar di tempat, setelah ditimbang di depan Anda
            </h2>
            <p className="mt-4 max-w-[48ch] leading-relaxed text-ink-soft">
              Harga per kilogram ditetapkan pemerintah daerah dan sama untuk
              semua pedagang, jadi tidak ada tawar-menawar dan tidak ada yang
              bisa menekan harga Anda.
            </p>
            <Link
              href="/untuk-pedagang"
              className="mt-7 inline-flex items-center gap-2 text-sm font-medium text-accent transition-colors hover:text-accent-hover"
            >
              Pelajari cara menjual sampah
              <ArrowUpRightIcon size={15} aria-hidden />
            </Link>
          </div>

          <div className="bg-surface-raised px-6 py-14 md:px-10 md:py-20">
            <p className="text-sm font-medium text-accent">Pembeli</p>
            <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-ink md:text-3xl">
              Pakan protein tinggi tanpa harga pabrikan
            </h2>
            <p className="mt-4 max-w-[48ch] leading-relaxed text-ink-soft">
              {cheapest
                ? `Maggot kering dan pupuk kasgot dijual hingga ${cheapest} persen lebih murah dibanding produk pabrikan setara di pasaran lokal.`
                : "Maggot kering dan pupuk kasgot dijual langsung oleh mitra pengolah dengan harga di bawah produk pabrikan."}
            </p>
            <Link
              href="/katalog"
              className="mt-7 inline-flex items-center gap-2 text-sm font-medium text-accent transition-colors hover:text-accent-hover"
            >
              Lihat katalog
              <ArrowUpRightIcon size={15} aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      {featured.length > 0 ? (
        <section className="mx-auto max-w-7xl px-4 py-20 md:py-28">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <SectionHeading title="Sedang tersedia di katalog" />
            <Link
              href="/katalog"
              className="inline-flex items-center gap-2 text-sm font-medium text-accent transition-colors hover:text-accent-hover"
            >
              Lihat katalog
              <ArrowUpRightIcon size={15} aria-hidden />
            </Link>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      ) : null}

      {/* Konteks masalah dengan latar brand, satu-satunya blok gelap di halaman. */}
      <section className="bg-brand">
        <div className="mx-auto max-w-7xl px-4 py-20 md:py-28">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
            <div>
              <h2 className="font-display text-3xl font-semibold leading-tight tracking-tight text-brand-contrast md:text-4xl">
                TPA Jatiwaringin menerima lebih dari 2.300 ton sampah tiap hari
              </h2>
              <div className="mt-6 max-w-[60ch] space-y-4 leading-relaxed text-brand-contrast/80">
                <p>
                  Sebagian besar kiriman itu sampah sisa makanan dari pasar
                  tradisional. Ketika ditimbun, sampah organik terurai tanpa
                  udara dan melepas gas metana, memicu bau menyengat sampai
                  risiko kebakaran.
                </p>
                <p>
                  Di saat yang sama peternak dan pembudidaya ikan di pesisir
                  Mauk dan Kronjo kesulitan membeli pakan pabrikan yang harganya
                  terus naik. LimbahBagus menyambung dua persoalan ini jadi satu
                  rantai yang berputar.
                </p>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-8 self-start lg:border-l lg:border-brand-contrast/15 lg:pl-12">
              <div>
                <dt className="text-sm text-brand-contrast/70">
                  Sudah dialihkan
                </dt>
                <dd className="mt-2 font-display text-3xl font-semibold tabular-nums text-brand-contrast">
                  {formatTon(stats.totalDivertedKg)} ton
                </dd>
              </div>
              <div>
                <dt className="text-sm text-brand-contrast/70">
                  Pakan tersalurkan
                </dt>
                <dd className="mt-2 font-display text-3xl font-semibold tabular-nums text-brand-contrast">
                  {formatNumber(stats.feedSoldKg)} kg
                </dd>
              </div>
              <div>
                <dt className="text-sm text-brand-contrast/70">
                  Pupuk tersalurkan
                </dt>
                <dd className="mt-2 font-display text-3xl font-semibold tabular-nums text-brand-contrast">
                  {formatNumber(stats.fertilizerSoldKg)} kg
                </dd>
              </div>
              <div>
                <dt className="text-sm text-brand-contrast/70">
                  Pembeli terlayani
                </dt>
                <dd className="mt-2 font-display text-3xl font-semibold tabular-nums text-brand-contrast">
                  {formatNumber(stats.buyersServed)}
                </dd>
              </div>
            </dl>
          </div>

          <Link
            href="/dashboard-dampak"
            className="mt-12 inline-flex items-center gap-2 rounded-full border border-brand-contrast/25 px-5 py-2.5 text-sm font-medium text-brand-contrast transition-colors hover:bg-brand-contrast/10"
          >
            Buka dashboard dampak
            <ArrowUpRightIcon size={15} aria-hidden />
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-20 text-center md:py-28">
        <h2 className="font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">
          Mulai dari sisi mana pun rantai ini
        </h2>
        <p className="mx-auto mt-4 max-w-[52ch] leading-relaxed text-ink-soft">
          Punya lapak yang menghasilkan sampah organik, beternak maggot, atau
          butuh pakan murah untuk ternak dan tambak. Semuanya bisa dimulai hari
          ini.
        </p>
        <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
          <ButtonLink href="/daftar" size="lg">
            Daftar sekarang
          </ButtonLink>
          <ButtonLink href="/katalog" variant="ghost" size="lg">
            Lihat katalog
          </ButtonLink>
        </div>
      </section>
    </>
  );
}

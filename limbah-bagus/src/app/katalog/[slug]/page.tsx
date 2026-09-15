import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeftIcon,
  MapPinIcon,
  PackageIcon,
  RecycleIcon,
} from "@phosphor-icons/react/dist/ssr";
import { db } from "@/lib/db";
import { AddToCart } from "@/components/add-to-cart";
import {
  PRODUCT_TYPE_LABEL,
  ProductCard,
  savingPercent,
} from "@/components/product-card";
import { formatKg, formatRupiah } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await db.product.findUnique({ where: { slug } });

  if (!product) return { title: "Produk tidak ditemukan" };

  return {
    title: product.name,
    description: product.description.slice(0, 155),
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const product = await db.product.findUnique({
    where: { slug },
    include: { processor: true },
  });

  if (!product || !product.isActive) notFound();

  const saving = savingPercent(product);
  const outOfStock = product.stockKg <= 0;

  const related = await db.product.findMany({
    where: { isActive: true, id: { not: product.id } },
    include: { processor: true },
    orderBy: { stockKg: "desc" },
    take: 3,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:py-14">
      <Link
        href="/katalog"
        className="inline-flex items-center gap-2 text-sm text-ink-soft transition-colors hover:text-ink"
      >
        <ArrowLeftIcon size={16} aria-hidden />
        Kembali ke katalog
      </Link>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-line bg-surface-sunken">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              priority
              unoptimized
              sizes="(max-width: 1024px) 100vw, 55vw"
              className="object-cover"
            />
          ) : null}
        </div>

        <div>
          <p className="text-sm text-ink-soft">
            {PRODUCT_TYPE_LABEL[product.type] ?? product.type}
          </p>

          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">
            {product.name}
          </h1>

          <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-2">
            <span className="font-display text-4xl font-semibold tabular-nums text-ink">
              {formatRupiah(product.pricePerKg)}
            </span>
            <span className="text-ink-soft">per kilogram</span>
            {saving ? (
              <span className="rounded-full bg-accent-soft px-3 py-1 text-sm font-medium text-accent">
                {saving} persen lebih murah
              </span>
            ) : null}
          </div>

          {saving && product.referenceMarketPrice ? (
            <p className="mt-2 text-sm text-ink-soft">
              Pakan pabrikan setara dijual sekitar{" "}
              <span className="tabular-nums">
                {formatRupiah(product.referenceMarketPrice)}
              </span>{" "}
              per kg di pasaran lokal.
            </p>
          ) : null}

          <p className="mt-6 max-w-[62ch] leading-relaxed text-ink-soft">
            {product.description}
          </p>

          <dl className="mt-7 divide-y divide-line border-y border-line">
            {product.proteinContentPct ? (
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-sm text-ink-soft">Kandungan protein</dt>
                <dd className="font-medium tabular-nums text-ink">
                  {product.proteinContentPct} persen
                </dd>
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-sm text-ink-soft">Stok tersedia</dt>
              <dd
                className={`font-medium tabular-nums ${
                  outOfStock ? "text-ink-soft" : "text-ink"
                }`}
              >
                {outOfStock ? "Sedang kosong" : formatKg(product.stockKg)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-sm text-ink-soft">Diolah oleh</dt>
              <dd className="text-right font-medium text-ink">
                {product.processor.unitName}
              </dd>
            </div>
          </dl>

          <div className="mt-7">
            <AddToCart
              productId={product.id}
              stockKg={product.stockKg}
              pricePerKg={product.pricePerKg}
              size="full"
              showSubtotal
            />
          </div>

          {outOfStock ? (
            <p className="mt-3 text-sm text-ink-soft">
              Produk ini sedang kosong. Mitra pengolah biasanya panen ulang tiap
              dua minggu.
            </p>
          ) : (
            <p className="mt-3 text-sm text-ink-soft">
              Pembayaran lewat QRIS, e-wallet, atau Virtual Account. Pesanan
              diproses setelah pembayaran terkonfirmasi.
            </p>
          )}
        </div>
      </div>

      <section className="mt-16 rounded-xl border border-line bg-surface-raised p-6 md:p-8">
        <h2 className="font-display text-xl font-semibold text-ink">
          Tentang mitra pengolah
        </h2>
        <div className="mt-4 grid gap-6 md:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="font-medium text-ink">
              {product.processor.unitName}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-soft">
              <MapPinIcon size={15} aria-hidden />
              {product.processor.location}
            </p>
            <p className="mt-4 max-w-[60ch] text-sm leading-relaxed text-ink-soft">
              {product.processor.description}
            </p>
          </div>
          <dl className="space-y-4 md:border-l md:border-line md:pl-6">
            <div>
              <dt className="flex items-center gap-2 text-sm text-ink-soft">
                <RecycleIcon size={15} aria-hidden />
                Kapasitas olah harian
              </dt>
              <dd className="mt-1 font-display text-2xl font-semibold tabular-nums text-ink">
                {formatKg(product.processor.capacityKgPerDay)}
              </dd>
            </div>
            <div>
              <dt className="flex items-center gap-2 text-sm text-ink-soft">
                <PackageIcon size={15} aria-hidden />
                Jenis produk
              </dt>
              <dd className="mt-1 font-medium text-ink">
                {PRODUCT_TYPE_LABEL[product.type] ?? product.type}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {related.length > 0 ? (
        <section className="mt-16">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
            Produk lain dari mitra kami
          </h2>
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

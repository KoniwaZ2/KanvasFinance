import Image from "next/image";
import Link from "next/link";
import { MapPinIcon } from "@phosphor-icons/react/dist/ssr";
import { AddToCart } from "@/components/add-to-cart";
import { formatKg, formatRupiah } from "@/lib/format";

export type CatalogProduct = {
  id: string;
  slug: string;
  name: string;
  type: string;
  pricePerKg: number;
  referenceMarketPrice: number | null;
  stockKg: number;
  proteinContentPct: number | null;
  imageUrl: string | null;
  processor: { unitName: string; location: string };
};

const LOW_STOCK_THRESHOLD_KG = 20;

export const PRODUCT_TYPE_LABEL: Record<string, string> = {
  maggot_kering: "Pakan kering",
  maggot_segar: "Pakan segar",
  pupuk_kasgot: "Pupuk organik",
};

/**
 * Selisih harga terhadap pakan pabrikan pembanding.
 * Dikembalikan null kalau data pembanding tidak ada, supaya klaim
 * penghematan tidak pernah ditampilkan tanpa dasar.
 */
export function savingPercent(product: {
  pricePerKg: number;
  referenceMarketPrice: number | null;
}): number | null {
  if (!product.referenceMarketPrice || product.referenceMarketPrice <= 0) {
    return null;
  }
  const diff =
    (product.referenceMarketPrice - product.pricePerKg) /
    product.referenceMarketPrice;
  return diff > 0 ? Math.round(diff * 100) : null;
}

export function ProductCard({ product }: { product: CatalogProduct }) {
  const saving = savingPercent(product);
  const outOfStock = product.stockKg <= 0;
  const lowStock = !outOfStock && product.stockKg < LOW_STOCK_THRESHOLD_KG;

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-line bg-surface-raised">
      <Link
        href={`/katalog/${product.slug}`}
        className="relative block aspect-[4/3] overflow-hidden bg-surface-sunken"
      >
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            // Aset produk berformat SVG, tidak perlu lewat optimizer raster.
            unoptimized
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover"
          />
        ) : null}
        {saving ? (
          <span className="absolute left-3 top-3 rounded-full bg-accent px-3 py-1 text-xs font-medium text-white">
            {saving} persen lebih murah
          </span>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs text-ink-soft">
          {PRODUCT_TYPE_LABEL[product.type] ?? product.type}
        </p>

        <h3 className="mt-1 font-display text-lg font-semibold leading-snug text-ink">
          <Link href={`/katalog/${product.slug}`} className="hover:text-accent">
            {product.name}
          </Link>
        </h3>

        <p className="mt-2 flex items-start gap-1.5 text-sm text-ink-soft">
          <MapPinIcon size={15} className="mt-0.5 shrink-0" aria-hidden />
          <span>
            {product.processor.unitName}, {product.processor.location}
          </span>
        </p>

        <div className="mt-4 flex items-baseline gap-1.5">
          <span className="font-display text-2xl font-semibold tabular-nums text-ink">
            {formatRupiah(product.pricePerKg)}
          </span>
          <span className="text-sm text-ink-soft">per kg</span>
        </div>

        <dl className="mt-3 space-y-1 text-sm">
          {product.proteinContentPct ? (
            <div className="flex justify-between gap-3">
              <dt className="text-ink-soft">Kandungan protein</dt>
              <dd className="font-medium tabular-nums text-ink">
                {product.proteinContentPct} persen
              </dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-3">
            <dt className="text-ink-soft">Stok tersedia</dt>
            <dd
              className={`font-medium tabular-nums ${
                outOfStock ? "text-ink-soft" : lowStock ? "text-warning" : "text-ink"
              }`}
            >
              {outOfStock ? "Kosong" : formatKg(product.stockKg)}
            </dd>
          </div>
        </dl>

        {lowStock ? (
          <p className="mt-2 text-xs text-warning">
            Stok menipis, panen berikutnya menyusul dalam beberapa hari.
          </p>
        ) : null}

        {/* mt-auto menjaga tombol tetap sejajar antar kartu walau isi dl berbeda. */}
        <div className="mt-auto pt-5">
          <AddToCart
            productId={product.id}
            stockKg={product.stockKg}
            pricePerKg={product.pricePerKg}
          />
        </div>
      </div>
    </article>
  );
}

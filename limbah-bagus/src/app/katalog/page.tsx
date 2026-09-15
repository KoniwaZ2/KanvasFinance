import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { ProductCard, PRODUCT_TYPE_LABEL } from "@/components/product-card";
import { EmptyState, ButtonLink } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Katalog pakan dan pupuk",
  description:
    "Pakan maggot BSF dan pupuk kasgot dari mitra pengolah di Kabupaten Tangerang, dijual langsung tanpa perantara.",
};

const FILTERS = [
  { value: "semua", label: "Semua produk" },
  { value: "maggot_kering", label: PRODUCT_TYPE_LABEL.maggot_kering },
  { value: "maggot_segar", label: PRODUCT_TYPE_LABEL.maggot_segar },
  { value: "pupuk_kasgot", label: PRODUCT_TYPE_LABEL.pupuk_kasgot },
];

export default async function KatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ jenis?: string }>;
}) {
  const { jenis } = await searchParams;
  const activeFilter =
    jenis && FILTERS.some((filter) => filter.value === jenis) ? jenis : "semua";

  const products = await db.product.findMany({
    where: {
      isActive: true,
      ...(activeFilter === "semua" ? {} : { type: activeFilter }),
    },
    include: { processor: true },
    orderBy: [{ stockKg: "desc" }, { pricePerKg: "asc" }],
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-14 md:py-20">
      <header className="max-w-2xl">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-ink md:text-5xl">
          Pakan dan pupuk dari dapur pasar
        </h1>
        <p className="mt-4 max-w-[60ch] leading-relaxed text-ink-soft">
          Semua produk di sini berasal dari sampah organik pasar Kabupaten
          Tangerang yang diolah mitra BSF kami. Harga langsung dari pengolah,
          tanpa perantara.
        </p>
      </header>

      <nav
        className="mt-10 flex flex-wrap gap-2"
        aria-label="Saring berdasarkan jenis produk"
      >
        {FILTERS.map((filter) => {
          const isActive = filter.value === activeFilter;
          return (
            <Link
              key={filter.value}
              href={
                filter.value === "semua"
                  ? "/katalog"
                  : `/katalog?jenis=${filter.value}`
              }
              aria-current={isActive ? "page" : undefined}
              className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                isActive
                  ? "border-brand bg-brand text-brand-contrast"
                  : "border-line text-ink-soft hover:bg-surface-sunken hover:text-ink"
              }`}
            >
              {filter.label}
            </Link>
          );
        })}
      </nav>

      {products.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title="Belum ada produk untuk jenis ini"
            description="Mitra pengolah sedang menyiapkan panen berikutnya. Coba lihat jenis produk lain atau kembali beberapa hari lagi."
            action={
              <ButtonLink href="/katalog" variant="ghost">
                Lihat semua produk
              </ButtonLink>
            }
          />
        </div>
      ) : (
        <>
          <p className="mt-8 text-sm text-ink-soft">
            Menampilkan {products.length} produk
          </p>
          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

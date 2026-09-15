import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { guardPage } from "@/lib/auth";
import { formatKg, formatRupiah } from "@/lib/format";
import { EmptyState } from "@/components/ui";
import { StockForm } from "./stock-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Produk Saya",
};

const TYPE_LABEL: Record<string, string> = {
  maggot_kering: "Maggot kering",
  maggot_segar: "Maggot segar",
  pupuk_kasgot: "Pupuk kasgot",
};

export default async function ProcessorProductsPage() {
  const user = await guardPage("PROCESSOR", "ADMIN");

  const profile = await db.processorProfile.findUnique({
    where: { userId: user.id },
  });

  // Pengelola melihat seluruh produk, mitra hanya melihat produknya sendiri.
  const products = await db.product.findMany({
    where:
      user.role === "ADMIN"
        ? {}
        : { processorId: profile?.id ?? "__tanpa_profil__" },
    include: { processor: { select: { unitName: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 md:py-16">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">
        Produk saya
      </h1>
      <p className="mt-3 max-w-[60ch] leading-relaxed text-ink-soft">
        Perbarui stok setiap selesai panen. Stok berkurang sendiri saat pesanan
        pembeli lunas, jadi angka di sini hanya perlu disesuaikan setelah panen
        atau penjualan di luar aplikasi.
      </p>

      <div className="mt-10">
        {products.length === 0 ? (
          <EmptyState
            title="Belum ada produk terdaftar"
            description="Produk hasil olahan Anda belum terdaftar di katalog. Hubungi pengelola LimbahBagus untuk menambahkan produk pertama."
          />
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {products.map((product) => (
              <li
                key={product.id}
                className="flex flex-col gap-4 py-6 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-[0.95rem] font-medium text-ink">
                    {product.name}
                  </p>
                  <p className="mt-1 text-sm text-ink-soft">
                    {TYPE_LABEL[product.type] ?? product.type}
                    {", "}
                    {formatRupiah(product.pricePerKg)} per kg
                    {", stok saat ini "}
                    {formatKg(product.stockKg)}
                    {user.role === "ADMIN"
                      ? `, ${product.processor.unitName}`
                      : ""}
                  </p>
                  {product.stockKg === 0 ? (
                    <p className="mt-1 text-xs text-danger">
                      Stok habis, produk tidak bisa dipesan pembeli.
                    </p>
                  ) : product.stockKg < 20 ? (
                    <p className="mt-1 text-xs text-warning">
                      Stok menipis, pembeli melihat peringatan di katalog.
                    </p>
                  ) : null}
                </div>

                <StockForm
                  productId={product.id}
                  stockKg={product.stockKg}
                  isActive={product.isActive}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-8 text-sm text-ink-soft">
        <Link href="/mitra" className="underline hover:text-ink">
          Kembali ke penjemputan masuk
        </Link>
      </p>
    </div>
  );
}

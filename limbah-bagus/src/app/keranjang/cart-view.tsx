"use client";

import Link from "next/link";
import { TrashIcon, WarningCircleIcon } from "@phosphor-icons/react/dist/ssr";
import {
  ButtonLink,
  Card,
  EmptyState,
  ErrorNote,
  InfoNote,
  SkeletonRow,
} from "@/components/ui";
import { useCartProducts } from "@/components/use-cart-products";
import { removeFromCart, updateQuantity } from "@/lib/cart";
import { formatKg, formatRupiah } from "@/lib/format";

export function CartView() {
  const { rows, total, loading, error, unavailableIds, hasStockProblem, isEmpty } =
    useCartProducts();

  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonRow className="h-28" />
        <SkeletonRow className="h-28" />
        <SkeletonRow className="h-14" />
      </div>
    );
  }

  if (error) {
    return <ErrorNote>{error}</ErrorNote>;
  }

  if (isEmpty || rows.length === 0) {
    return (
      <EmptyState
        title="Keranjang masih kosong"
        description="Pilih pakan maggot atau pupuk kasgot dari katalog, lalu jumlahnya bisa diatur di halaman ini sebelum membayar."
        action={<ButtonLink href="/katalog">Lihat Katalog</ButtonLink>}
      />
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem] lg:items-start">
      <div className="space-y-4">
        {unavailableIds.length > 0 ? (
          <InfoNote>
            {unavailableIds.length} produk di keranjang sudah tidak tersedia di
            katalog dan tidak ikut dihitung. Hapus dari daftar bila sudah tidak
            diperlukan.
          </InfoNote>
        ) : null}

        {rows.map((row) => (
          <Card key={row.product.id} className="p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <Link
                  href={`/katalog/${row.product.slug}`}
                  className="font-display text-lg font-semibold text-ink hover:text-accent"
                >
                  {row.product.name}
                </Link>
                <p className="mt-1 text-sm text-ink-soft">
                  {row.product.processorName}, {row.product.processorLocation}
                </p>
                <p className="mt-2 text-sm tabular-nums text-ink-soft">
                  {formatRupiah(row.product.pricePerKg)} per kg
                </p>
              </div>

              <div className="flex shrink-0 items-end gap-4">
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-ink">Jumlah (kg)</span>
                  <input
                    type="number"
                    min={1}
                    max={row.product.stockKg}
                    value={row.line.quantityKg}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      if (Number.isFinite(next)) {
                        updateQuantity(row.product.id, Math.max(0, Math.floor(next)));
                      }
                    }}
                    className="h-10 w-24 rounded-xl border border-line bg-surface-raised px-3 text-[0.95rem] tabular-nums text-ink focus:border-accent focus:outline-none"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => removeFromCart(row.product.id)}
                  aria-label={`Hapus ${row.product.name} dari keranjang`}
                  className="mb-0.5 grid h-10 w-10 place-items-center rounded-full border border-line text-ink-soft transition-colors hover:bg-surface-sunken hover:text-danger"
                >
                  <TrashIcon size={17} aria-hidden />
                </button>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
              <span className="text-sm text-ink-soft">
                Stok tersedia {formatKg(row.product.stockKg)}
              </span>
              <span className="font-display text-lg font-semibold tabular-nums text-ink">
                {formatRupiah(row.subtotal)}
              </span>
            </div>

            {row.exceedsStock ? (
              <p className="mt-3 flex items-start gap-2 text-sm text-danger">
                <WarningCircleIcon size={17} className="mt-0.5 shrink-0" aria-hidden />
                Jumlah melebihi stok. Turunkan menjadi maksimal{" "}
                {formatKg(row.product.stockKg)} untuk melanjutkan.
              </p>
            ) : null}
          </Card>
        ))}
      </div>

      <Card className="p-6 lg:sticky lg:top-24">
        <h2 className="font-display text-lg font-semibold text-ink">
          Ringkasan
        </h2>

        <dl className="mt-5 space-y-3 text-sm">
          {rows.map((row) => (
            <div key={row.product.id} className="flex justify-between gap-4">
              <dt className="min-w-0 truncate text-ink-soft">
                {row.product.name} ({row.line.quantityKg} kg)
              </dt>
              <dd className="shrink-0 tabular-nums text-ink">
                {formatRupiah(row.subtotal)}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-5 flex items-baseline justify-between border-t border-line pt-5">
          <span className="text-sm font-medium text-ink">Total</span>
          <span className="font-display text-2xl font-semibold tabular-nums text-ink">
            {formatRupiah(total)}
          </span>
        </div>

        {hasStockProblem ? (
          <p className="mt-4 text-sm text-danger">
            Perbaiki jumlah yang melebihi stok sebelum melanjutkan.
          </p>
        ) : (
          <ButtonLink href="/checkout" className="mt-6 w-full">
            Lanjut ke Pembayaran
          </ButtonLink>
        )}

        <p className="mt-4 text-xs leading-relaxed text-ink-soft">
          Ongkos kirim dan jadwal pengambilan dikonfirmasi mitra pengolah setelah
          pembayaran diterima.
        </p>
      </Card>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import { db } from "@/lib/db";
import { guardPage } from "@/lib/auth";
import { ButtonLink, EmptyState, StatusBadge } from "@/components/ui";
import { formatDateTime, formatRupiah } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pesanan Saya",
  description: "Riwayat pembelian pakan maggot dan pupuk kasgot.",
};

export default async function PesananPage() {
  const user = await guardPage("BUYER");

  const orders = await db.order.findMany({
    where: { buyerId: user.id },
    include: {
      payment: true,
      items: { include: { product: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-14">
      <header className="max-w-2xl">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">
          Pesanan Saya
        </h1>
        <p className="mt-3 leading-relaxed text-ink-soft">
          Status pembayaran diperbarui otomatis setelah konfirmasi dari
          Midtrans diterima.
        </p>
      </header>

      <div className="mt-10">
        {orders.length === 0 ? (
          <EmptyState
            title="Belum ada pesanan"
            description="Pembelian pakan maggot atau pupuk kasgot akan muncul di sini beserta status pembayarannya."
            action={<ButtonLink href="/katalog">Lihat Katalog</ButtonLink>}
          />
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface-raised">
            {orders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/pesanan/${order.id}`}
                  className="flex flex-col gap-4 px-5 py-5 transition-colors hover:bg-surface-sunken sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <StatusBadge status={order.payment?.status ?? order.status} />
                      <span className="text-xs text-ink-soft">
                        {formatDateTime(order.createdAt)}
                      </span>
                    </div>
                    <p className="mt-2 truncate text-sm text-ink">
                      {order.items
                        .map((item) => `${item.product.name} ${item.quantityKg} kg`)
                        .join(", ")}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-4">
                    <span className="font-display text-lg font-semibold tabular-nums text-ink">
                      {formatRupiah(order.totalAmount)}
                    </span>
                    <ArrowRightIcon
                      size={17}
                      className="text-ink-soft"
                      aria-hidden
                    />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

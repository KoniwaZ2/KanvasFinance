import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr";
import { db } from "@/lib/db";
import { guardPage } from "@/lib/auth";
import { Card, InfoNote, StatusBadge, SuccessNote } from "@/components/ui";
import { OrderQrisPanel } from "@/components/order-qris-panel";
import { formatDateTime, formatRupiah } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Detail Pesanan",
};

export default async function DetailPesananPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await guardPage("BUYER");

  const order = await db.order.findUnique({
    where: { id },
    include: {
      payment: true,
      items: {
        include: {
          product: {
            select: {
              name: true,
              slug: true,
              processor: { select: { unitName: true, location: true } },
            },
          },
        },
      },
    },
  });

  // Pesanan hanya boleh dibuka pemiliknya. notFound, bukan pesan ditolak,
  // supaya keberadaan pesanan pembeli lain tidak ikut bocor.
  if (!order || order.buyerId !== user.id) {
    notFound();
  }

  const payment = order.payment;
  const paymentStatus = payment?.status ?? "PENDING";
  const isPending = paymentStatus === "PENDING";
  const isPaid = paymentStatus === "SETTLEMENT";

  return (
    <div className="mx-auto max-w-3xl px-4 py-14">
      <Link
        href="/pesanan"
        className="inline-flex items-center gap-2 text-sm text-ink-soft transition-colors hover:text-ink"
      >
        <ArrowLeftIcon size={15} aria-hidden />
        Kembali ke daftar pesanan
      </Link>

      <header className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
            Pesanan {order.id.slice(-8).toUpperCase()}
          </h1>
          <p className="mt-2 text-sm text-ink-soft">
            Dibuat {formatDateTime(order.createdAt)}
          </p>
        </div>
        <StatusBadge status={paymentStatus} />
      </header>

      {isPending ? (
        <div className="mt-8">
          <Card className="p-6">
            <h2 className="font-display text-lg font-semibold text-ink">
              Selesaikan Pembayaran
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              Pembayaran hanya lewat QRIS. Pindai kodenya dari aplikasi bank
              atau e-wallet yang biasa Anda pakai.
            </p>

            <div className="mt-6">
              <OrderQrisPanel
                orderId={order.id}
                amount={order.totalAmount}
                midtransOrderId={payment?.midtransOrderId ?? null}
                qrisUrl={payment?.qrisUrl ?? null}
                expiryAt={payment?.expiryAt?.toISOString() ?? null}
              />
            </div>
          </Card>
        </div>
      ) : null}

      {isPaid ? (
        <div className="mt-8">
          <SuccessNote>
            Pembayaran QRIS sudah dikonfirmasi pada{" "}
            {payment?.paidAt ? formatDateTime(payment.paidAt) : "waktu tercatat"}
            . Mitra pengolah akan menghubungi Anda untuk jadwal pengiriman.
          </SuccessNote>
        </div>
      ) : null}

      {!isPending && !isPaid ? (
        <div className="mt-8">
          <InfoNote>
            Pesanan ini tidak dilanjutkan karena pembayaran tidak diselesaikan.
            Silakan buat pesanan baru dari katalog bila masih dibutuhkan.
          </InfoNote>
        </div>
      ) : null}

      <Card className="mt-8 p-6">
        <h2 className="font-display text-lg font-semibold text-ink">
          Rincian Produk
        </h2>

        <ul className="mt-5 divide-y divide-line">
          {order.items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-start justify-between gap-3 py-4 first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <Link
                  href={`/katalog/${item.product.slug}`}
                  className="font-medium text-ink hover:text-accent"
                >
                  {item.product.name}
                </Link>
                <p className="mt-1 text-sm text-ink-soft">
                  {item.product.processor.unitName},{" "}
                  {item.product.processor.location}
                </p>
                <p className="mt-1 text-sm tabular-nums text-ink-soft">
                  {item.quantityKg} kg x {formatRupiah(item.unitPrice)}
                </p>
              </div>
              <span className="shrink-0 tabular-nums font-medium text-ink">
                {formatRupiah(item.quantityKg * item.unitPrice)}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex items-baseline justify-between border-t border-line pt-5">
          <span className="text-sm font-medium text-ink">Total</span>
          <span className="font-display text-2xl font-semibold tabular-nums text-ink">
            {formatRupiah(order.totalAmount)}
          </span>
        </div>
      </Card>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <Card className="p-6">
          <h2 className="font-display text-base font-semibold text-ink">
            Dikirim ke
          </h2>
          <p className="mt-3 text-sm font-medium text-ink">
            {order.recipientName}
          </p>
          <p className="mt-1 text-sm tabular-nums text-ink-soft">
            {order.recipientPhone}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            {order.deliveryAddress}
          </p>
        </Card>

        <Card className="p-6">
          <h2 className="font-display text-base font-semibold text-ink">
            Pembayaran
          </h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-ink-soft">Nomor transaksi</dt>
              <dd className="tabular-nums text-ink">
                {payment?.midtransOrderId ?? "Belum ada"}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-soft">Metode</dt>
              <dd className="text-ink">QRIS</dd>
            </div>
            {payment?.expiryAt && !isPaid ? (
              <div className="flex justify-between gap-3">
                <dt className="text-ink-soft">Kode berlaku sampai</dt>
                <dd className="text-ink">{formatDateTime(payment.expiryAt)}</dd>
              </div>
            ) : null}
          </dl>
        </Card>
      </div>
    </div>
  );
}

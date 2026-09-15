import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, MapPinIcon, PhoneIcon } from "@phosphor-icons/react/dist/ssr";
import { db } from "@/lib/db";
import { guardPage } from "@/lib/auth";
import {
  formatDate,
  formatDateTime,
  formatKg,
  formatRupiah,
} from "@/lib/format";
import { processorTotal, weightVariancePct } from "@/lib/waste";
import {
  EmptyState,
  InfoNote,
  StatusBadge,
  SuccessNote,
} from "@/components/ui";
import { CancelPickupForm, WeighForm } from "./weigh-form";
import { PayPanel } from "./pay-panel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Rincian Penjemputan",
};

const METHOD_LABEL: Record<string, string> = {
  cash: "Tunai",
  qris: "QRIS",
};

export default async function PickupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await guardPage("PROCESSOR", "ADMIN");

  const purchase = await db.wastePurchase.findUnique({
    where: { id },
    include: {
      payment: true,
      processor: { select: { userId: true, unitName: true } },
      listing: {
        include: {
          tariff: true,
          trader: {
            include: { user: { select: { name: true, phone: true } } },
          },
        },
      },
    },
  });

  if (!purchase) notFound();
  if (user.role !== "ADMIN" && purchase.processor.userId !== user.id) {
    notFound();
  }

  const trader = purchase.listing.trader;
  const weighed = purchase.actualKg !== null && purchase.finalAmount !== null;
  const variance = weighed
    ? weightVariancePct(purchase.estimatedKg, purchase.actualKg ?? 0)
    : 0;
  const finalAmount = purchase.finalAmount ?? 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 md:py-16">
      <Link
        href="/mitra"
        className="inline-flex items-center gap-2 text-sm text-ink-soft transition-colors hover:text-ink"
      >
        <ArrowLeftIcon size={16} aria-hidden />
        Kembali ke daftar penjemputan
      </Link>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">
            {trader.businessName}
          </h1>
          <p className="mt-2 text-base text-ink-soft">
            {trader.marketName}, {purchase.listing.tariff.name}
          </p>
        </div>
        <StatusBadge status={purchase.status} />
      </div>

      <div className="mt-8 grid gap-6 rounded-xl border border-line bg-surface-raised p-5 sm:p-6 md:grid-cols-2">
        <div>
          <p className="flex items-start gap-2 text-base leading-relaxed text-ink">
            <MapPinIcon size={18} className="mt-1 shrink-0 text-ink-soft" aria-hidden />
            {trader.address}
          </p>

          {trader.user.phone ? (
            <a
              href={`tel:${trader.user.phone.replace(/\s+/g, "")}`}
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-line px-5 py-3 text-base font-medium text-ink transition-colors hover:bg-surface-sunken"
            >
              <PhoneIcon size={18} aria-hidden />
              Telepon {trader.user.name}
            </a>
          ) : (
            <p className="mt-4 text-sm text-ink-soft">
              Pedagang belum mencantumkan nomor telepon.
            </p>
          )}
        </div>

        <dl className="space-y-3 text-base md:border-l md:border-line md:pl-6">
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="text-ink-soft">Tanggal jemput</dt>
            <dd className="text-ink">{formatDate(purchase.pickupDate)}</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="text-ink-soft">Jenis sampah</dt>
            <dd className="text-right text-ink">
              {purchase.listing.tariff.name}
            </dd>
          </div>
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="text-ink-soft">Harga resmi per kg</dt>
            <dd className="tabular-nums text-ink">
              {formatRupiah(purchase.unitPricePerKg)}
            </dd>
          </div>
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="text-ink-soft">Perkiraan pedagang</dt>
            <dd className="tabular-nums text-ink">
              {formatKg(purchase.estimatedKg)}
            </dd>
          </div>
        </dl>
      </div>

      {weighed ? (
        <div className="mt-6 rounded-xl bg-surface-sunken px-5 py-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-ink-soft">Perkiraan pedagang</p>
              <p className="mt-1 text-lg font-medium tabular-nums text-ink-soft">
                {formatKg(purchase.estimatedKg)}
              </p>
            </div>
            <div>
              <p className="text-sm text-ink-soft">Hasil timbangan Anda</p>
              <p className="mt-1 text-lg font-medium tabular-nums text-ink">
                {formatKg(purchase.actualKg ?? 0)}
              </p>
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            {variance === 0
              ? "Timbangan pas dengan perkiraan pedagang."
              : `Timbangan ${variance > 0 ? "+" : ""}${variance} persen dari perkiraan. Selisih seperti ini biasa terjadi, nilai transaksi mengikuti timbangan.`}
          </p>
        </div>
      ) : null}

      <div className="mt-10">
        {purchase.status === "scheduled" ? (
          <>
            <WeighForm
              purchaseId={purchase.id}
              estimatedKg={purchase.estimatedKg}
              unitPricePerKg={purchase.unitPricePerKg}
              platformFee={purchase.platformFee}
            />

            <div className="mt-10 border-t border-line pt-6">
              <CancelPickupForm purchaseId={purchase.id} />
            </div>
          </>
        ) : null}

        {purchase.status === "weighed" ? (
          <PayPanel
            purchaseId={purchase.id}
            wasteAmount={finalAmount}
            platformFee={purchase.platformFee}
            midtransOrderId={purchase.payment?.midtransOrderId ?? null}
            paymentStatus={purchase.payment?.status ?? null}
            qrisUrl={purchase.payment?.qrisUrl ?? null}
            expiryAt={purchase.payment?.expiryAt?.toISOString() ?? null}
          />
        ) : null}

        {purchase.status === "awaiting_cash_confirmation" ? (
          <div className="space-y-4">
            <InfoNote>
              Anda sudah menandai pembayaran tunai sebesar{" "}
              <span className="tabular-nums">{formatRupiah(finalAmount)}</span>.
              Transaksi ditutup setelah pedagang mengonfirmasi uangnya diterima,
              jadi tidak ada lagi yang perlu Anda kerjakan di sini.
            </InfoNote>
            <p className="text-sm leading-relaxed text-ink-soft">
              Biaya layanan{" "}
              <span className="tabular-nums">
                {formatRupiah(purchase.platformFee)}
              </span>{" "}
              tercatat sebagai tagihan Anda karena uangnya tidak lewat aplikasi.
            </p>
          </div>
        ) : null}

        {purchase.status === "paid" ? (
          <div className="space-y-5">
            <SuccessNote>
              Penjemputan ini lunas. Pedagang menerima{" "}
              <span className="tabular-nums">{formatRupiah(finalAmount)}</span>{" "}
              dan total yang Anda bayar{" "}
              <span className="tabular-nums">
                {formatRupiah(processorTotal(finalAmount, purchase.platformFee))}
              </span>
              .
            </SuccessNote>

            <dl className="space-y-3 border-t border-line pt-5 text-base">
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="text-ink-soft">Cara bayar</dt>
                <dd className="text-ink">
                  {purchase.paymentMethod
                    ? (METHOD_LABEL[purchase.paymentMethod] ??
                      purchase.paymentMethod)
                    : "Tidak tercatat"}
                </dd>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="text-ink-soft">Waktu pembayaran</dt>
                <dd className="text-ink">
                  {purchase.paidAt
                    ? formatDateTime(purchase.paidAt)
                    : "Tidak tercatat"}
                </dd>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="text-ink-soft">Biaya layanan platform</dt>
                <dd className="text-right text-ink">
                  <span className="tabular-nums">
                    {formatRupiah(purchase.platformFee)}
                  </span>
                  {purchase.feeStatus === "collected"
                    ? ", sudah terpungut lewat QRIS"
                    : ", tertunggak dan ditagih berkala oleh pengelola"}
                </dd>
              </div>
              {purchase.payment?.midtransOrderId ? (
                <div className="flex flex-wrap justify-between gap-2">
                  <dt className="text-ink-soft">Nomor referensi</dt>
                  <dd className="tabular-nums text-ink">
                    {purchase.payment.midtransOrderId}
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>
        ) : null}

        {purchase.status === "cancelled" ? (
          <EmptyState
            title="Penjemputan ini dibatalkan"
            description={
              purchase.cancelReason
                ? `Alasan yang dicatat: ${purchase.cancelReason}. Lot sudah dikembalikan ke bursa.`
                : "Lot sudah dikembalikan ke bursa dan bisa diambil pengolah lain."
            }
          />
        ) : null}
      </div>
    </div>
  );
}

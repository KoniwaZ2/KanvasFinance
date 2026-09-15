import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr";
import { db } from "@/lib/db";
import { guardPage } from "@/lib/auth";
import { InfoNote, StatusBadge } from "@/components/ui";
import { PaymentStatusWatcher } from "@/components/payment-status-watcher";
import { OfficialPriceLine, PAYMENT_METHOD_LABEL } from "@/components/sale-card";
import {
  formatDate,
  formatDateTime,
  formatKg,
  formatRupiah,
} from "@/lib/format";
import { lotValue, readyWindowLabel, weightVariancePct } from "@/lib/waste";
import { ConfirmCashForm } from "./confirm-cash-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Rincian Penjualan",
};

type TimelineStep = {
  title: string;
  time: string | null;
  body: string;
  done: boolean;
};

export default async function PenjualanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await guardPage("TRADER");

  const listing = await db.wasteListing.findUnique({
    where: { id },
    include: {
      tariff: true,
      trader: { select: { userId: true } },
      purchase: {
        include: {
          processor: { select: { unitName: true, location: true } },
          payment: true,
          payout: true,
        },
      },
    },
  });

  // Lot milik orang lain diperlakukan seolah tidak ada, supaya keberadaan
  // datanya tidak bocor ke pedagang lain.
  if (!listing || listing.trader.userId !== user.id) {
    notFound();
  }

  const purchase = listing.purchase;
  const payment = purchase?.payment ?? null;
  const payout = purchase?.payout ?? null;

  const pricePerKg = purchase?.unitPricePerKg ?? listing.tariff.pricePerKg;
  const estimatedAmount =
    purchase?.estimatedAmount ?? lotValue(listing.tariff.pricePerKg, listing.estimatedKg);
  const weighed = purchase?.actualKg != null && purchase.finalAmount != null;
  const variance = weighed
    ? weightVariancePct(listing.estimatedKg, purchase?.actualKg ?? 0)
    : 0;

  const steps: TimelineStep[] = [
    {
      title: "Lot dipasang di bursa",
      time: formatDateTime(listing.createdAt),
      body: `${listing.tariff.name}, perkiraan ${formatKg(listing.estimatedKg)}, siap dijemput ${formatDate(listing.readyDate)} ${readyWindowLabel(listing.readyWindow).toLowerCase()}.`,
      done: true,
    },
    {
      title: "Diambil pengolah",
      time: purchase ? formatDateTime(purchase.createdAt) : null,
      body: purchase
        ? `${purchase.processor.unitName} di ${purchase.processor.location} mengambil lot ini dan menjemput pada ${formatDate(purchase.pickupDate)}.`
        : "Belum ada pengolah yang mengambil lot ini. Selama masih terbuka, lot Anda terus ditawarkan ke semua pengolah.",
      done: Boolean(purchase),
    },
    {
      title: "Ditimbang di lapak Anda",
      time: purchase?.weighedAt ? formatDateTime(purchase.weighedAt) : null,
      body: weighed
        ? `Perkiraan Anda ${formatKg(listing.estimatedKg)}, hasil timbangan ${formatKg(purchase?.actualKg ?? 0)}${
            variance === 0
              ? ". Perkiraan Anda pas."
              : `, selisih ${variance > 0 ? `+${variance}` : variance} persen. Selisih seperti ini wajar, bukan potongan.`
          }`
        : "Berat sebenarnya dicatat dengan timbangan di lapak Anda saat sampah dijemput. Berat itulah yang menentukan uangnya.",
      done: weighed,
    },
    {
      title: "Uang dibayar",
      time: purchase?.paidAt ? formatDateTime(purchase.paidAt) : null,
      body:
        purchase?.status === "paid"
          ? `Lunas lewat ${PAYMENT_METHOD_LABEL[purchase.paymentMethod ?? ""] ?? "pembayaran"}, sebesar ${formatRupiah(purchase.finalAmount ?? 0)}.`
          : purchase?.status === "awaiting_cash_confirmation"
            ? "Pengolah menyatakan sudah menyerahkan uang tunai. Menunggu Anda mengonfirmasi."
            : "Pembayaran dilakukan setelah sampah ditimbang, tunai di tempat atau lewat QRIS.",
      done: purchase?.status === "paid",
    },
  ];

  if (purchase?.paymentMethod === "qris" || payout) {
    steps.push({
      title: "Dicairkan ke rekening Anda",
      time: payout?.settledAt ? formatDateTime(payout.settledAt) : null,
      body: payout
        ? payout.status === "settled"
          ? `${formatRupiah(payout.amount)} sudah ditransfer ke ${payout.bankName} ${payout.accountNumber}${payout.reference ? `, referensi ${payout.reference}` : ""}.`
          : payout.status === "failed"
            ? `Pencairan gagal${payout.failureReason ? `: ${payout.failureReason}` : ""}. Pengelola akan menghubungi Anda.`
            : `${formatRupiah(payout.amount)} dijadwalkan cair ${formatDate(payout.scheduledAt)} ke ${payout.bankName} ${payout.accountNumber}. Transfer diproses pengelola, bukan otomatis.`
        : "Uang QRIS masuk ke rekening Anda satu hari setelah pembayaran diterima.",
      done: payout?.status === "settled",
    });
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:py-16">
      <Link
        href="/pedagang/penjualan"
        className="inline-flex items-center gap-2 text-sm text-ink-soft hover:text-ink"
      >
        <ArrowLeftIcon size={16} aria-hidden />
        Kembali ke daftar penjualan
      </Link>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">
            {listing.tariff.name}
          </h1>
          <p className="mt-2 text-ink-soft">
            Dipasang {formatDate(listing.createdAt)}
          </p>
        </div>
        <StatusBadge status={purchase ? purchase.status : listing.status} />
      </div>

      {purchase?.status === "awaiting_cash_confirmation" ? (
        <section className="mt-10 rounded-xl border border-warning/40 bg-warning-soft p-5 sm:p-6">
          <h2 className="font-display text-lg font-semibold text-ink">
            Uang tunai sudah Anda terima?
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            {purchase.processor.unitName} menyatakan sudah menyerahkan uang tunai
            sebesar angka di bawah ini.
          </p>
          <p className="mt-4 font-display text-4xl font-semibold tabular-nums tracking-tight text-ink sm:text-5xl">
            {formatRupiah(purchase.finalAmount ?? 0)}
          </p>
          <div className="mt-5">
            <ConfirmCashForm purchaseId={purchase.id} />
          </div>
        </section>
      ) : null}

      {payment && purchase?.paymentMethod === "qris" && payment.status === "PENDING" ? (
        <section className="mt-10 space-y-4">
          <h2 className="font-display text-lg font-semibold text-ink">
            Pembayaran QRIS sedang diproses
          </h2>
          <p className="text-sm leading-relaxed text-ink-soft">
            Pengolah sudah memindai kode QRIS. Uangnya sedang diperiksa, halaman
            ini memperbarui sendiri begitu pembayaran masuk.
          </p>
          <PaymentStatusWatcher
            midtransOrderId={payment.midtransOrderId}
            currentStatus={payment.status}
          />
        </section>
      ) : null}

      <section className="mt-10 rounded-xl border border-line bg-surface-raised p-5 sm:p-6">
        <h2 className="font-display text-lg font-semibold text-ink">
          Perhitungan uang
        </h2>

        <div className="mt-5 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-ink-soft">Perkiraan Anda</p>
            <p className="mt-1 font-medium tabular-nums text-ink-soft">
              {formatKg(listing.estimatedKg)}
            </p>
            <p className="mt-1 text-sm tabular-nums text-ink-soft">
              {formatRupiah(estimatedAmount)}
            </p>
          </div>
          <div>
            <p className="text-xs text-ink-soft">Hasil timbangan</p>
            <p className="mt-1 font-medium tabular-nums text-ink">
              {weighed ? formatKg(purchase?.actualKg ?? 0) : "Belum ditimbang"}
            </p>
            <p className="mt-1 text-sm tabular-nums text-ink-soft">
              {weighed ? formatRupiah(purchase?.finalAmount ?? 0) : "Menunggu penjemputan"}
            </p>
          </div>
        </div>

        <div className="mt-6 border-t border-line pt-5">
          <p className="text-xs text-ink-soft">
            {weighed ? "Nilai akhir penjualan" : "Perkiraan nilai penjualan"}
          </p>
          <p className="mt-1 font-display text-4xl font-semibold tabular-nums tracking-tight text-ink sm:text-5xl">
            {formatRupiah(weighed ? purchase?.finalAmount ?? 0 : estimatedAmount)}
          </p>
          {!weighed ? (
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              Masih perkiraan. Angka final mengikuti timbangan di lokasi.
            </p>
          ) : null}
        </div>

        <div className="mt-5">
          <OfficialPriceLine pricePerKg={pricePerKg} />
        </div>

        {listing.note ? (
          <p className="mt-5 text-sm leading-relaxed text-ink-soft">
            Catatan Anda: {listing.note}
          </p>
        ) : null}
      </section>

      <section className="mt-12">
        <h2 className="font-display text-lg font-semibold text-ink">
          Runtut kejadian
        </h2>

        <ol className="mt-6 space-y-6">
          {steps.map((step) => (
            <li key={step.title} className="flex gap-4">
              <span
                className={`mt-1.5 h-3 w-3 shrink-0 rounded-full border-2 ${
                  step.done
                    ? "border-success bg-success"
                    : "border-line bg-surface"
                }`}
                aria-hidden
              />
              <div className="min-w-0">
                <p
                  className={`font-medium ${step.done ? "text-ink" : "text-ink-soft"}`}
                >
                  {step.title}
                </p>
                {step.time ? (
                  <p className="mt-1 text-xs tabular-nums text-ink-soft">
                    {step.time}
                  </p>
                ) : null}
                <p className="mt-1 max-w-[60ch] text-sm leading-relaxed text-ink-soft">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {purchase?.status === "paid" && purchase.paymentMethod === "qris" ? (
        <div className="mt-10">
          <InfoNote>
            Pencairan ke rekening dicatat dan diproses pengelola LimbahBagus,
            belum otomatis. Kalau dana belum masuk sesudah tanggal yang
            dijadwalkan, hubungi pengelola lewat petugas pasar.{" "}
            <Link
              href="/pedagang/pencairan"
              className="font-medium text-ink underline"
            >
              Lihat riwayat pencairan
            </Link>
          </InfoNote>
        </div>
      ) : null}

      {purchase?.status === "cancelled" ? (
        <div className="mt-10">
          <InfoNote>
            Penjemputan ini dibatalkan pengolah
            {purchase.cancelReason ? ` dengan alasan: ${purchase.cancelReason}` : ""}.
            Sampah Anda tidak hilang, lotnya dikembalikan ke bursa supaya bisa
            diambil pengolah lain.
          </InfoNote>
        </div>
      ) : null}
    </div>
  );
}

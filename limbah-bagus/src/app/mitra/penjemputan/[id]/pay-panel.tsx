"use client";

import { useActionState, useState } from "react";
import { payCashAction, type PurchaseState } from "@/app/actions/purchase";
import { QrisPaymentPanel } from "@/components/qris-payment-panel";
import { Button, ErrorNote, InfoNote, SuccessNote } from "@/components/ui";
import { formatRupiah } from "@/lib/format";

const initialState: PurchaseState = {};

type Choice = "none" | "cash" | "qris";

/**
 * Layar pembayaran di lokasi penjemputan.
 *
 * Dua cara bayar ditawarkan setara, tidak ada yang disembunyikan di balik menu:
 * tunai adalah kebiasaan pasar, QRIS yang membuat uangnya tercatat. Pengolah
 * memilih satu, dan pilihan itu baru mengubah apa pun setelah dikonfirmasi.
 */
export function PayPanel({
  purchaseId,
  wasteAmount,
  platformFee,
  midtransOrderId,
  paymentStatus,
  qrisUrl,
  expiryAt,
}: {
  purchaseId: string;
  wasteAmount: number;
  platformFee: number;
  midtransOrderId: string | null;
  paymentStatus: string | null;
  qrisUrl: string | null;
  expiryAt: string | null;
}) {
  const hasPendingQris = paymentStatus === "PENDING" && Boolean(qrisUrl);
  const [choice, setChoice] = useState<Choice>(hasPendingQris ? "qris" : "none");
  const [state, formAction, pending] = useActionState(
    payCashAction,
    initialState,
  );

  const total = wasteAmount + platformFee;

  if (state.ok) {
    return <SuccessNote>{state.ok}</SuccessNote>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-line bg-surface-raised p-5 sm:p-6">
        <h2 className="font-display text-xl font-semibold text-ink">
          Bayar di tempat
        </h2>

        <dl className="mt-5 space-y-3 border-t border-line pt-4 text-base">
          <div className="flex justify-between gap-3">
            <dt className="text-ink-soft">Nilai sampah untuk pedagang</dt>
            <dd className="tabular-nums text-ink">
              {formatRupiah(wasteAmount)}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ink-soft">Biaya layanan platform</dt>
            <dd className="tabular-nums text-ink">
              {formatRupiah(platformFee)}
            </dd>
          </div>
        </dl>

        <p className="mt-5 text-sm text-ink-soft">Total yang Anda bayar</p>
        <p className="font-display text-4xl font-semibold tabular-nums tracking-tight text-ink md:text-5xl">
          {formatRupiah(total)}
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Button
            type="button"
            size="lg"
            variant={choice === "cash" ? "primary" : "ghost"}
            onClick={() => setChoice("cash")}
            className="w-full"
          >
            Bayar Tunai
          </Button>
          <Button
            type="button"
            size="lg"
            variant={choice === "qris" ? "primary" : "ghost"}
            onClick={() => setChoice("qris")}
            className="w-full"
          >
            Bayar dengan QRIS
          </Button>
        </div>

        {choice === "none" ? (
          <p className="mt-4 text-sm leading-relaxed text-ink-soft">
            Pilih salah satu cara bayar untuk melanjutkan. Selama belum dipilih,
            tidak ada yang tercatat.
          </p>
        ) : null}
      </div>

      {choice === "cash" ? (
        <form
          action={formAction}
          className="rounded-xl border border-line bg-surface-raised p-5 sm:p-6"
        >
          <input type="hidden" name="purchaseId" value={purchaseId} />

          <h3 className="font-display text-lg font-semibold text-ink">
            Bayar tunai
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Serahkan{" "}
            <span className="tabular-nums">{formatRupiah(wasteAmount)}</span>{" "}
            kepada pedagang sekarang, lalu tandai di sini. Transaksi belum
            dinyatakan lunas sampai pedagang mengonfirmasi sendiri bahwa uangnya
            sudah diterima.
          </p>

          <div className="mt-4">
            <InfoNote>
              Biaya layanan{" "}
              <span className="tabular-nums">{formatRupiah(platformFee)}</span>{" "}
              tidak ikut lewat aplikasi pada pembayaran tunai, jadi tercatat
              sebagai tagihan Anda dan ditagih berkala oleh pengelola.
            </InfoNote>
          </div>

          {state.error ? (
            <div className="mt-4">
              <ErrorNote>{state.error}</ErrorNote>
            </div>
          ) : null}

          <Button
            type="submit"
            size="lg"
            disabled={pending}
            className="mt-5 w-full sm:w-auto"
          >
            {pending ? "Mencatat" : "Saya Sudah Serahkan Uang Tunai"}
          </Button>
        </form>
      ) : null}

      {choice === "qris" ? (
        <QrisPaymentPanel
          purchaseId={purchaseId}
          wasteAmount={wasteAmount}
          platformFee={platformFee}
          midtransOrderId={midtransOrderId}
          status={paymentStatus}
          qrisUrl={qrisUrl}
          expiryAt={expiryAt}
        />
      ) : null}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorNote, InfoNote, SuccessNote } from "@/components/ui";
import { QrisCode } from "@/components/qris-code";
import { formatRupiah } from "@/lib/format";

/**
 * Panel pembayaran QRIS untuk satu pembelian sampah yang sudah ditimbang.
 *
 * Nominal tidak pernah dihitung di sini. Panel hanya meminta server menerbitkan
 * kode lewat POST /api/payments/waste, lalu menampilkan angka yang dikembalikan
 * server. Status pembayaran juga hanya boleh datang dari server: komponen ini
 * tidak pernah menyimpulkan sendiri bahwa uangnya sudah masuk.
 */

type IssueResponse = {
  midtransOrderId?: string;
  qrisUrl?: string | null;
  amount?: number;
  wasteAmount?: number;
  platformFee?: number;
  expiryAt?: string | null;
  message?: string;
};

export type QrisPaymentPanelProps = {
  purchaseId: string;
  wasteAmount: number;
  platformFee: number;
  /** Pembayaran yang sudah pernah diterbitkan untuk pembelian ini, kalau ada. */
  midtransOrderId?: string | null;
  status?: string | null;
  qrisUrl?: string | null;
  expiryAt?: string | null;
};

export function QrisPaymentPanel({
  purchaseId,
  wasteAmount,
  platformFee,
  midtransOrderId = null,
  status = null,
  qrisUrl = null,
  expiryAt = null,
}: QrisPaymentPanelProps) {
  const router = useRouter();

  const [issuing, setIssuing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<{
    midtransOrderId: string;
    qrisUrl: string | null;
    amount: number;
    expiryAt: string | null;
  } | null>(
    midtransOrderId && qrisUrl
      ? {
          midtransOrderId,
          qrisUrl,
          amount: wasteAmount + platformFee,
          expiryAt,
        }
      : null,
  );
  const [now, setNow] = useState(() => Date.now());

  const paymentStatus = code?.midtransOrderId === midtransOrderId ? status : "PENDING";
  const settled = paymentStatus === "SETTLEMENT";
  const total = wasteAmount + platformFee;

  // Jam dinding dipakai hanya untuk menandai kode yang lewat masa berlaku,
  // bukan untuk menentukan status pembayaran.
  useEffect(() => {
    if (!code?.expiryAt || settled) return;

    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [code?.expiryAt, settled]);

  const expired =
    !settled &&
    code?.expiryAt !== null &&
    code?.expiryAt !== undefined &&
    new Date(code.expiryAt).getTime() <= now;

  const issue = useCallback(async () => {
    setIssuing(true);
    setError(null);

    try {
      const response = await fetch("/api/payments/waste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purchaseId }),
      });

      const payload = (await response
        .json()
        .catch(() => null)) as IssueResponse | null;

      if (!response.ok || !payload) {
        setError(
          payload?.message ??
            "Kode QRIS belum bisa dibuat. Coba lagi, atau selesaikan dengan pembayaran tunai.",
        );
        return;
      }

      if (!payload.midtransOrderId || !payload.qrisUrl) {
        setError(
          "Kode QRIS terbit tanpa gambar QR. Muat ulang halaman, atau bayar tunai untuk penjemputan ini.",
        );
        return;
      }

      setCode({
        midtransOrderId: payload.midtransOrderId,
        qrisUrl: payload.qrisUrl,
        amount: payload.amount ?? total,
        expiryAt: payload.expiryAt ?? null,
      });
      setNow(Date.now());
      router.refresh();
    } catch {
      setError("Koneksi terputus. Periksa jaringan lalu coba lagi.");
    } finally {
      setIssuing(false);
    }
  }, [purchaseId, router, total]);

  if (settled) {
    return (
      <div className="rounded-xl border border-line bg-surface-raised p-5 sm:p-6">
        <SuccessNote>
          Pembayaran QRIS sebesar{" "}
          <span className="tabular-nums">{formatRupiah(total)}</span> sudah
          dikonfirmasi. Uang pedagang masuk antrean pencairan ke rekeningnya.
        </SuccessNote>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-line bg-surface-raised p-5 sm:p-6">
      <h3 className="font-display text-lg font-semibold text-ink">
        Bayar dengan QRIS
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        Pedagang memindai kode dari ponsel Anda. Uangnya masuk ke rekening
        pedagang lewat pencairan, dan biaya layanan langsung ikut terpungut.
      </p>

      <dl className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-ink-soft">Nilai sampah</dt>
          <dd className="tabular-nums text-ink">{formatRupiah(wasteAmount)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-ink-soft">Biaya layanan platform</dt>
          <dd className="tabular-nums text-ink">{formatRupiah(platformFee)}</dd>
        </div>
      </dl>

      <p className="mt-4 text-sm text-ink-soft">Total yang Anda bayar</p>
      <p className="font-display text-3xl font-semibold tabular-nums tracking-tight text-ink sm:text-4xl">
        {formatRupiah(code?.amount ?? total)}
      </p>

      {code && code.qrisUrl && !expired ? (
        <div className="mt-6">
          <QrisCode
            midtransOrderId={code.midtransOrderId}
            qrisUrl={code.qrisUrl}
            expiryAt={code.expiryAt}
            note="Jangan tutup halaman ini sampai statusnya berubah. Penjemputan baru dinyatakan lunas setelah server menerima konfirmasi pembayaran."
          />
        </div>
      ) : null}

      {code && expired ? (
        <div className="mt-6 space-y-4">
          <InfoNote>
            Kode QRIS ini sudah lewat masa berlaku dan tidak bisa dipindai lagi.
            Terbitkan kode baru, atau selesaikan dengan pembayaran tunai.
          </InfoNote>
          <Button
            type="button"
            size="lg"
            onClick={issue}
            disabled={issuing}
            className="w-full sm:w-auto"
          >
            {issuing ? "Menerbitkan kode" : "Terbitkan Ulang Kode QRIS"}
          </Button>
        </div>
      ) : null}

      {!code ? (
        <div className="mt-6">
          <Button
            type="button"
            size="lg"
            onClick={issue}
            disabled={issuing}
            className="w-full sm:w-auto"
          >
            {issuing ? "Menyiapkan kode" : "Tampilkan Kode QRIS"}
          </Button>
        </div>
      ) : null}

      {error ? (
        <div className="mt-5">
          <ErrorNote>{error}</ErrorNote>
        </div>
      ) : null}
    </div>
  );
}

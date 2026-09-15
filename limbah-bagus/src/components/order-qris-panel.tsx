"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ErrorNote, InfoNote } from "@/components/ui";
import { QrisCode } from "@/components/qris-code";
import { formatRupiah } from "@/lib/format";

/**
 * Pembayaran satu pesanan katalog.
 *
 * QRIS satu-satunya metode, jadi tidak ada langkah memilih cara bayar: kode QR
 * langsung tampil begitu pesanan dibuat. Panel hanya menampilkan angka dan kode
 * yang diberikan server; status pembayaran tidak pernah disimpulkan di sini.
 */

type IssueResponse = {
  midtransOrderId?: string;
  qrisUrl?: string | null;
  amount?: number;
  expiryAt?: string | null;
  message?: string;
};

export function OrderQrisPanel({
  orderId,
  amount,
  midtransOrderId,
  qrisUrl,
  expiryAt,
}: {
  orderId: string;
  amount: number;
  midtransOrderId: string | null;
  qrisUrl: string | null;
  expiryAt: string | null;
}) {
  const router = useRouter();

  const [issuing, setIssuing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<{
    midtransOrderId: string;
    qrisUrl: string;
    expiryAt: string | null;
  } | null>(
    midtransOrderId && qrisUrl
      ? { midtransOrderId, qrisUrl, expiryAt }
      : null,
  );
  const [now, setNow] = useState(() => Date.now());

  // Jam dinding hanya menandai kode yang lewat masa berlaku. Status pembayaran
  // tetap urusan server.
  useEffect(() => {
    if (!code?.expiryAt) return;

    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, [code?.expiryAt]);

  const expired =
    code?.expiryAt != null && new Date(code.expiryAt).getTime() <= now;

  const issue = useCallback(async () => {
    setIssuing(true);
    setError(null);

    try {
      const response = await fetch("/api/payments/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });

      const payload = (await response
        .json()
        .catch(() => null)) as IssueResponse | null;

      if (!response.ok || !payload) {
        setError(
          payload?.message ??
            "Kode QRIS belum bisa dibuat. Coba lagi sebentar lagi.",
        );
        return;
      }

      if (!payload.midtransOrderId || !payload.qrisUrl) {
        setError(
          "Kode QRIS terbit tanpa gambar QR. Muat ulang halaman ini untuk mencoba lagi.",
        );
        return;
      }

      setCode({
        midtransOrderId: payload.midtransOrderId,
        qrisUrl: payload.qrisUrl,
        expiryAt: payload.expiryAt ?? null,
      });
      setNow(Date.now());
      router.refresh();
    } catch {
      setError("Koneksi terputus. Periksa jaringan lalu coba lagi.");
    } finally {
      setIssuing(false);
    }
  }, [orderId, router]);

  return (
    <div>
      <p className="text-sm text-ink-soft">Total yang harus dibayar</p>
      <p className="font-display text-3xl font-semibold tabular-nums tracking-tight text-ink sm:text-4xl">
        {formatRupiah(amount)}
      </p>

      {code && !expired ? (
        <div className="mt-6">
          <QrisCode
            midtransOrderId={code.midtransOrderId}
            qrisUrl={code.qrisUrl}
            expiryAt={code.expiryAt}
            note="Pindai kode ini dari aplikasi bank atau e-wallet apa pun yang mendukung QRIS. Status pesanan berubah sendiri begitu pembayaran dikonfirmasi, tidak perlu mengunggah bukti transfer."
          />
        </div>
      ) : null}

      {code && expired ? (
        <div className="mt-6 space-y-4">
          <InfoNote>
            Kode QRIS ini sudah lewat masa berlaku dan tidak bisa dipindai lagi.
            Terbitkan kode baru untuk pesanan yang sama, isi pesanannya tidak
            berubah.
          </InfoNote>
          <Button type="button" size="lg" onClick={issue} disabled={issuing}>
            {issuing ? "Menerbitkan kode" : "Terbitkan Ulang Kode QRIS"}
          </Button>
        </div>
      ) : null}

      {!code ? (
        <div className="mt-6">
          <Button type="button" size="lg" onClick={issue} disabled={issuing}>
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

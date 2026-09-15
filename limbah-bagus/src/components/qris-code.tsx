"use client";

import { PaymentStatusWatcher } from "@/components/payment-status-watcher";
import { formatDateTime } from "@/lib/format";

/**
 * Tampilan satu kode QRIS yang masih menunggu dibayar.
 *
 * Dipakai bersama oleh pembayaran sampah di lokasi penjemputan dan checkout
 * e-katalog, supaya kedua alur menampilkan hal yang sama persis: gambar QR,
 * nomor referensi, masa berlaku, dan pemantau status.
 *
 * Komponen ini tidak pernah menyimpulkan pembayaran berhasil. Status hanya
 * berubah kalau server bilang begitu.
 */
export function QrisCode({
  midtransOrderId,
  qrisUrl,
  expiryAt,
  note,
}: {
  midtransOrderId: string;
  qrisUrl: string;
  expiryAt: string | null;
  note: string;
}) {
  return (
    <div>
      <div className="mx-auto w-full max-w-[280px] rounded-xl border border-line bg-surface-raised p-4">
        {/* Gambar QR dilayani domain Midtrans yang tidak terdaftar di
            next.config.ts, jadi sengaja tidak lewat next/image. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrisUrl}
          alt="Kode QRIS untuk pembayaran ini"
          width={512}
          height={512}
          className="h-auto w-full"
        />
      </div>

      <p className="mt-4 text-center text-sm text-ink-soft">
        Nomor referensi <span className="tabular-nums">{midtransOrderId}</span>
      </p>

      {expiryAt ? (
        <p className="mt-1 text-center text-sm text-ink-soft">
          Berlaku sampai {formatDateTime(expiryAt)}
        </p>
      ) : null}

      <div className="mt-5">
        <PaymentStatusWatcher
          midtransOrderId={midtransOrderId}
          currentStatus="PENDING"
        />
      </div>

      <p className="mt-4 text-sm leading-relaxed text-ink-soft">{note}</p>
    </div>
  );
}

"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 text-center">
      <h1 className="font-display text-2xl font-semibold text-ink">
        Terjadi gangguan di halaman ini
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">
        Data Anda aman. Coba muat ulang halaman. Kalau masalahnya berlanjut,
        status transaksi tetap bisa diperiksa dari halaman pesanan atau tagihan.
      </p>
      <button
        onClick={reset}
        className="mt-8 inline-flex h-11 items-center rounded-full bg-accent px-6 text-[0.95rem] font-medium text-white transition-colors hover:bg-accent-hover"
      >
        Muat ulang halaman
      </button>
    </div>
  );
}

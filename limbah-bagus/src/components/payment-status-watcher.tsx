"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowsClockwiseIcon } from "@phosphor-icons/react/dist/ssr";

/**
 * Auto-check status pembayaran.
 *
 * Selama status di database masih PENDING, komponen ini memanggil
 * /api/payments/status/{midtransOrderId} setiap 5 detik. Endpoint itulah yang
 * menanyakan status sebenarnya ke Midtrans lalu menyinkronkan database, jadi
 * pembayaran tetap terkonfirmasi walaupun notifikasi webhook tidak sampai.
 *
 * Komponen ini tidak pernah menentukan status sendiri. Ia hanya memicu
 * router.refresh() supaya halaman membaca ulang status dari database.
 */

const POLL_INTERVAL_MS = 5_000;
const MAX_POLL_DURATION_MS = 5 * 60 * 1000;

export function PaymentStatusWatcher({
  midtransOrderId,
  currentStatus,
}: {
  midtransOrderId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);
  // Jam mulai dicatat saat efek berjalan, bukan saat render, supaya render tetap murni.
  const startedAtRef = useRef<number | null>(null);

  const isPending = currentStatus === "PENDING";

  const checkOnce = useCallback(async (): Promise<string | null> => {
    const response = await fetch(
      `/api/payments/status/${encodeURIComponent(midtransOrderId)}`,
      { cache: "no-store" },
    );

    if (!response.ok) return null;

    const data = (await response.json()) as { status?: string };
    return data.status ?? null;
  }, [midtransOrderId]);

  useEffect(() => {
    if (!isPending) return;

    startedAtRef.current = Date.now();

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      if (cancelled) return;

      if (Date.now() - (startedAtRef.current ?? Date.now()) > MAX_POLL_DURATION_MS) {
        setTimedOut(true);
        return;
      }

      setChecking(true);

      try {
        const status = await checkOnce();

        if (!cancelled && status && status !== currentStatus) {
          // Status berubah di database, muat ulang halaman untuk membacanya.
          router.refresh();
          return;
        }
      } catch {
        // Gangguan jaringan sesaat tidak menghentikan pemantauan.
      } finally {
        if (!cancelled) setChecking(false);
      }

      timer = setTimeout(tick, POLL_INTERVAL_MS);
    };

    timer = setTimeout(tick, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [isPending, currentStatus, checkOnce, router]);

  const checkManually = useCallback(async () => {
    setManualError(null);
    setChecking(true);

    try {
      const status = await checkOnce();
      startedAtRef.current = Date.now();
      setTimedOut(false);

      if (status && status !== currentStatus) {
        router.refresh();
      }
    } catch {
      setManualError("Status belum bisa diperiksa. Coba lagi sebentar lagi.");
    } finally {
      setChecking(false);
    }
  }, [checkOnce, currentStatus, router]);

  if (!isPending) return null;

  return (
    <div className="rounded-xl border border-line bg-surface-sunken px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-soft">
          {timedOut
            ? "Pemantauan otomatis dihentikan sementara."
            : checking
              ? "Memeriksa status pembayaran ke Midtrans."
              : "Status pembayaran dipantau otomatis setiap 5 detik."}
        </p>

        <button
          type="button"
          onClick={checkManually}
          disabled={checking}
          className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-raised px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-sunken disabled:opacity-55"
        >
          <ArrowsClockwiseIcon
            size={15}
            className={checking ? "animate-spin" : undefined}
            aria-hidden
          />
          Periksa Sekarang
        </button>
      </div>

      {timedOut ? (
        <p className="mt-2 text-xs leading-relaxed text-ink-soft">
          Pembayaran yang sudah dibayar tetap terkonfirmasi otomatis di latar
          belakang. Muat ulang halaman atau tekan Periksa Sekarang untuk melihat
          status terbaru.
        </p>
      ) : null}

      {manualError ? (
        <p className="mt-2 text-xs text-danger">{manualError}</p>
      ) : null}
    </div>
  );
}

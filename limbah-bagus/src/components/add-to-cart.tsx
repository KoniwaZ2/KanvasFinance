"use client";

import { useEffect, useRef, useState } from "react";
import { MinusIcon, PlusIcon, CheckIcon } from "@phosphor-icons/react/dist/ssr";
import { addToCart } from "@/lib/cart";
import { formatRupiah } from "@/lib/format";

/**
 * Pemilih jumlah kilogram plus aksi tambah ke keranjang.
 * Batas atas selalu mengikuti stok yang tercatat di database.
 */
export function AddToCart({
  productId,
  stockKg,
  pricePerKg,
  defaultQty = 10,
  size = "compact",
  showSubtotal = false,
}: {
  productId: string;
  stockKg: number;
  pricePerKg: number;
  defaultQty?: number;
  size?: "compact" | "full";
  showSubtotal?: boolean;
}) {
  const outOfStock = stockKg <= 0;
  const maxQty = Math.max(1, stockKg);
  const [qty, setQty] = useState(Math.min(defaultQty, maxQty));
  const [added, setAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function clamp(next: number) {
    if (Number.isNaN(next)) return 1;
    return Math.min(Math.max(1, Math.round(next)), maxQty);
  }

  function handleAdd() {
    if (outOfStock) return;
    addToCart(productId, qty);
    setAdded(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setAdded(false), 2200);
  }

  if (outOfStock) {
    return (
      <button
        type="button"
        disabled
        className="h-11 w-full cursor-not-allowed rounded-full border border-line bg-surface-sunken px-6 text-[0.95rem] font-medium text-ink-soft"
      >
        Stok Habis
      </button>
    );
  }

  const stepperSize = size === "full" ? "h-12" : "h-11";
  const full = size === "full";

  return (
    <div className={full ? "space-y-4" : "space-y-3"}>
      {/*
        Di kartu katalog lebar kolom bisa turun sampai sekitar 250 piksel,
        tidak cukup untuk menaruh stepper dan tombol dalam satu baris tanpa
        keduanya saling dorong. Susunan bertumpuk dipakai di ukuran compact.
      */}
      <div
        className={
          full ? "flex items-stretch gap-2" : "flex flex-col items-stretch gap-2"
        }
      >
        <div
          className={`flex ${stepperSize} items-center rounded-full border border-line bg-surface-raised ${
            full ? "shrink-0" : "w-full justify-between"
          }`}
        >
          <button
            type="button"
            onClick={() => setQty((current) => clamp(current - 5))}
            disabled={qty <= 1}
            aria-label="Kurangi 5 kilogram"
            className="grid h-full w-10 place-items-center rounded-l-full text-ink transition-colors hover:bg-surface-sunken disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <MinusIcon size={15} aria-hidden />
          </button>

          <label className="sr-only" htmlFor={`qty-${productId}`}>
            Jumlah dalam kilogram
          </label>
          <div
            className={`flex items-baseline justify-center gap-1 ${
              full ? "" : "min-w-0 flex-1"
            }`}
          >
            <input
              id={`qty-${productId}`}
              type="number"
              inputMode="numeric"
              value={qty}
              min={1}
              max={maxQty}
              onChange={(event) => setQty(clamp(Number(event.target.value)))}
              className={`border-none bg-transparent text-right text-[0.95rem] font-medium tabular-nums text-ink focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
                full ? "w-10" : "w-12"
              }`}
            />
            <span className="text-xs text-ink-soft">kg</span>
          </div>

          <button
            type="button"
            onClick={() => setQty((current) => clamp(current + 5))}
            disabled={qty >= maxQty}
            aria-label="Tambah 5 kilogram"
            className="grid h-full w-10 place-items-center rounded-r-full text-ink transition-colors hover:bg-surface-sunken disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <PlusIcon size={15} aria-hidden />
          </button>
        </div>

        <button
          type="button"
          onClick={handleAdd}
          className={`inline-flex ${stepperSize} ${
            full ? "flex-1" : "w-full"
          } items-center justify-center gap-2 rounded-full px-4 text-[0.95rem] font-medium whitespace-nowrap transition-colors duration-200 active:scale-[0.98] ${
            added
              ? "bg-success-soft text-success"
              : "bg-accent text-white hover:bg-accent-hover"
          }`}
        >
          {added ? (
            <>
              <CheckIcon size={16} weight="bold" aria-hidden />
              Ditambahkan
            </>
          ) : (
            "Tambah ke Keranjang"
          )}
        </button>
      </div>

      {showSubtotal ? (
        <p className="text-sm text-ink-soft">
          Subtotal{" "}
          <span className="font-medium tabular-nums text-ink">
            {formatRupiah(pricePerKg * qty)}
          </span>{" "}
          untuk {qty} kg
        </p>
      ) : null}
    </div>
  );
}

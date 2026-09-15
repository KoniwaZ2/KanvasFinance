"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { ShoppingBagIcon } from "@phosphor-icons/react/dist/ssr";
import { cartCount, subscribeToCart } from "@/lib/cart";

export function CartIndicator() {
  // Keranjang hidup di localStorage, di luar React. useSyncExternalStore adalah
  // cara yang benar untuk membacanya tanpa menimbulkan ketidakcocokan hidrasi.
  const count = useSyncExternalStore(
    subscribeToCart,
    cartCount,
    () => 0, // di server keranjang selalu kosong
  );

  return (
    <Link
      href="/keranjang"
      className="relative grid h-9 w-9 place-items-center rounded-full border border-line text-ink transition-colors hover:bg-surface-sunken"
      aria-label={
        count > 0 ? `Keranjang, ${count} produk` : "Keranjang belanja, kosong"
      }
    >
      <ShoppingBagIcon size={18} weight="regular" aria-hidden />
      {count > 0 ? (
        <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-semibold tabular-nums text-white">
          {count}
        </span>
      ) : null}
    </Link>
  );
}

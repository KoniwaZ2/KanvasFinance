"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { getCartProducts } from "@/app/actions/order";
import {
  getCartSnapshot,
  getCartServerSnapshot,
  subscribeToCart,
  type CartLine,
} from "@/lib/cart";

const NO_PRODUCTS: CartProduct[] = [];

/** Menandai apakah komponen sudah berjalan di browser, tanpa setState di efek. */
function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export type CartProduct = Awaited<ReturnType<typeof getCartProducts>>[number];

export type CartRow = {
  line: CartLine;
  product: CartProduct;
  subtotal: number;
  exceedsStock: boolean;
};

/**
 * Menggabungkan isi keranjang di browser dengan detail produk dari database.
 * Dipakai halaman keranjang dan halaman checkout agar keduanya membaca
 * harga dan stok dari sumber yang sama.
 */
export function useCartProducts() {
  const hydrated = useHydrated();
  const lines = useSyncExternalStore(
    subscribeToCart,
    getCartSnapshot,
    getCartServerSnapshot,
  );

  // Hasil pengambilan disimpan bersama kunci asalnya, sehingga data lama
  // tidak pernah terpakai untuk isi keranjang yang sudah berubah.
  const [fetched, setFetched] = useState<{
    key: string;
    products: CartProduct[];
    error: string | null;
  } | null>(null);

  // Detail produk hanya diambil ulang saat daftar produknya berubah,
  // bukan setiap kali jumlah kg diubah.
  const idKey = lines
    .map((line) => line.productId)
    .sort()
    .join(",");

  useEffect(() => {
    if (idKey === "") return;

    let cancelled = false;

    getCartProducts(idKey.split(","))
      .then((result) => {
        if (!cancelled) {
          setFetched({ key: idKey, products: result, error: null });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFetched({
            key: idKey,
            products: [],
            error:
              "Detail produk gagal dimuat. Periksa koneksi lalu muat ulang halaman.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [idKey]);

  const isCurrent = fetched?.key === idKey;
  const products = isCurrent ? fetched.products : NO_PRODUCTS;
  const error = isCurrent ? fetched.error : null;
  const loading = !hydrated || (idKey !== "" && !isCurrent);

  const rows = useMemo<CartRow[]>(() => {
    if (!lines) return [];

    return lines.flatMap((line) => {
      const product = products.find((item) => item.id === line.productId);
      if (!product) return [];

      return [
        {
          line,
          product,
          subtotal: product.pricePerKg * line.quantityKg,
          exceedsStock: line.quantityKg > product.stockKg,
        },
      ];
    });
  }, [lines, products]);

  // Produk yang sudah ditarik dari katalog sejak terakhir dimasukkan keranjang.
  const unavailableIds = useMemo(() => {
    if (!lines || loading) return [];
    return lines
      .filter((line) => !products.some((product) => product.id === line.productId))
      .map((line) => line.productId);
  }, [lines, products, loading]);

  const total = rows.reduce((sum, row) => sum + row.subtotal, 0);
  const hasStockProblem = rows.some((row) => row.exceedsStock);

  return {
    rows,
    total,
    loading,
    error,
    unavailableIds,
    hasStockProblem,
    isEmpty: hydrated && lines.length === 0,
  };
}

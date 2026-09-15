"use client";

/**
 * Keranjang belanja disimpan di browser pembeli.
 * Ini kenyamanan per-perangkat, bukan sumber kebenaran harga:
 * harga dan stok selalu dihitung ulang di server saat pesanan dibuat.
 */

const STORAGE_KEY = "limbahbagus_cart";
const CART_EVENT = "limbahbagus:cart";

export type CartLine = {
  productId: string;
  quantityKg: number;
};

const EMPTY_CART: CartLine[] = [];

function parseCart(raw: string | null): CartLine[] {
  if (!raw) return EMPTY_CART;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY_CART;
    return parsed.filter(
      (line): line is CartLine =>
        typeof line?.productId === "string" &&
        Number.isFinite(line?.quantityKg) &&
        line.quantityKg > 0,
    );
  } catch {
    return EMPTY_CART;
  }
}

function readRaw(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function readCart(): CartLine[] {
  return parseCart(readRaw());
}

// useSyncExternalStore mewajibkan snapshot yang stabil: selama isi localStorage
// tidak berubah, fungsi ini harus mengembalikan array yang sama persis,
// bukan array baru setiap dipanggil.
let cachedRaw: string | null = null;
let cachedLines: CartLine[] = EMPTY_CART;

export function getCartSnapshot(): CartLine[] {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedLines = parseCart(raw);
  }
  return cachedLines;
}

export function getCartServerSnapshot(): CartLine[] {
  return EMPTY_CART;
}

export function writeCart(lines: CartLine[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  } catch {
    // Mode privat atau penyimpanan penuh: keranjang tetap jalan untuk sesi ini.
  }
  window.dispatchEvent(new CustomEvent(CART_EVENT));
}

export function addToCart(productId: string, quantityKg: number) {
  const lines = readCart();
  const existing = lines.find((line) => line.productId === productId);

  if (existing) {
    existing.quantityKg += quantityKg;
  } else {
    lines.push({ productId, quantityKg });
  }

  writeCart(lines);
}

export function updateQuantity(productId: string, quantityKg: number) {
  const lines = readCart()
    .map((line) =>
      line.productId === productId ? { ...line, quantityKg } : line,
    )
    .filter((line) => line.quantityKg > 0);

  writeCart(lines);
}

export function removeFromCart(productId: string) {
  writeCart(readCart().filter((line) => line.productId !== productId));
}

export function clearCart() {
  writeCart([]);
}

export function cartCount(): number {
  return getCartSnapshot().length;
}

export function subscribeToCart(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CART_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CART_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

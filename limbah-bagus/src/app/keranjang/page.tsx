import type { Metadata } from "next";
import { guardPage } from "@/lib/auth";
import { CartView } from "./cart-view";

export const metadata: Metadata = {
  title: "Keranjang",
  description:
    "Tinjau pakan maggot dan pupuk kasgot yang akan dibeli sebelum melanjutkan ke pembayaran.",
};

export const dynamic = "force-dynamic";

export default async function KeranjangPage() {
  // Hanya pembeli yang berbelanja. Pedagang dan mitra pengolah tidak pernah
  // melihat keranjang, termasuk kalau alamatnya diketik langsung.
  await guardPage("BUYER");

  return (
    <div className="mx-auto max-w-7xl px-4 py-14">
      <header className="max-w-2xl">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">
          Keranjang
        </h1>
        <p className="mt-3 leading-relaxed text-ink-soft">
          Jumlah masih bisa diubah di sini. Harga dan stok diambil langsung dari
          data mitra pengolah saat halaman dibuka.
        </p>
      </header>

      <div className="mt-10">
        <CartView />
      </div>
    </div>
  );
}

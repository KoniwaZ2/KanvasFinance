import Link from "next/link";
import type { Metadata } from "next";
import { BuyerRegisterForm } from "./buyer-form";

export const metadata: Metadata = {
  title: "Daftar sebagai Pembeli",
};

export default function BuyerRegisterPage() {
  return (
    <div className="mx-auto grid max-w-5xl gap-12 px-4 py-14 md:py-20 lg:grid-cols-[1fr_0.85fr]">
      <div>
        <h1 className="max-w-[20ch] font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">
          Daftar sebagai petani atau peternak
        </h1>
        <p className="mt-4 max-w-[58ch] leading-relaxed text-ink-soft">
          Akun ini untuk membeli maggot dan pupuk kasgot dari pengolah di
          Kabupaten Tangerang. Pendaftaran gratis dan tidak ada biaya langganan.
        </p>

        <div className="mt-10">
          <BuyerRegisterForm />
        </div>

        <p className="mt-8 text-sm text-ink-soft">
          Sudah punya akun?{" "}
          <Link href="/masuk" className="underline hover:text-ink">
            Masuk di sini
          </Link>
        </p>
      </div>

      <aside className="h-fit rounded-xl border border-line bg-surface-raised p-6">
        <h2 className="font-display text-base font-semibold text-ink">
          Setelah mendaftar
        </h2>
        <ul className="mt-4 space-y-4 text-sm leading-relaxed text-ink-soft">
          <li>
            Katalog terbuka penuh, lengkap dengan harga per kg, kandungan
            protein, dan asal unit pengolahnya.
          </li>
          <li>
            Pembayaran memakai QRIS, e-wallet, atau Virtual Account. Status
            pesanan berubah sendiri setelah pembayaran dikonfirmasi.
          </li>
          <li>
            Riwayat pesanan tersimpan, jadi pembelian berikutnya tidak perlu
            mengisi alamat dari awal.
          </li>
        </ul>
      </aside>
    </div>
  );
}

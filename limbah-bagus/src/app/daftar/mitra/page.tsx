import Link from "next/link";
import type { Metadata } from "next";
import { ProcessorRegisterForm } from "./processor-form";

export const metadata: Metadata = {
  title: "Daftar sebagai Mitra",
};

export default function ProcessorRegisterPage() {
  return (
    <div className="mx-auto grid max-w-5xl gap-12 px-4 py-14 md:py-20 lg:grid-cols-[1fr_0.85fr]">
      <div>
        <h1 className="max-w-[22ch] font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">
          Daftar sebagai peternak maggot atau unit pengolah
        </h1>
        <p className="mt-4 max-w-[58ch] leading-relaxed text-ink-soft">
          Dua bentuk usaha diterima: unit yang mengolah sampah organik dari
          pasar, dan peternak yang membudidayakan maggot sendiri lalu menjual
          hasil panennya. Pendaftaran gratis.
        </p>

        <div className="mt-10">
          <ProcessorRegisterForm />
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
          Perbedaan dua pilihan
        </h2>

        <div className="mt-4 space-y-5 text-sm leading-relaxed text-ink-soft">
          <div>
            <p className="font-medium text-ink">Unit pengolah sampah</p>
            <p className="mt-1">
              Membeli sampah organik di bursa dengan harga resmi, menjemput dan
              menimbangnya sendiri, lalu mengolahnya menjadi maggot dan kasgot.
            </p>
          </div>

          <div>
            <p className="font-medium text-ink">Peternak maggot mandiri</p>
            <p className="mt-1">
              Membudidayakan maggot dengan bahan baku sendiri. Anda tidak masuk
              antrean penjemputan, tetapi tetap bisa menjual maggot dan pupuk
              lewat katalog.
            </p>
          </div>

          <p>
            Pilihan ini bisa diubah nanti lewat pengelola bila usaha Anda
            berkembang.
          </p>
        </div>
      </aside>
    </div>
  );
}

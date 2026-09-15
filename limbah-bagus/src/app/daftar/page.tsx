import Link from "next/link";
import type { Metadata } from "next";
import {
  BasketIcon,
  BugBeetleIcon,
  StorefrontIcon,
} from "@phosphor-icons/react/dist/ssr";
import { PLATFORM_FEE_PER_TRANSACTION } from "@/lib/waste";
import { formatRupiah } from "@/lib/format";

export const metadata: Metadata = {
  title: "Daftar",
};

const PATHS = [
  {
    href: "/daftar-pedagang",
    icon: StorefrontIcon,
    title: "Pedagang pasar atau rumah makan",
    body: "Jual sampah organik Anda dengan harga resmi pemerintah daerah. Pengolah yang menjemput dan menimbang di lapak, lalu membayar di tempat.",
    action: "Daftar jual sampah organik",
    note: "Gratis",
  },
  {
    href: "/daftar/mitra",
    icon: BugBeetleIcon,
    title: "Peternak maggot atau unit pengolah",
    body: "Menerima pasokan sampah organik dari pedagang, atau membudidayakan maggot sendiri, lalu menjual pakan dan pupuk lewat katalog.",
    action: "Daftar sebagai mitra",
    note: `Gratis, biaya layanan ${formatRupiah(PLATFORM_FEE_PER_TRANSACTION)} per pembelian sampah`,
  },
  {
    href: "/daftar/pembeli",
    icon: BasketIcon,
    title: "Petani atau peternak pembeli",
    body: "Membeli maggot dan pupuk kasgot langsung dari pengolah di Kabupaten Tangerang, tanpa perantara.",
    action: "Daftar sebagai pembeli",
    note: "Gratis",
  },
];

export default function ChooseRolePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-14 md:py-20">
      <h1 className="max-w-[18ch] font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">
        Anda bergabung sebagai apa?
      </h1>
      <p className="mt-4 max-w-[60ch] leading-relaxed text-ink-soft">
        Setiap peran punya halaman dan kebutuhan yang berbeda. Pilih yang paling
        sesuai dengan usaha Anda.
      </p>

      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {PATHS.map((path) => {
          const Icon = path.icon;

          return (
            <Link
              key={path.href}
              href={path.href}
              className="group flex flex-col rounded-xl border border-line bg-surface-raised p-6 transition-colors hover:border-accent"
            >
              <span className="grid h-11 w-11 place-items-center rounded-full bg-brand text-brand-contrast">
                <Icon size={20} aria-hidden />
              </span>

              <h2 className="mt-5 font-display text-lg font-semibold leading-snug text-ink">
                {path.title}
              </h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-soft">
                {path.body}
              </p>

              <span className="mt-5 text-sm font-medium text-accent">
                {path.action}
              </span>
              <span className="mt-1 text-xs text-ink-soft">{path.note}</span>
            </Link>
          );
        })}
      </div>

      <p className="mt-10 text-sm text-ink-soft">
        Sudah punya akun?{" "}
        <Link href="/masuk" className="underline hover:text-ink">
          Masuk di sini
        </Link>
      </p>
    </div>
  );
}

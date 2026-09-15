import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { ROLE_HOME } from "@/lib/access";
import { InfoNote } from "@/components/ui";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Masuk",
  description:
    "Masuk ke akun LimbahBagus untuk mengelola penjemputan sampah, pesanan pakan, atau unit pengolahan.",
};

export const dynamic = "force-dynamic";

const demoAccounts = [
  {
    role: "Pedagang pasar",
    email: "maryati.cikupa@limbahbagus.id",
    note: "Kios Sayur Bu Maryati, Pasar Cikupa",
  },
  {
    role: "Mitra pengolah",
    email: "kronjolestari@limbahbagus.id",
    note: "Unit BSF Kronjo Lestari",
  },
  {
    role: "Peternak pembeli",
    email: "sanusi.ternak@limbahbagus.id",
    note: "Peternak ayam petelur, Kronjo",
  },
];

export default async function MasukPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; sesi?: string }>;
}) {
  // proxy.ts sudah mengalihkan pengguna yang sudah masuk. Pemeriksaan ini
  // lapis kedua, kalau-kalau halaman diakses lewat jalur yang tidak melewati proxy.
  const user = await getSessionUser();

  if (user) {
    redirect(ROLE_HOME[user.role]);
  }

  const { next, sesi } = await searchParams;

  return (
    <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:items-start lg:gap-20 lg:py-24">
      <div className="order-2 lg:order-1">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">
          Masuk ke akun Anda
        </h1>
        <p className="mt-3 max-w-[55ch] leading-relaxed text-ink-soft">
          Satu akun untuk menjual sampah organik, membelinya di bursa, atau
          berbelanja pakan dan pupuk hasil olahan.
        </p>

        <div className="mt-10 max-w-md">
          {sesi === "berakhir" ? (
            <div className="mb-6">
              <InfoNote>
                Sesi Anda sudah berakhir dan akun lama tidak ditemukan lagi.
                Silakan masuk kembali.
              </InfoNote>
            </div>
          ) : null}

          <LoginForm next={next} />
        </div>

        <p className="mt-8 text-sm text-ink-soft">
          Belum punya akun? Pedagang pasar, peternak maggot, dan pembeli bisa{" "}
          <Link
            href="/daftar"
            className="font-medium text-accent underline underline-offset-4 hover:text-accent-hover"
          >
            mendaftar di sini
          </Link>
          .
        </p>
      </div>

      <aside className="order-1 rounded-xl border border-line bg-surface-raised p-6 lg:order-2 lg:mt-2">
        <h2 className="font-display text-lg font-semibold text-ink">
          Akun contoh untuk mencoba
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Data di aplikasi ini adalah data contoh. Gunakan salah satu akun di
          bawah dengan kata sandi{" "}
          <span className="font-medium text-ink">limbahbagus123</span>.
        </p>

        <ul className="mt-6 divide-y divide-line border-t border-line">
          {demoAccounts.map((account) => (
            <li key={account.email} className="py-4">
              <p className="text-sm font-medium text-ink">{account.role}</p>
              <p className="mt-1 font-mono text-xs break-all text-ink-soft">
                {account.email}
              </p>
              <p className="mt-1 text-xs text-ink-soft">{account.note}</p>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { ROLE_HOME } from "@/lib/access";
import { RegisterTraderForm } from "./register-form";

export const metadata: Metadata = {
  title: "Daftar Jual Sampah Organik",
  description:
    "Daftarkan kios atau rumah makan Anda untuk menjual sampah organik dengan harga resmi di Kabupaten Tangerang.",
};

export const dynamic = "force-dynamic";

export default async function DaftarPedagangPage() {
  // Pendaftaran hanya masuk akal bagi yang belum punya akun. Yang sudah masuk
  // diantar ke berandanya sendiri. proxy.ts sudah melakukan ini lebih dulu,
  // pemeriksaan di sini lapis keduanya.
  const user = await getSessionUser();

  if (user) {
    redirect(ROLE_HOME[user.role]);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 lg:py-24">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">
        Daftar jual sampah organik
      </h1>
      <p className="mt-4 max-w-[60ch] leading-relaxed text-ink-soft">
        Isi data usaha Anda sekali, lalu pasang sampah organik yang siap
        dijemput kapan pun ada. Pengolah maggot yang mengambil lot Anda akan
        menimbang di lokasi dan membayar di tempat, tunai atau QRIS.
      </p>

      <div className="mt-12">
        <RegisterTraderForm />
      </div>
    </div>
  );
}

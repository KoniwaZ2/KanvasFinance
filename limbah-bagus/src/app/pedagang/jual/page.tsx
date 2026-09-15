import type { Metadata } from "next";
import Link from "next/link";
import { guardPage } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { getActiveTariffs } from "@/lib/tariffs";
import { LISTING_MAX_DAYS_AHEAD } from "@/lib/waste";
import { EmptyState } from "@/components/ui";
import { ListingForm } from "./listing-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Jual Sampah",
  description: "Pasang lot sampah organik Anda supaya dijemput pengolah maggot.",
};

function toDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default async function JualPage() {
  await guardPage("TRADER");

  const tariffs = await getActiveTariffs();

  // Batas tanggal dihitung di server supaya tampilan tidak berbeda dengan
  // pemeriksaan yang dilakukan server action.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const latest = new Date(today);
  latest.setDate(latest.getDate() + LISTING_MAX_DAYS_AHEAD);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:py-16">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">
        Jual sampah hari ini
      </h1>
      <p className="mt-3 max-w-[60ch] leading-relaxed text-ink-soft">
        Pilih jenis sampahnya, tulis perkiraan beratnya, lalu tentukan kapan
        siap dijemput. Pengolah maggot yang datang ke lapak Anda.
      </p>

      <div className="mt-10">
        {tariffs.length === 0 ? (
          <EmptyState
            title="Daftar harga belum tersedia"
            description="Harga sampah sedang diperbarui pengelola. Coba lagi nanti atau hubungi petugas pasar."
          />
        ) : (
          <ListingForm
            tariffs={tariffs.map((tariff) => ({
              id: tariff.id,
              name: tariff.name,
              description: tariff.description,
              pricePerKg: tariff.pricePerKg,
            }))}
            minDate={toDateInput(today)}
            maxDate={toDateInput(latest)}
            maxDateLabel={formatDate(latest)}
          />
        )}
      </div>

      <p className="mt-10 text-sm text-ink-soft">
        <Link href="/pedagang" className="underline hover:text-ink">
          Kembali ke beranda
        </Link>
      </p>
    </div>
  );
}

import Link from "next/link";
import type { Metadata } from "next";
import { getActiveTariffs } from "@/lib/tariffs";
import { formatRupiah } from "@/lib/format";
import { ButtonLink, Card, EmptyState } from "@/components/ui";

export const metadata: Metadata = {
  title: "Harga Sampah Organik",
  description:
    "Daftar harga resmi sampah organik per kilogram di Kabupaten Tangerang. Satu harga untuk semua pedagang, tanpa tawar-menawar.",
};

// Tarif jarang berubah, tapi kalau berubah halaman ini harus ikut berubah hari
// itu juga. Satu jam adalah kompromi yang aman untuk halaman publik.
export const revalidate = 3600;

export default async function HargaSampahPage() {
  const tariffs = await getActiveTariffs();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 md:py-20">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">
        Harga sampah organik
      </h1>
      <p className="mt-4 max-w-[62ch] leading-relaxed text-ink-soft">
        Harga di bawah ini ditetapkan pemerintah daerah dan berlaku sama untuk
        semua pedagang. Tidak ada tawar-menawar, dan tidak ada pedagang yang
        boleh menjual lebih murah atau lebih mahal. Berapa pun besar kios Anda,
        harga per kilogramnya sama.
      </p>

      {tariffs.length === 0 ? (
        <div className="mt-12">
          <EmptyState
            title="Tabel harga belum tersedia"
            description="Tarif resmi belum dimuat ke sistem. Hubungi pengelola LimbahBagus untuk informasi harga yang berlaku saat ini."
          />
        </div>
      ) : (
        <>
          <div className="mt-12 grid gap-4 md:grid-cols-2">
            {tariffs.map((tariff) => (
              <Card key={tariff.id} className="flex flex-col p-6">
                <h2 className="font-display text-lg font-semibold text-ink">
                  {tariff.name}
                </h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-soft">
                  {tariff.description}
                </p>
                <p className="mt-5 font-display text-3xl font-semibold tabular-nums tracking-tight text-ink">
                  {formatRupiah(tariff.pricePerKg)}
                </p>
                <p className="mt-1 text-sm text-ink-soft">per kilogram</p>
                <p className="mt-4 border-t border-line pt-4 text-xs leading-relaxed text-ink-soft">
                  Dasar penetapan: {tariff.regulationRef}
                </p>
              </Card>
            ))}
          </div>

          <div className="mt-12 rounded-xl border border-line bg-surface-sunken px-6 py-6">
            <h2 className="font-display text-lg font-semibold text-ink">
              Yang dibayar adalah berat timbangan
            </h2>
            <p className="mt-3 max-w-[62ch] text-sm leading-relaxed text-ink-soft">
              Saat memasang sampah, Anda hanya mengisi perkiraan berat. Nilai
              yang dibayar dihitung dari hasil timbangan di lokasi penjemputan
              dikali harga di atas, jadi perkiraan yang meleset tidak merugikan
              siapa pun. Pembayaran dilakukan di tempat setelah ditimbang, tunai
              atau lewat QRIS.
            </p>
          </div>

          <p className="mt-6 text-sm leading-relaxed text-ink-soft">
            Angka di halaman ini masih angka kerja untuk uji coba program dan
            akan dicocokkan dengan peraturan daerah yang berlaku sebelum
            diberlakukan penuh.
          </p>
        </>
      )}

      <div className="mt-12 flex flex-wrap items-center gap-4">
        <ButtonLink href="/daftar-pedagang" size="lg">
          Daftar dan Jual Sampah Anda
        </ButtonLink>
        <Link
          href="/untuk-pedagang"
          className="text-sm font-medium text-ink underline underline-offset-4 hover:text-accent"
        >
          Pelajari cara kerjanya
        </Link>
      </div>
    </div>
  );
}

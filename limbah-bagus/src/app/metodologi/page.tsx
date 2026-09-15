import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRightIcon } from "@phosphor-icons/react/dist/ssr";
import {
  getImpactStats,
  EMISSION_FACTOR_KG_CO2E_PER_KG_WASTE,
} from "@/lib/impact";
import { formatKg, formatNumber, formatTon } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Metodologi perhitungan dampak",
  description:
    "Dari mana angka tonase sampah dan estimasi emisi karbon di dashboard LimbahBagus berasal, dan apa batas ketelitiannya.",
};

export default async function MetodologiPage() {
  const stats = await getImpactStats();

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 md:py-20">
      <header>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-ink md:text-5xl">
          Metodologi perhitungan dampak
        </h1>
        <p className="mt-4 leading-relaxed text-ink-soft">
          Halaman ini menjelaskan asal setiap angka di dashboard dampak, supaya
          siapa pun bisa memeriksa ulang dan tahu di mana batas ketelitiannya.
        </p>
      </header>

      <div className="mt-12 space-y-12">
        <section>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
            Sumber data
          </h2>
          <p className="mt-3 leading-relaxed text-ink-soft">
            Satu satunya sumber angka dampak adalah berat timbangan di lokasi
            penjemputan, dicatat pengolah setelah sampah benar-benar diangkut
            dari lapak. Perkiraan berat yang diisi pedagang saat memasang lot
            hanya dipakai untuk menampilkan perkiraan nilai di bursa, dan tidak
            pernah masuk ke statistik publik.
          </p>
          <p className="mt-3 leading-relaxed text-ink-soft">
            Artinya, angka di dashboard akan selalu lebih konservatif daripada
            klaim kapasitas. Lot yang sudah diambil pengolah tetapi belum
            dijemput dan ditimbang tidak dihitung. Catatan dampak dibuat begitu
            timbangan masuk, bukan menunggu pembayaran selesai, karena sampahnya
            memang sudah teralihkan dari TPA sejak diangkut.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
            Total sampah yang dialihkan
          </h2>
          <p className="mt-3 leading-relaxed text-ink-soft">
            Penjumlahan berat timbangan seluruh lot yang sudah dijemput,
            ditampilkan dalam ton dengan satu angka desimal.
          </p>
          <div className="mt-5 rounded-xl border border-line bg-surface-raised p-5">
            <p className="text-sm text-ink-soft">Nilai saat ini</p>
            <p className="mt-1 font-display text-3xl font-semibold tabular-nums text-ink">
              {formatTon(stats.totalDivertedKg)} ton
            </p>
            <p className="mt-1 text-sm tabular-nums text-ink-soft">
              setara {formatKg(stats.totalDivertedKg)}
            </p>
          </div>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
            Estimasi emisi yang dihindari
          </h2>
          <p className="mt-3 leading-relaxed text-ink-soft">
            Sampah organik yang ditimbun di TPA terurai tanpa udara dan
            melepaskan gas metana, gas rumah kaca yang jauh lebih kuat daripada
            karbon dioksida. Mengolahnya lewat budidaya maggot BSF memutus jalur
            pembusukan itu.
          </p>
          <p className="mt-3 leading-relaxed text-ink-soft">
            Perhitungan yang dipakai sederhana dan sengaja konservatif:
          </p>

          <div className="mt-5 rounded-xl border border-line bg-surface-sunken p-5">
            <p className="font-mono text-sm leading-relaxed text-ink">
              emisi dihindari = total sampah dialihkan ×{" "}
              {EMISSION_FACTOR_KG_CO2E_PER_KG_WASTE} kg CO2e per kg
            </p>
            <p className="mt-4 text-sm tabular-nums text-ink-soft">
              {formatNumber(stats.totalDivertedKg)} kg ×{" "}
              {EMISSION_FACTOR_KG_CO2E_PER_KG_WASTE} ={" "}
              <span className="font-medium text-ink">
                {formatNumber(stats.emissionAvoidedKgCo2e)} kg CO2e
              </span>
            </p>
          </div>

          <p className="mt-5 leading-relaxed text-ink-soft">
            Faktor {EMISSION_FACTOR_KG_CO2E_PER_KG_WASTE} kg CO2e per kg sampah
            adalah nilai estimasi yang lazim dipakai untuk pengalihan sampah
            organik ke pengolahan biologis. Nilai ini bukan hasil pengukuran di
            lokasi, dan harus diganti dengan faktor emisi resmi begitu tersedia
            rujukan yang lebih spesifik untuk komposisi sampah pasar Kabupaten
            Tangerang.
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
            Hitungan lain di dashboard
          </h2>
          <dl className="mt-5 divide-y divide-line border-y border-line">
            <div className="py-4">
              <dt className="font-medium text-ink">Pengolah aktif</dt>
              <dd className="mt-1 text-sm leading-relaxed text-ink-soft">
                Jumlah unit pengolahan yang punya minimal satu pembelian sampah
                yang sudah lunas. Peternak maggot mandiri yang memakai bahan
                baku sendiri tidak terhitung di sini, karena angka ini mengukur
                sisi permintaan bursa sampah.
              </dd>
            </div>
            <div className="py-4">
              <dt className="font-medium text-ink">Pembeli terlayani</dt>
              <dd className="mt-1 text-sm leading-relaxed text-ink-soft">
                Jumlah akun pembeli yang punya minimal satu pesanan dengan
                pembayaran sudah terkonfirmasi. Pesanan yang masih menunggu
                pembayaran tidak dihitung.
              </dd>
            </div>
            <div className="py-4">
              <dt className="font-medium text-ink">Produk tersalurkan</dt>
              <dd className="mt-1 text-sm leading-relaxed text-ink-soft">
                Total kilogram pakan dan pupuk dari pesanan yang sudah lunas.
                Angka ini tidak dipakai untuk mengklaim penghematan biaya
                peternak, karena pembanding harga pabrikan perlu data terpisah.
              </dd>
            </div>
          </dl>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
            Batas dan rencana perbaikan
          </h2>
          <p className="mt-3 leading-relaxed text-ink-soft">
            Angka emisi di halaman dampak selalu diberi label estimasi. Sebelum
            dipakai dalam laporan resmi, perhitungan ini perlu divalidasi dengan
            Pedoman IPCC untuk sektor limbah dan data komposisi sampah pasar dari
            dinas lingkungan hidup setempat.
          </p>
          <Link
            href="/dashboard-dampak"
            className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-accent transition-colors hover:text-accent-hover"
          >
            Kembali ke dashboard dampak
            <ArrowUpRightIcon size={15} aria-hidden />
          </Link>
        </section>
      </div>
    </div>
  );
}

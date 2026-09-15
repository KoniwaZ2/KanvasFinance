import Link from "next/link";
import { StatusBadge } from "@/components/ui";
import {
  formatDate,
  formatKg,
  formatRupiah,
} from "@/lib/format";
import { readyWindowLabel, weightVariancePct } from "@/lib/waste";

/**
 * Kartu penjualan sisi pedagang (docs/CARD.md bagian 2).
 *
 * Satu kartu mewakili satu lot beserta pembeliannya kalau sudah ada. Angka
 * perkiraan tidak pernah dihapus setelah timbangan masuk: keduanya ditampilkan
 * berdampingan supaya selisihnya terlihat wajar, bukan terasa dipotong diam-diam.
 */

export type SaleCardData = {
  listingId: string;
  tariffName: string;
  pricePerKg: number;
  /** Status pembelian kalau sudah ada pengolah, kalau belum status lotnya. */
  status: string;
  estimatedKg: number;
  estimatedAmount: number;
  actualKg: number | null;
  finalAmount: number | null;
  processorName: string | null;
  readyDate: Date;
  readyWindow: string;
  pickupDate: Date | null;
  paymentMethod: string | null;
  payoutStatus: string | null;
  payoutScheduledAt: Date | null;
};

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cash: "Tunai",
  qris: "QRIS",
};

export function OfficialPriceLine({ pricePerKg }: { pricePerKg: number }) {
  return (
    <p className="text-xs leading-relaxed text-ink-soft">
      <span className="tabular-nums">{formatRupiah(pricePerKg)}</span> per kg,
      harga resmi yang sama di semua pedagang.{" "}
      <Link href="/harga-sampah" className="underline hover:text-ink">
        Lihat daftar harga
      </Link>
    </p>
  );
}

export function SaleCard({ sale }: { sale: SaleCardData }) {
  const weighed = sale.actualKg !== null && sale.finalAmount !== null;
  const variance = weighed ? weightVariancePct(sale.estimatedKg, sale.actualKg ?? 0) : 0;

  return (
    <div className="rounded-xl border border-line bg-surface-raised p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-lg font-semibold text-ink">
            {sale.tariffName}
          </h3>
          <p className="mt-1 text-sm text-ink-soft">
            {sale.processorName
              ? `Diambil ${sale.processorName}`
              : "Belum ada pengolah yang mengambil"}
          </p>
        </div>
        <StatusBadge status={sale.status} />
      </div>

      <div className="mt-5 rounded-xl bg-surface-sunken px-4 py-4">
        {weighed ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-ink-soft">Perkiraan Anda</p>
                <p className="mt-1 text-[0.95rem] font-medium tabular-nums text-ink-soft">
                  {formatKg(sale.estimatedKg)}
                </p>
              </div>
              <div>
                <p className="text-xs text-ink-soft">Hasil timbangan</p>
                <p className="mt-1 text-[0.95rem] font-medium tabular-nums text-ink">
                  {formatKg(sale.actualKg ?? 0)}
                </p>
              </div>
            </div>

            <p className="mt-4 text-xs text-ink-soft">Nilai yang dibayar</p>
            <p className="font-display text-2xl font-semibold tabular-nums tracking-tight text-ink sm:text-3xl">
              {formatRupiah(sale.finalAmount ?? 0)}
            </p>

            {variance !== 0 ? (
              <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                Timbangan{" "}
                <span className="tabular-nums">
                  {variance > 0 ? `+${variance}` : variance}%
                </span>{" "}
                dari perkiraan. Selisih seperti ini wajar, tidak ada potongan.
              </p>
            ) : null}
          </>
        ) : (
          <>
            <p className="text-xs text-ink-soft">Perkiraan berat</p>
            <p className="mt-1 text-[0.95rem] font-medium tabular-nums text-ink">
              {formatKg(sale.estimatedKg)}
            </p>

            <p className="mt-4 text-xs text-ink-soft">Perkiraan nilai</p>
            <p className="font-display text-2xl font-semibold tabular-nums tracking-tight text-ink sm:text-3xl">
              {formatRupiah(sale.estimatedAmount)}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-ink-soft">
              Ini baru perkiraan. Uang yang Anda terima mengikuti hasil timbangan
              di lokasi saat sampah dijemput.
            </p>
          </>
        )}
      </div>

      <dl className="mt-5 space-y-2 text-sm">
        <div className="flex flex-wrap justify-between gap-2">
          <dt className="text-ink-soft">Siap dijemput</dt>
          <dd className="text-ink">
            {formatDate(sale.readyDate)}, {readyWindowLabel(sale.readyWindow)}
          </dd>
        </div>

        {sale.pickupDate ? (
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="text-ink-soft">Tanggal jemput disepakati</dt>
            <dd className="text-ink">{formatDate(sale.pickupDate)}</dd>
          </div>
        ) : null}

        {sale.paymentMethod ? (
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="text-ink-soft">Cara bayar</dt>
            <dd className="text-ink">
              {PAYMENT_METHOD_LABEL[sale.paymentMethod] ?? sale.paymentMethod}
            </dd>
          </div>
        ) : null}

        {sale.paymentMethod === "qris" && sale.payoutStatus ? (
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="text-ink-soft">Pencairan ke rekening</dt>
            <dd className="text-ink">
              {sale.payoutStatus === "settled"
                ? "Sudah dicairkan"
                : sale.payoutStatus === "failed"
                  ? "Gagal, sedang ditinjau pengelola"
                  : sale.payoutScheduledAt
                    ? `Dijadwalkan ${formatDate(sale.payoutScheduledAt)}, diproses pengelola`
                    : "Tercatat untuk dicairkan, diproses pengelola"}
            </dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-5 border-t border-line pt-4">
        <OfficialPriceLine pricePerKg={sale.pricePerKg} />
        <Link
          href={`/pedagang/penjualan/${sale.listingId}`}
          className="mt-3 inline-block text-sm font-medium text-accent underline-offset-4 hover:underline"
        >
          Lihat rincian penjualan
        </Link>
      </div>
    </div>
  );
}

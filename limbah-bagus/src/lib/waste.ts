import {
  PLATFORM_FEE_PER_TRANSACTION,
  WASTE_TARIFFS,
  type WasteTariffSeed,
} from "@/lib/waste-tariffs";

/**
 * Aturan main bursa sampah.
 *
 * Harga tidak pernah datang dari klien. Form hanya mengirim jenis sampahnya;
 * rupiahnya selalu dibaca ulang dari tabel WasteTariff di server, baik saat
 * listing dibuat maupun saat pengolah mengambil lot.
 *
 * Angka tarif dan biaya layanan tinggal di waste-tariffs.ts karena skrip seed
 * Prisma ikut memakainya dan tidak boleh menarik klien database ke dalamnya.
 *
 * Berkas ini sendiri sengaja bebas dari klien database supaya komponen klien
 * boleh memakai aturan dan rumusnya tanpa menyeret driver SQLite ke bundel
 * browser. Pembacaan tarif dari database ada di lib/tariffs.ts.
 */

export { PLATFORM_FEE_PER_TRANSACTION, WASTE_TARIFFS };
export type { WasteTariffSeed };

/** Rentang waktu siap jemput. Sengaja kasar, bukan jam presisi. */
export const READY_WINDOWS = [
  { id: "pagi", label: "Pagi", hint: "06.00 sampai 10.00" },
  { id: "siang", label: "Siang", hint: "10.00 sampai 14.00" },
  { id: "sore", label: "Sore", hint: "14.00 sampai 18.00" },
] as const;

export type ReadyWindowId = (typeof READY_WINDOWS)[number]["id"];

export function readyWindowLabel(id: string): string {
  return READY_WINDOWS.find((window) => window.id === id)?.label ?? id;
}

export function isReadyWindow(value: unknown): value is ReadyWindowId {
  return READY_WINDOWS.some((window) => window.id === value);
}

/** Nilai transaksi selalu dihitung di server dari tarif dan berat. */
export function lotValue(pricePerKg: number, kg: number): number {
  return pricePerKg * kg;
}

/**
 * Selisih antara perkiraan pedagang dan hasil timbangan, dalam persen.
 * Dipakai untuk menandai listing yang perkiraannya jauh meleset, bukan untuk
 * menghukum pedagang: perkiraan memang tidak pernah tepat.
 */
export function weightVariancePct(estimatedKg: number, actualKg: number): number {
  if (estimatedKg <= 0) return 0;
  return Math.round(((actualKg - estimatedKg) / estimatedKg) * 100);
}

/** Berapa hari ke depan sebuah listing masih masuk akal ditawarkan. */
export const LISTING_MAX_DAYS_AHEAD = 7;

/** Batas atas satu lot, supaya salah ketik tidak membuat nilai transaksi ngawur. */
export const LISTING_MAX_KG = 5000;

/** Yang harus dibayar pengolah: nilai sampah ditambah biaya layanan. */
export function processorTotal(finalAmount: number, platformFee: number): number {
  return finalAmount + platformFee;
}

/** Jeda pencairan dana QRIS ke rekening pedagang, dalam hari. */
export const PAYOUT_DELAY_DAYS = 1;

export function payoutScheduleFor(paidAt: Date): Date {
  const scheduled = new Date(paidAt);
  scheduled.setDate(scheduled.getDate() + PAYOUT_DELAY_DAYS);
  scheduled.setHours(9, 0, 0, 0);
  return scheduled;
}

/**
 * Masa berlaku kode QRIS checkout e-katalog, dalam menit.
 *
 * Jauh lebih panjang daripada QRIS di lokasi penjemputan: pembeli katalog
 * sering menunda sebentar sebelum membayar, dan pesanannya tidak menahan
 * siapa pun di lapangan.
 */
export const CATALOG_QRIS_EXPIRY_MINUTES = 24 * 60;

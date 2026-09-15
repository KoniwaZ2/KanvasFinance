/**
 * Tarif sampah organik yang ditetapkan pemerintah daerah.
 *
 * Berkas ini sengaja tidak mengimpor apa pun, termasuk klien database, supaya
 * bisa dipakai bersama oleh aplikasi dan skrip seed Prisma.
 */

export type WasteTariffSeed = {
  id: string;
  name: string;
  description: string;
  pricePerKg: number;
  regulationRef: string;
  sortOrder: number;
};

/**
 * Tabel tarif awal untuk MVP. Angka kerja, masih harus dicocokkan dengan
 * peraturan bupati yang berlaku sebelum peluncuran.
 */
export const WASTE_TARIFFS: WasteTariffSeed[] = [
  {
    id: "sayur-buah",
    name: "Sisa Sayur dan Buah",
    description:
      "Potongan sayur, kulit buah, dan sisa sortiran lapak. Paling banyak dihasilkan pasar dan paling disukai larva BSF.",
    pricePerKg: 700,
    regulationRef: "Perbup Kab. Tangerang tentang Tarif Sampah Organik Terpilah (draf)",
    sortOrder: 1,
  },
  {
    id: "sisa-makanan",
    name: "Sisa Makanan Matang",
    description:
      "Nasi, lauk, dan sisa olahan dari warung, katering, atau restoran. Tidak boleh tercampur plastik dan tulang keras.",
    pricePerKg: 500,
    regulationRef: "Perbup Kab. Tangerang tentang Tarif Sampah Organik Terpilah (draf)",
    sortOrder: 2,
  },
  {
    id: "ampas-produksi",
    name: "Ampas Produksi",
    description:
      "Ampas tahu, kelapa, kopi, dan kedelai dari produksi rumahan. Kadar protein paling tinggi, harganya paling baik.",
    pricePerKg: 900,
    regulationRef: "Perbup Kab. Tangerang tentang Tarif Sampah Organik Terpilah (draf)",
    sortOrder: 3,
  },
  {
    id: "sisa-ikan-daging",
    name: "Sisa Ikan dan Daging",
    description:
      "Jeroan, sisik, dan potongan dari lapak ikan atau daging. Harus dijemput di hari yang sama supaya tidak busuk.",
    pricePerKg: 600,
    regulationRef: "Perbup Kab. Tangerang tentang Tarif Sampah Organik Terpilah (draf)",
    sortOrder: 4,
  },
];

/**
 * Biaya layanan platform per transaksi sampah.
 *
 * Ditanggung pengolah sebagai pembeli, ditambahkan di atas nilai sampah.
 * Pedagang selalu menerima utuh berat timbangan dikali tarif resmi: harga yang
 * ditetapkan pemerintah tidak boleh terpotong biaya aplikasi, dan untuk lot
 * kecil potongan sebesar ini akan terasa besar sekali di sisi pedagang.
 *
 * Pada pembayaran tunai, uangnya tidak lewat platform sama sekali, jadi biaya
 * ini tercatat sebagai tagihan tertunggak pengolah (feeStatus outstanding)
 * dan ditagih berkala di luar aplikasi.
 */
export const PLATFORM_FEE_PER_TRANSACTION = 2000;

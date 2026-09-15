import { PrismaClient } from "@prisma/client";
import {
  PLATFORM_FEE_PER_TRANSACTION,
  WASTE_TARIFFS,
} from "../src/lib/waste-tariffs";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import crypto from "node:crypto";

try {
  process.loadEnvFile(".env");
} catch {
  // Abaikan kalau .env tidak ada, fallback ke path default di bawah.
}

const db = new PrismaClient({
  adapter: new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? "file:./dev.db",
  }),
});

// Password demo yang sama untuk semua akun contoh. Lihat README untuk daftar akun.
const DEMO_PASSWORD = "limbahbagus123";

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(6, 30, 0, 0);
  return d;
}

function daysAhead(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(6, 30, 0, 0);
  return d;
}

async function main() {
  console.log("Membersihkan data lama...");
  await db.impactRecord.deleteMany();
  await db.payout.deleteMany();
  await db.wastePurchase.deleteMany();
  await db.wasteListing.deleteMany();
  await db.wasteTariff.deleteMany();
  await db.orderItem.deleteMany();
  await db.order.deleteMany();
  await db.payment.deleteMany();
  await db.product.deleteMany();
  await db.traderProfile.deleteMany();
  await db.processorProfile.deleteMany();
  await db.user.deleteMany();

  console.log("Memuat tarif resmi sampah organik...");
  await db.wasteTariff.createMany({
    data: WASTE_TARIFFS.map((tariff) => ({
      id: tariff.id,
      name: tariff.name,
      description: tariff.description,
      pricePerKg: tariff.pricePerKg,
      regulationRef: tariff.regulationRef,
      sortOrder: tariff.sortOrder,
    })),
  });

  const passwordHash = hashPassword(DEMO_PASSWORD);

  console.log("Membuat akun mitra pengolah...");
  const kronjoUser = await db.user.create({
    data: {
      email: "kronjolestari@limbahbagus.id",
      passwordHash,
      name: "Sulaiman Rifai",
      phone: "081198234571",
      role: "PROCESSOR",
      processorProfile: {
        create: {
          unitName: "Unit BSF Kronjo Lestari",
          location: "Kronjo, Kabupaten Tangerang",
          capacityKgPerDay: 1200,
          description:
            "Kelompok tani pengolah maggot BSF yang berdiri sejak 2021, melayani penjemputan sampah organik dari Pasar Kronjo dan Pasar Kemis.",
        },
      },
    },
    include: { processorProfile: true },
  });

  const maukUser = await db.user.create({
    data: {
      email: "maukberdaya@limbahbagus.id",
      passwordHash,
      name: "Nuraeni Solihat",
      phone: "081334902188",
      role: "PROCESSOR",
      processorProfile: {
        create: {
          unitName: "Unit BSF Mauk Berdaya",
          location: "Mauk, Kabupaten Tangerang",
          capacityKgPerDay: 800,
          description:
            "Unit pengolahan maggot yang berfokus memasok pakan untuk pembudidaya ikan di pesisir Mauk dan Kronjo.",
        },
      },
    },
    include: { processorProfile: true },
  });

  // Peternak maggot mandiri: membudidayakan sendiri tanpa menerima penjemputan
  // sampah pasar, tapi tetap menjual hasil panennya lewat katalog.
  const sukamulyaUser = await db.user.create({
    data: {
      email: "maggotsukamulya@limbahbagus.id",
      passwordHash,
      name: "Hendra Gunawan",
      phone: "081290043312",
      role: "PROCESSOR",
      processorProfile: {
        create: {
          unitName: "Peternakan Maggot Sukamulya",
          location: "Sukamulya, Kabupaten Tangerang",
          capacityKgPerDay: 120,
          kind: "peternak",
          buysWaste: false,
          description:
            "Peternak maggot rumahan yang membudidayakan larva dengan bahan baku sendiri, memasok peternak ayam di sekitar Sukamulya.",
        },
      },
    },
    include: { processorProfile: true },
  });

  const kronjo = kronjoUser.processorProfile!;
  const mauk = maukUser.processorProfile!;
  const sukamulya = sukamulyaUser.processorProfile!;

  console.log("Membuat akun pedagang...");
  const maryatiUser = await db.user.create({
    data: {
      email: "maryati.cikupa@limbahbagus.id",
      passwordHash,
      name: "Maryati",
      phone: "081277345690",
      role: "TRADER",
      traderProfile: {
        create: {
          businessName: "Kios Sayur Bu Maryati",
          marketName: "Pasar Cikupa",
          address: "Blok C No. 14, Pasar Cikupa, Kabupaten Tangerang",
          dailyWasteEstKg: 45,
          payoutBankName: "BCA",
          payoutAccountNumber: "6820117345",
          payoutAccountName: "Maryati",
        },
      },
    },
    include: { traderProfile: true },
  });

  const sedapUser = await db.user.create({
    data: {
      email: "rmsedap.balaraja@limbahbagus.id",
      passwordHash,
      name: "Ahmad Fauzan",
      phone: "081511872043",
      role: "TRADER",
      traderProfile: {
        create: {
          businessName: "Rumah Makan Sedap Balaraja",
          marketName: "Pasar Balaraja",
          address: "Jl. Raya Serang Km. 24, Balaraja, Kabupaten Tangerang",
          dailyWasteEstKg: 120,
          payoutBankName: "Mandiri",
          payoutAccountNumber: "1300099871245",
          payoutAccountName: "Ahmad Fauzan",
        },
      },
    },
    include: { traderProfile: true },
  });

  const kemisUser = await db.user.create({
    data: {
      email: "grosir.kemis@limbahbagus.id",
      passwordHash,
      name: "Rosidah",
      phone: "081990237741",
      role: "TRADER",
      traderProfile: {
        create: {
          businessName: "Grosir Sayur Rosidah",
          marketName: "Pasar Kemis",
          address: "Los Sayur Blok A, Pasar Kemis, Kabupaten Tangerang",
          // Sengaja tanpa rekening: mendemokan pedagang yang baru bisa
          // menerima pembayaran tunai karena belum mengisi tujuan pencairan.
          dailyWasteEstKg: 80,
        },
      },
    },
    include: { traderProfile: true },
  });

  console.log("Membuat akun pembeli...");
  const sanusi = await db.user.create({
    data: {
      email: "sanusi.ternak@limbahbagus.id",
      passwordHash,
      name: "Sanusi",
      phone: "081245667831",
      role: "BUYER",
    },
  });

  const tambak = await db.user.create({
    data: {
      email: "tambak.mauk@limbahbagus.id",
      passwordHash,
      name: "Abdurrahman Yusuf",
      phone: "081377209154",
      role: "BUYER",
    },
  });

  await db.user.create({
    data: {
      email: "admin@limbahbagus.id",
      passwordHash,
      name: "Pengelola LimbahBagus",
      role: "ADMIN",
    },
  });

  console.log("Membuat katalog produk...");
  const maggotKering = await db.product.create({
    data: {
      slug: "maggot-bsf-kering-kronjo",
      processorId: kronjo.id,
      name: "Maggot BSF Kering",
      type: "maggot_kering",
      pricePerKg: 42_000,
      referenceMarketPrice: 72_000,
      stockKg: 340,
      proteinContentPct: 42,
      description:
        "Larva BSF yang dikeringkan dengan oven suhu rendah sehingga kadar air di bawah 10 persen dan tahan disimpan berbulan-bulan. Cocok sebagai campuran pakan ayam petelur dan ikan lele.",
      imageUrl: "/produk/maggot-kering.svg",
    },
  });

  const maggotSegar = await db.product.create({
    data: {
      slug: "maggot-bsf-segar-kronjo",
      processorId: kronjo.id,
      name: "Maggot BSF Segar",
      type: "maggot_segar",
      pricePerKg: 9_500,
      referenceMarketPrice: 16_000,
      stockKg: 180,
      proteinContentPct: 38,
      description:
        "Larva hidup umur 14 hari, dipanen pagi hari dan dikirim di hari yang sama. Pilihan paling ekonomis untuk peternak yang memberi pakan langsung.",
      imageUrl: "/produk/maggot-segar.svg",
    },
  });

  const kasgotKronjo = await db.product.create({
    data: {
      slug: "pupuk-kasgot-kronjo",
      processorId: kronjo.id,
      name: "Pupuk Kasgot Halus",
      type: "pupuk_kasgot",
      pricePerKg: 3_200,
      referenceMarketPrice: 5_500,
      stockKg: 920,
      description:
        "Bekas media maggot yang sudah matang dan diayak halus. Kaya unsur hara untuk tanaman sayur dan padi, tidak berbau menyengat.",
      imageUrl: "/produk/kasgot.svg",
    },
  });

  const maggotMauk = await db.product.create({
    data: {
      slug: "maggot-bsf-kering-mauk",
      processorId: mauk.id,
      name: "Maggot BSF Kering Mutu Tambak",
      type: "maggot_kering",
      pricePerKg: 45_000,
      referenceMarketPrice: 78_000,
      stockKg: 210,
      proteinContentPct: 45,
      description:
        "Diformulasikan untuk pembudidaya ikan air payau dengan kadar protein lebih tinggi. Dikemas per karung 25 kg.",
      imageUrl: "/produk/maggot-kering.svg",
    },
  });

  await db.product.create({
    data: {
      slug: "pupuk-kasgot-mauk",
      processorId: mauk.id,
      name: "Pupuk Kasgot Kasar",
      type: "pupuk_kasgot",
      pricePerKg: 2_600,
      referenceMarketPrice: 4_400,
      stockKg: 15,
      description:
        "Kasgot belum diayak, cocok untuk pemupukan dasar lahan sebelum tanam. Harga lebih murah karena tanpa proses pengayakan.",
      imageUrl: "/produk/kasgot.svg",
    },
  });

  await db.product.create({
    data: {
      slug: "maggot-bsf-segar-sukamulya",
      processorId: sukamulya.id,
      name: "Maggot BSF Segar Sukamulya",
      type: "maggot_segar",
      pricePerKg: 8_800,
      referenceMarketPrice: 16_000,
      stockKg: 95,
      proteinContentPct: 39,
      description:
        "Panen harian dari peternakan rumahan di Sukamulya. Dijual dalam wadah 5 kg, cocok untuk peternak ayam kampung skala kecil.",
      imageUrl: "/produk/maggot-segar.svg",
    },
  });

  console.log("Membuat riwayat bursa sampah...");

  // Tiap pedagang punya jenis sampah andalan dan pengolah langganan, supaya
  // dashboard dampak punya tren yang masuk akal, bukan angka acak.
  const sellers = [
    {
      trader: maryatiUser.traderProfile!,
      processor: kronjo,
      tariffId: "sayur-buah",
      pricePerKg: 700,
      avgKg: 42,
      everyDays: 2,
      hasAccount: true,
    },
    {
      trader: sedapUser.traderProfile!,
      processor: kronjo,
      tariffId: "sisa-makanan",
      pricePerKg: 500,
      avgKg: 115,
      everyDays: 1,
      hasAccount: true,
    },
    {
      trader: kemisUser.traderProfile!,
      processor: mauk,
      tariffId: "sayur-buah",
      pricePerKg: 700,
      avgKg: 76,
      everyDays: 2,
      hasAccount: false,
    },
  ];

  let seq = 0;

  for (const seller of sellers) {
    let done = 0;

    // Lima bulan ke belakang, semuanya sudah tuntas dan terbayar.
    for (let dayOffset = 150; dayOffset >= 3; dayOffset -= seller.everyDays) {
      const date = daysAgo(dayOffset);

      // Timbangan tidak pernah sama persis dengan perkiraan pedagang.
      const estimatedKg = Math.max(
        5,
        seller.avgKg + Math.round((Math.random() - 0.5) * seller.avgKg * 0.2),
      );
      const actualKg = Math.max(
        5,
        estimatedKg + Math.round((Math.random() - 0.55) * estimatedKg * 0.25),
      );
      const finalAmount = actualKg * seller.pricePerKg;

      // Pedagang tanpa rekening pencairan hanya bisa menerima tunai.
      const byQris = seller.hasAccount && Math.random() < 0.6;

      const listing = await db.wasteListing.create({
        data: {
          traderId: seller.trader.id,
          tariffId: seller.tariffId,
          estimatedKg,
          readyDate: date,
          readyWindow: "pagi",
          status: "completed",
          createdAt: daysAgo(dayOffset + 1),
        },
      });

      seq += 1;

      const payment = byQris
        ? await db.payment.create({
            data: {
              midtransOrderId: `WST-SEED-${String(seq).padStart(5, "0")}`,
              purpose: "WASTE_PURCHASE",
              status: "SETTLEMENT",
              grossAmount: finalAmount + PLATFORM_FEE_PER_TRANSACTION,
              method: "qris",
              paidAt: date,
              createdAt: date,
            },
          })
        : null;

      const purchase = await db.wastePurchase.create({
        data: {
          listingId: listing.id,
          processorId: seller.processor.id,
          tariffId: seller.tariffId,
          unitPricePerKg: seller.pricePerKg,
          estimatedKg,
          estimatedAmount: estimatedKg * seller.pricePerKg,
          actualKg,
          finalAmount,
          platformFee: PLATFORM_FEE_PER_TRANSACTION,
          feeStatus: byQris ? "collected" : "outstanding",
          pickupDate: date,
          status: "paid",
          paymentMethod: byQris ? "qris" : "cash",
          weighedAt: date,
          paidAt: date,
          paymentId: payment?.id ?? null,
          createdAt: daysAgo(dayOffset + 1),
        },
      });

      await db.impactRecord.create({
        data: { purchaseId: purchase.id, wasteKg: actualKg, recordedAt: date },
      });

      // Uang tunai berpindah langsung di lokasi, jadi tidak ada pencairan.
      if (byQris) {
        const settled = dayOffset > 2;
        await db.payout.create({
          data: {
            purchaseId: purchase.id,
            traderId: seller.trader.id,
            amount: finalAmount,
            bankName: seller.trader.payoutBankName ?? "",
            accountNumber: seller.trader.payoutAccountNumber ?? "",
            accountName: seller.trader.payoutAccountName ?? "",
            status: settled ? "settled" : "pending",
            scheduledAt: daysAgo(dayOffset - 1),
            settledAt: settled ? daysAgo(dayOffset - 1) : null,
            reference: settled
              ? `MANUAL-${daysAgo(dayOffset - 1).toISOString().slice(0, 10)}`
              : null,
            createdAt: date,
          },
        });
      }

      done += 1;
    }

    console.log(`  ${seller.trader.businessName}: ${done} lot terjual`);
  }

  console.log("Membuat transaksi bursa yang sedang berjalan...");

  // Lot yang masih terbuka di bursa, menunggu ada pengolah yang mengambil.
  await db.wasteListing.create({
    data: {
      traderId: kemisUser.traderProfile!.id,
      tariffId: "sayur-buah",
      estimatedKg: 85,
      readyDate: daysAhead(1),
      readyWindow: "pagi",
      note: "Sudah dipisah dari plastik dan kardus.",
      status: "open",
    },
  });

  await db.wasteListing.create({
    data: {
      traderId: sedapUser.traderProfile!.id,
      tariffId: "ampas-produksi",
      estimatedKg: 30,
      readyDate: daysAhead(2),
      readyWindow: "sore",
      note: "Ampas kelapa dari dapur, dikemas dalam ember tertutup.",
      status: "open",
    },
  });

  // Lot yang sudah diambil pengolah dan menunggu dijemput besok.
  const scheduledListing = await db.wasteListing.create({
    data: {
      traderId: maryatiUser.traderProfile!.id,
      tariffId: "sayur-buah",
      estimatedKg: 50,
      readyDate: daysAhead(1),
      readyWindow: "pagi",
      status: "reserved",
    },
  });

  await db.wastePurchase.create({
    data: {
      listingId: scheduledListing.id,
      processorId: kronjo.id,
      tariffId: "sayur-buah",
      unitPricePerKg: 700,
      estimatedKg: 50,
      estimatedAmount: 50 * 700,
      platformFee: PLATFORM_FEE_PER_TRANSACTION,
      pickupDate: daysAhead(1),
      status: "scheduled",
    },
  });

  // Lot yang baru saja ditimbang dan belum dibayar, untuk mencoba alur QRIS.
  const weighedListing = await db.wasteListing.create({
    data: {
      traderId: maryatiUser.traderProfile!.id,
      tariffId: "ampas-produksi",
      estimatedKg: 40,
      readyDate: daysAgo(0),
      readyWindow: "siang",
      status: "reserved",
    },
  });

  const weighedPurchase = await db.wastePurchase.create({
    data: {
      listingId: weighedListing.id,
      processorId: kronjo.id,
      tariffId: "ampas-produksi",
      unitPricePerKg: 900,
      estimatedKg: 40,
      estimatedAmount: 40 * 900,
      actualKg: 37,
      finalAmount: 37 * 900,
      platformFee: PLATFORM_FEE_PER_TRANSACTION,
      pickupDate: daysAgo(0),
      status: "weighed",
      weighedAt: daysAgo(0),
    },
  });

  await db.impactRecord.create({
    data: {
      purchaseId: weighedPurchase.id,
      wasteKg: 37,
      recordedAt: daysAgo(0),
    },
  });

  // Lot yang dibayar tunai dan menunggu pedagang mengonfirmasi penerimaan.
  const cashListing = await db.wasteListing.create({
    data: {
      traderId: kemisUser.traderProfile!.id,
      tariffId: "sayur-buah",
      estimatedKg: 70,
      readyDate: daysAgo(0),
      readyWindow: "pagi",
      status: "reserved",
    },
  });

  const cashPurchase = await db.wastePurchase.create({
    data: {
      listingId: cashListing.id,
      processorId: mauk.id,
      tariffId: "sayur-buah",
      unitPricePerKg: 700,
      estimatedKg: 70,
      estimatedAmount: 70 * 700,
      actualKg: 66,
      finalAmount: 66 * 700,
      platformFee: PLATFORM_FEE_PER_TRANSACTION,
      pickupDate: daysAgo(0),
      status: "awaiting_cash_confirmation",
      paymentMethod: "cash",
      weighedAt: daysAgo(0),
    },
  });

  await db.impactRecord.create({
    data: {
      purchaseId: cashPurchase.id,
      wasteKg: 66,
      recordedAt: daysAgo(0),
    },
  });

  console.log("Membuat riwayat pesanan katalog...");

  const paidOrderPayment = await db.payment.create({
    data: {
      midtransOrderId: "ORD-SEED-000001",
      purpose: "ORDER",
      status: "SETTLEMENT",
      grossAmount: 42_000 * 20,
      method: "qris",
      paidAt: daysAgo(9),
      createdAt: daysAgo(9),
    },
  });

  await db.order.create({
    data: {
      buyerId: sanusi.id,
      status: "fulfilled",
      totalAmount: 42_000 * 20,
      recipientName: "Sanusi",
      recipientPhone: "081245667831",
      deliveryAddress:
        "Kandang Ayam Petelur Sanusi, Kp. Pagedangan Ilir, Kronjo, Kabupaten Tangerang",
      paymentId: paidOrderPayment.id,
      createdAt: daysAgo(9),
      items: {
        create: [
          { productId: maggotKering.id, quantityKg: 20, unitPrice: 42_000 },
        ],
      },
    },
  });

  const secondPayment = await db.payment.create({
    data: {
      midtransOrderId: "ORD-SEED-000002",
      purpose: "ORDER",
      status: "SETTLEMENT",
      grossAmount: 45_000 * 25 + 3_200 * 50,
      method: "qris",
      paidAt: daysAgo(4),
      createdAt: daysAgo(4),
    },
  });

  await db.order.create({
    data: {
      buyerId: tambak.id,
      status: "paid",
      totalAmount: 45_000 * 25 + 3_200 * 50,
      recipientName: "Abdurrahman Yusuf",
      recipientPhone: "081377209154",
      deliveryAddress:
        "Tambak Bandeng Muara, Kp. Ketapang, Mauk, Kabupaten Tangerang",
      paymentId: secondPayment.id,
      createdAt: daysAgo(4),
      items: {
        create: [
          { productId: maggotMauk.id, quantityKg: 25, unitPrice: 45_000 },
          { productId: kasgotKronjo.id, quantityKg: 50, unitPrice: 3_200 },
        ],
      },
    },
  });

  // Satu pesanan yang masih menunggu pembayaran, supaya alur auto-check terlihat.
  const pendingPayment = await db.payment.create({
    data: {
      midtransOrderId: "ORD-SEED-000003",
      purpose: "ORDER",
      status: "PENDING",
      grossAmount: 9_500 * 30,
      createdAt: daysAgo(1),
    },
  });

  await db.order.create({
    data: {
      buyerId: sanusi.id,
      status: "awaiting_payment",
      totalAmount: 9_500 * 30,
      recipientName: "Sanusi",
      recipientPhone: "081245667831",
      deliveryAddress:
        "Kandang Ayam Petelur Sanusi, Kp. Pagedangan Ilir, Kronjo, Kabupaten Tangerang",
      paymentId: pendingPayment.id,
      createdAt: daysAgo(1),
      items: {
        create: [
          { productId: maggotSegar.id, quantityKg: 30, unitPrice: 9_500 },
        ],
      },
    },
  });

  const totalWaste = await db.impactRecord.aggregate({ _sum: { wasteKg: true } });

  console.log("\nSeed selesai.");
  console.log(
    `Total sampah tercatat: ${((totalWaste._sum.wasteKg ?? 0) / 1000).toFixed(1)} ton`,
  );
  console.log(`Password semua akun demo: ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

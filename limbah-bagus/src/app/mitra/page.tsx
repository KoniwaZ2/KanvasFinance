import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { guardPage } from "@/lib/auth";
import {
  formatDate,
  formatDateShort,
  formatKg,
  formatNumber,
  formatRupiah,
} from "@/lib/format";
import { processorTotal } from "@/lib/waste";
import {
  ButtonLink,
  EmptyState,
  InfoNote,
  Stat,
  StatusBadge,
} from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Penjemputan Saya",
  description:
    "Pantau lot sampah yang Anda ambil dari bursa, catat timbangan di lokasi, dan selesaikan pembayarannya.",
};

const METHOD_LABEL: Record<string, string> = {
  cash: "Tunai",
  qris: "QRIS",
};

type PurchaseRow = {
  id: string;
  status: string;
  pickupDate: Date;
  estimatedKg: number;
  estimatedAmount: number;
  actualKg: number | null;
  finalAmount: number | null;
  platformFee: number;
  listing: {
    tariff: { name: string };
    trader: { businessName: string; marketName: string; address: string };
  };
};

function startOfMonth(): Date {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfToday(): Date {
  const date = new Date();
  date.setHours(23, 59, 59, 999);
  return date;
}

function PickupRow({
  purchase,
  overdueBefore,
}: {
  purchase: PurchaseRow;
  overdueBefore?: Date;
}) {
  const due =
    overdueBefore !== undefined && purchase.pickupDate <= overdueBefore;
  const weighed = purchase.actualKg !== null && purchase.finalAmount !== null;

  return (
    <li className="flex flex-col gap-4 py-5 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[0.95rem] font-medium text-ink">
            {purchase.listing.trader.businessName}
          </p>
          {due ? (
            <span className="rounded-full bg-warning-soft px-3 py-1 text-xs font-medium text-warning">
              Jadwalnya hari ini atau sudah lewat
            </span>
          ) : null}
        </div>

        <p className="mt-1 text-sm text-ink-soft">
          {purchase.listing.trader.marketName},{" "}
          {purchase.listing.tariff.name}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">
          {purchase.listing.trader.address}
        </p>
        <p className="mt-2 text-sm text-ink-soft">
          Jemput {formatDate(purchase.pickupDate)}
        </p>
      </div>

      <div className="shrink-0 lg:text-right">
        <p className="text-xs text-ink-soft">
          {weighed ? "Hasil timbangan" : "Estimasi pedagang"}
        </p>
        <p className="text-[0.95rem] font-medium tabular-nums text-ink">
          {formatKg(weighed ? (purchase.actualKg ?? 0) : purchase.estimatedKg)}
        </p>

        <p className="mt-2 text-xs text-ink-soft">
          {weighed ? "Total yang harus dibayar" : "Perkiraan nilai"}
        </p>
        <p className="font-display text-xl font-semibold tabular-nums text-ink">
          {formatRupiah(
            weighed
              ? processorTotal(purchase.finalAmount ?? 0, purchase.platformFee)
              : purchase.estimatedAmount,
          )}
        </p>

        <Link
          href={`/mitra/penjemputan/${purchase.id}`}
          className="mt-3 inline-block text-sm font-medium text-accent underline-offset-4 hover:underline"
        >
          {weighed ? "Selesaikan pembayaran" : "Buka layar penjemputan"}
        </Link>
      </div>
    </li>
  );
}

export default async function MitraPage() {
  const user = await guardPage("PROCESSOR", "ADMIN");

  const profile =
    user.role === "PROCESSOR"
      ? await db.processorProfile.findUnique({ where: { userId: user.id } })
      : null;

  if (user.role === "PROCESSOR" && !profile) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          title="Unit pengolahan belum terdaftar"
          description="Akun Anda belum terhubung dengan data unit pengolahan maggot. Hubungi pengelola LimbahBagus untuk melengkapi profil unit Anda."
        />
      </div>
    );
  }

  const heading = profile ? profile.unitName : "Seluruh unit pengolahan";
  const subheading = profile
    ? profile.location
    : "Tampilan pengelola untuk semua unit di Kabupaten Tangerang";

  // Peternak maggot mandiri memakai bahan baku sendiri, jadi bursa dan
  // penjemputan tidak relevan sama sekali untuk akun ini.
  if (profile && !profile.buysWaste) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 md:py-16">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">
          {heading}
        </h1>
        <p className="mt-3 max-w-[62ch] leading-relaxed text-ink-soft">
          Akun Anda terdaftar sebagai peternak maggot mandiri yang memakai bahan
          baku sendiri, jadi tidak membeli sampah lewat bursa. Yang perlu Anda
          kelola di sini hanya produk hasil olahan dan stoknya.
        </p>

        <div className="mt-8">
          <ButtonLink href="/mitra/produk" size="lg">
            Kelola Produk dan Stok
          </ButtonLink>
        </div>

        <p className="mt-8 max-w-[62ch] text-sm leading-relaxed text-ink-soft">
          Kalau nanti ingin mulai membeli sampah organik dari pedagang pasar,
          hubungi pengelola LimbahBagus untuk mengubah jenis akun Anda.
        </p>
      </div>
    );
  }

  const scope = profile ? { processorId: profile.id } : {};
  const monthStart = startOfMonth();
  const today = endOfToday();

  const purchaseInclude = {
    listing: {
      include: {
        tariff: { select: { name: true } },
        trader: {
          select: { businessName: true, marketName: true, address: true },
        },
      },
    },
  } as const;

  const [
    monthAgg,
    scheduledCount,
    feeAgg,
    weighedList,
    scheduledList,
    awaitingList,
    recentPaid,
  ] = await Promise.all([
    db.wastePurchase.aggregate({
      _sum: { actualKg: true, finalAmount: true },
      where: { ...scope, status: "paid", paidAt: { gte: monthStart } },
    }),
    db.wastePurchase.count({ where: { ...scope, status: "scheduled" } }),
    db.wastePurchase.aggregate({
      _sum: { platformFee: true },
      where: { ...scope, status: "paid", feeStatus: "outstanding" },
    }),
    db.wastePurchase.findMany({
      where: { ...scope, status: "weighed" },
      include: purchaseInclude,
      orderBy: { weighedAt: "asc" },
    }),
    db.wastePurchase.findMany({
      where: { ...scope, status: "scheduled" },
      include: purchaseInclude,
      orderBy: { pickupDate: "asc" },
      take: 12,
    }),
    db.wastePurchase.findMany({
      where: { ...scope, status: "awaiting_cash_confirmation" },
      include: purchaseInclude,
      orderBy: { weighedAt: "desc" },
      take: 8,
    }),
    db.wastePurchase.findMany({
      where: { ...scope, status: "paid" },
      include: purchaseInclude,
      orderBy: { paidAt: "desc" },
      take: 5,
    }),
  ]);

  const outstandingFee = feeAgg._sum.platformFee ?? 0;
  const hasAnything =
    weighedList.length > 0 ||
    scheduledList.length > 0 ||
    awaitingList.length > 0 ||
    recentPaid.length > 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 md:py-16">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">
            {heading}
          </h1>
          <p className="mt-2 text-ink-soft">{subheading}</p>
        </div>

        <ButtonLink href="/mitra/bursa" size="lg">
          Cari Lot di Bursa
        </ButtonLink>
      </div>

      <div className="mt-12 grid gap-10 border-t border-line pt-10 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          value={formatKg(monthAgg._sum.actualKg ?? 0)}
          label="Sampah masuk bulan ini"
          note="Berdasarkan timbangan pada transaksi yang sudah lunas"
        />
        <Stat
          value={formatRupiah(monthAgg._sum.finalAmount ?? 0)}
          label="Dibayar ke pedagang bulan ini"
          note="Nilai sampah, belum termasuk biaya layanan"
        />
        <Stat
          value={formatNumber(scheduledCount)}
          label="Penjemputan terjadwal"
          note="Lot yang sudah Anda ambil dan belum dijemput"
        />
        <Stat
          value={formatRupiah(outstandingFee)}
          label="Biaya layanan tertunggak"
          note="Dari transaksi tunai, ditagih berkala oleh pengelola"
        />
      </div>

      {!hasAnything ? (
        <div className="mt-12">
          <EmptyState
            title="Belum ada penjemputan"
            description="Anda belum mengambil lot apa pun. Lihat lot yang sedang ditawarkan pedagang pasar di bursa, lalu tentukan tanggal jemputnya."
            action={<ButtonLink href="/mitra/bursa">Buka Bursa</ButtonLink>}
          />
        </div>
      ) : (
        <>
          <section className="mt-16">
            <h2 className="font-display text-xl font-semibold text-ink">
              Perlu dikerjakan
            </h2>
            <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-ink-soft">
              Sampah yang sudah ditimbang tapi belum dibayar berada di urutan
              paling atas. Pedagang menunggu uangnya di situ.
            </p>

            {weighedList.length === 0 && scheduledList.length === 0 ? (
              <div className="mt-6">
                <EmptyState
                  title="Tidak ada pekerjaan lapangan yang tertunda"
                  description="Semua lot yang Anda ambil sudah selesai ditangani. Ambil lot baru di bursa kalau kapasitas olah masih lapang."
                  action={
                    <ButtonLink href="/mitra/bursa" variant="ghost">
                      Buka Bursa
                    </ButtonLink>
                  }
                />
              </div>
            ) : (
              <ul className="mt-6 divide-y divide-line border-y border-line">
                {weighedList.map((purchase) => (
                  <PickupRow key={purchase.id} purchase={purchase} />
                ))}
                {scheduledList.map((purchase) => (
                  <PickupRow
                    key={purchase.id}
                    purchase={purchase}
                    overdueBefore={today}
                  />
                ))}
              </ul>
            )}
          </section>

          {awaitingList.length > 0 ? (
            <section className="mt-14">
              <h2 className="font-display text-xl font-semibold text-ink">
                Menunggu konfirmasi pedagang
              </h2>
              <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-ink-soft">
                Anda sudah menyerahkan uang tunai untuk lot berikut. Transaksi
                ditutup setelah pedagang mengakui uangnya diterima, jadi tidak
                ada yang perlu Anda kerjakan di sini.
              </p>

              <ul className="mt-6 divide-y divide-line border-y border-line">
                {awaitingList.map((purchase) => (
                  <li
                    key={purchase.id}
                    className="flex flex-wrap items-start justify-between gap-3 py-4"
                  >
                    <div className="min-w-0">
                      <p className="text-[0.95rem] font-medium text-ink">
                        {purchase.listing.trader.businessName}
                      </p>
                      <p className="mt-1 text-sm text-ink-soft">
                        {purchase.listing.tariff.name},{" "}
                        {formatKg(purchase.actualKg ?? 0)}, dibayar tunai
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[0.95rem] font-medium tabular-nums text-ink">
                        {formatRupiah(purchase.finalAmount ?? 0)}
                      </p>
                      <div className="mt-2">
                        <StatusBadge status={purchase.status} />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {outstandingFee > 0 ? (
            <div className="mt-10">
              <InfoNote>
                Biaya layanan tertunggak Anda saat ini{" "}
                <span className="tabular-nums">
                  {formatRupiah(outstandingFee)}
                </span>
                . Ini berasal dari transaksi tunai, karena uangnya berpindah
                langsung di lokasi dan tidak lewat aplikasi. Pengelola menagihnya
                berkala di luar aplikasi.
              </InfoNote>
            </div>
          ) : null}

          <section className="mt-14">
            <h2 className="font-display text-xl font-semibold text-ink">
              Pembelian lunas terakhir
            </h2>

            {recentPaid.length === 0 ? (
              <div className="mt-6">
                <EmptyState
                  title="Belum ada pembelian lunas"
                  description="Riwayat pembelian yang sudah dibayar tampil di sini setelah transaksi pertama Anda selesai."
                />
              </div>
            ) : (
              <ul className="mt-6 divide-y divide-line border-y border-line">
                {recentPaid.map((purchase) => (
                  <li
                    key={purchase.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-4"
                  >
                    <div className="min-w-0">
                      <p className="text-[0.95rem] text-ink">
                        {purchase.listing.trader.businessName}
                      </p>
                      <p className="mt-1 text-sm text-ink-soft">
                        {purchase.paidAt
                          ? formatDateShort(purchase.paidAt)
                          : formatDateShort(purchase.pickupDate)}
                        {purchase.paymentMethod
                          ? `, ${METHOD_LABEL[purchase.paymentMethod] ?? purchase.paymentMethod}`
                          : ""}
                        {", "}
                        {formatKg(purchase.actualKg ?? 0)}
                      </p>
                    </div>
                    <p className="text-[0.95rem] font-medium tabular-nums text-ink">
                      {formatRupiah(purchase.finalAmount ?? 0)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <p className="mt-12 text-sm text-ink-soft">
        <Link href="/mitra/produk" className="underline hover:text-ink">
          Kelola produk dan stok hasil olahan
        </Link>
      </p>
    </div>
  );
}

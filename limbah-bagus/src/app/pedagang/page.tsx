import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { guardPage } from "@/lib/auth";
import {
  ButtonLink,
  EmptyState,
  InfoNote,
  Stat,
  StatusBadge,
} from "@/components/ui";
import {
  formatDate,
  formatKg,
  formatRupiah,
} from "@/lib/format";
import { lotValue, readyWindowLabel } from "@/lib/waste";
import { OfficialPriceLine } from "@/components/sale-card";
import { ConfirmCashForm } from "./penjualan/[id]/confirm-cash-form";
import { CancelLotForm } from "./penjualan/cancel-lot-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Beranda Pedagang",
  description: "Jual sampah organik Anda dan pantau uang yang masuk.",
};

export default async function PedagangPage() {
  const user = await guardPage("TRADER");

  const trader = await db.traderProfile.findUnique({
    where: { userId: user.id },
  });

  if (!trader) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 md:py-16">
        <EmptyState
          title="Data usaha belum lengkap"
          description="Akun Anda belum terhubung dengan data lapak. Lengkapi dulu supaya sampah Anda bisa ditawarkan ke pengolah."
          action={<ButtonLink href="/daftar-pedagang">Lengkapi data usaha</ButtonLink>}
        />
      </div>
    );
  }

  const [
    listingCount,
    paidSummary,
    openLots,
    pendingPayoutSummary,
    needsAction,
    scheduled,
  ] = await Promise.all([
    db.wasteListing.count({ where: { traderId: trader.id } }),
    db.wastePurchase.aggregate({
      where: { listing: { traderId: trader.id }, status: "paid" },
      _sum: { finalAmount: true, actualKg: true },
    }),
    db.wasteListing.findMany({
      where: { traderId: trader.id, status: "open" },
      include: { tariff: true },
      orderBy: { readyDate: "asc" },
    }),
    db.payout.aggregate({
      where: { traderId: trader.id, status: "pending" },
      _sum: { amount: true },
    }),
    db.wastePurchase.findMany({
      where: {
        listing: { traderId: trader.id },
        status: "awaiting_cash_confirmation",
      },
      include: {
        listing: { include: { tariff: true } },
        processor: { select: { unitName: true } },
      },
      orderBy: { weighedAt: "desc" },
    }),
    db.wastePurchase.findMany({
      where: { listing: { traderId: trader.id }, status: "scheduled" },
      include: {
        listing: { include: { tariff: true } },
        processor: { select: { unitName: true, location: true } },
      },
      orderBy: { pickupDate: "asc" },
      take: 5,
    }),
  ]);

  const payoutAccountReady = Boolean(
    trader.payoutBankName &&
      trader.payoutAccountNumber &&
      trader.payoutAccountName,
  );

  const header = (
    <div>
      <h1 className="font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">
        {trader.businessName}
      </h1>
      <p className="mt-2 text-ink-soft">
        {trader.marketName}, Kabupaten Tangerang
      </p>
    </div>
  );

  // Pedagang baru tidak diberi tabel kosong, tapi diberi tahu cara kerjanya.
  if (listingCount === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 md:py-16">
        {header}

        <p className="mt-6 max-w-[60ch] text-lg leading-relaxed text-ink">
          Sampah organik lapak Anda ada harganya. Tawarkan sekarang, pengolah
          maggot yang menjemput ke tempat Anda, dan uangnya dibayar di hari yang
          sama.
        </p>

        <ol className="mt-10 space-y-6 border-t border-line pt-8">
          {[
            {
              title: "Pasang lot sampah",
              body: "Pilih jenis sampahnya, tulis perkiraan beratnya, lalu tentukan kapan siap dijemput. Harga sudah ditetapkan pemerintah, Anda tidak perlu menawar.",
            },
            {
              title: "Pengolah menjemput dan menimbang",
              body: "Pengolah maggot datang ke lapak Anda dan menimbang sampahnya di tempat. Berat timbangan itulah yang menentukan uangnya, bukan perkiraan awal.",
            },
            {
              title: "Uang dibayar di tempat",
              body: "Dibayar tunai langsung, atau lewat QRIS yang dananya masuk ke rekening Anda pada hari berikutnya.",
            },
          ].map((step, index) => (
            <li key={step.title} className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold tabular-nums text-accent">
                {index + 1}
              </span>
              <div>
                <p className="font-medium text-ink">{step.title}</p>
                <p className="mt-1 max-w-[55ch] text-sm leading-relaxed text-ink-soft">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-10">
          <ButtonLink href="/pedagang/jual" size="lg">
            Pasang Lot Pertama
          </ButtonLink>
        </div>

        <p className="mt-6 text-sm text-ink-soft">
          Ingin tahu harga tiap jenis sampah lebih dulu?{" "}
          <Link href="/harga-sampah" className="underline hover:text-ink">
            Lihat daftar harga resmi
          </Link>
        </p>
      </div>
    );
  }

  const totalIncome = paidSummary._sum.finalAmount ?? 0;
  const totalSoldKg = paidSummary._sum.actualKg ?? 0;
  const pendingPayout = pendingPayoutSummary._sum.amount ?? 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 md:py-16">
      <div className="flex flex-wrap items-start justify-between gap-4">
        {header}
        <ButtonLink href="/pedagang/jual">Pasang Lot Baru</ButtonLink>
      </div>

      <div className="mt-10 grid gap-8 border-t border-line pt-10 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          value={formatRupiah(totalIncome)}
          label="Uang diterima"
          note="Dari penjualan yang sudah lunas"
        />
        <Stat
          value={formatKg(totalSoldKg)}
          label="Sampah terjual"
          note="Berat hasil timbangan di lokasi"
        />
        <Stat
          value={String(openLots.length)}
          label="Lot menunggu pembeli"
          note="Masih terbuka di bursa"
        />
        <Stat
          value={formatRupiah(pendingPayout)}
          label="Menunggu cair"
          note="Pembayaran QRIS yang belum masuk rekening"
        />
      </div>

      {needsAction.length > 0 ? (
        <section className="mt-14">
          <h2 className="font-display text-xl font-semibold text-ink">
            Butuh tindakan Anda
          </h2>
          <p className="mt-2 max-w-[60ch] text-sm leading-relaxed text-ink-soft">
            Pengolah menyatakan sudah menyerahkan uang tunai. Penjualan ini belum
            ditutup sampai Anda sendiri yang mengakui uangnya sudah diterima.
          </p>

          <ul className="mt-6 space-y-4">
            {needsAction.map((purchase) => (
              <li
                key={purchase.id}
                className="rounded-xl border border-warning/40 bg-warning-soft p-5 sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-ink">
                      {purchase.listing.tariff.name}
                    </p>
                    <p className="mt-1 text-sm text-ink-soft">
                      Dijemput {purchase.processor.unitName},{" "}
                      {formatDate(purchase.pickupDate)}
                    </p>
                  </div>
                  <StatusBadge status={purchase.status} />
                </div>

                <p className="mt-4 text-xs text-ink-soft">
                  Uang yang harus Anda terima
                </p>
                <p className="font-display text-3xl font-semibold tabular-nums tracking-tight text-ink sm:text-4xl">
                  {formatRupiah(purchase.finalAmount ?? 0)}
                </p>
                <p className="mt-1 text-sm tabular-nums text-ink-soft">
                  Timbangan {formatKg(purchase.actualKg ?? 0)}, perkiraan awal{" "}
                  {formatKg(purchase.estimatedKg)}
                </p>

                <div className="mt-5">
                  <ConfirmCashForm purchaseId={purchase.id} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!payoutAccountReady ? (
        <div className="mt-14">
          <InfoNote>
            Rekening pencairan belum diisi. Selama rekening belum diisi, pembeli
            hanya bisa membayar tunai.{" "}
            <Link
              href="/pedagang/pencairan"
              className="font-medium text-ink underline"
            >
              Isi rekening sekarang
            </Link>
          </InfoNote>
        </div>
      ) : null}

      <section className="mt-14">
        <h2 className="font-display text-xl font-semibold text-ink">
          Penjemputan terjadwal
        </h2>

        {scheduled.length > 0 ? (
          <ul className="mt-6 divide-y divide-line border-t border-line">
            {scheduled.map((purchase) => (
              <li key={purchase.id} className="py-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-ink">
                      {purchase.processor.unitName}
                    </p>
                    <p className="mt-1 text-sm text-ink-soft">
                      {purchase.listing.tariff.name}, {purchase.processor.location}
                    </p>
                    <p className="mt-1 text-sm text-ink-soft">
                      Dijemput {formatDate(purchase.pickupDate)}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-sm font-medium tabular-nums text-ink">
                      {formatKg(purchase.estimatedKg)}
                    </p>
                    <p className="mt-1 text-sm tabular-nums text-ink-soft">
                      Perkiraan {formatRupiah(purchase.estimatedAmount)}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-ink-soft">
                  Nilai akhir mengikuti hasil timbangan saat sampah dijemput.
                </p>
                <Link
                  href={`/pedagang/penjualan/${purchase.listingId}`}
                  className="mt-2 inline-block text-sm font-medium text-accent underline-offset-4 hover:underline"
                >
                  Lihat rincian
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-6">
            <EmptyState
              title="Belum ada penjemputan terjadwal"
              description="Jadwal muncul di sini setelah ada pengolah yang mengambil lot Anda dari bursa."
            />
          </div>
        )}
      </section>

      <section className="mt-14">
        <h2 className="font-display text-xl font-semibold text-ink">
          Lot yang masih terbuka
        </h2>
        <p className="mt-2 max-w-[60ch] text-sm leading-relaxed text-ink-soft">
          Lot ini sedang ditawarkan ke pengolah. Selama belum ada yang mengambil,
          Anda masih bisa menariknya.
        </p>

        {openLots.length > 0 ? (
          <ul className="mt-6 divide-y divide-line border-t border-line">
            {openLots.map((lot) => (
              <li key={lot.id} className="py-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-ink">{lot.tariff.name}</p>
                    <p className="mt-1 text-sm tabular-nums text-ink-soft">
                      {formatKg(lot.estimatedKg)}, perkiraan{" "}
                      {formatRupiah(lotValue(lot.tariff.pricePerKg, lot.estimatedKg))}
                    </p>
                    <p className="mt-1 text-sm text-ink-soft">
                      Siap {formatDate(lot.readyDate)},{" "}
                      {readyWindowLabel(lot.readyWindow)}
                    </p>
                    <div className="mt-3">
                      <OfficialPriceLine pricePerKg={lot.tariff.pricePerKg} />
                    </div>
                  </div>
                  <CancelLotForm listingId={lot.id} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-6">
            <EmptyState
              title="Tidak ada lot yang terbuka"
              description="Semua lot Anda sudah diambil pengolah atau sudah selesai. Pasang lot baru kalau sampah hari ini sudah terkumpul."
              action={<ButtonLink href="/pedagang/jual">Pasang Lot Baru</ButtonLink>}
            />
          </div>
        )}
      </section>

      <p className="mt-12 text-sm text-ink-soft">
        <Link href="/pedagang/penjualan" className="underline hover:text-ink">
          Lihat semua penjualan
        </Link>
      </p>
    </div>
  );
}

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
import { formatDate, formatRupiah } from "@/lib/format";
import { AccountForm } from "./account-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pencairan Dana",
  description: "Rekening tujuan dan riwayat pencairan hasil penjualan sampah.",
};

export default async function PencairanPage() {
  const user = await guardPage("TRADER");

  const trader = await db.traderProfile.findUnique({
    where: { userId: user.id },
  });

  if (!trader) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 md:py-16">
        <EmptyState
          title="Data usaha belum lengkap"
          description="Akun Anda belum terhubung dengan data lapak, jadi rekening pencairan belum bisa diisi."
          action={<ButtonLink href="/daftar-pedagang">Lengkapi data usaha</ButtonLink>}
        />
      </div>
    );
  }

  const payouts = await db.payout.findMany({
    where: { traderId: trader.id },
    orderBy: { createdAt: "desc" },
    include: {
      purchase: {
        include: { listing: { include: { tariff: { select: { name: true } } } } },
      },
    },
  });

  const settledTotal = payouts
    .filter((payout) => payout.status === "settled")
    .reduce((sum, payout) => sum + payout.amount, 0);

  const pendingTotal = payouts
    .filter((payout) => payout.status === "pending")
    .reduce((sum, payout) => sum + payout.amount, 0);

  const accountReady = Boolean(
    trader.payoutBankName &&
      trader.payoutAccountNumber &&
      trader.payoutAccountName,
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:py-16">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">
        Pencairan dana
      </h1>
      <p className="mt-3 max-w-[60ch] leading-relaxed text-ink-soft">
        Pembayaran tunai langsung berpindah di lapak Anda. Yang dicairkan lewat
        halaman ini hanya pembayaran QRIS, karena uangnya singgah dulu di akun
        LimbahBagus sebelum diteruskan ke rekening Anda.
      </p>

      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold text-ink">
          Rekening tujuan
        </h2>
        <p className="mt-2 max-w-[60ch] text-sm leading-relaxed text-ink-soft">
          Isi rekening Anda supaya pembeli bisa membayar lewat QRIS. Selama
          rekening belum diisi, pembeli hanya bisa membayar tunai.
        </p>

        {!accountReady ? (
          <div className="mt-5">
            <InfoNote>
              Rekening belum diisi. Anda tetap bisa berjualan dan menerima uang
              tunai seperti biasa.
            </InfoNote>
          </div>
        ) : null}

        <div className="mt-6">
          <AccountForm
            bankName={trader.payoutBankName ?? ""}
            accountNumber={trader.payoutAccountNumber ?? ""}
            accountName={trader.payoutAccountName ?? ""}
          />
        </div>
      </section>

      <div className="mt-14 grid gap-8 border-t border-line pt-10 sm:grid-cols-2">
        <Stat
          value={formatRupiah(settledTotal)}
          label="Sudah cair"
          note="Sudah masuk ke rekening Anda"
        />
        <Stat
          value={formatRupiah(pendingTotal)}
          label="Dalam antrean"
          note="Menunggu jadwal pencairan"
        />
      </div>

      <section className="mt-14">
        <h2 className="font-display text-xl font-semibold text-ink">
          Riwayat pencairan
        </h2>

        {payouts.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              title="Belum ada pencairan"
              description="Pencairan hanya muncul untuk penjualan yang dibayar lewat QRIS. Penjualan yang dibayar tunai tidak masuk daftar ini karena uangnya sudah Anda terima di tempat."
              action={<ButtonLink href="/pedagang/penjualan">Lihat penjualan saya</ButtonLink>}
            />
          </div>
        ) : (
          <ul className="mt-6 divide-y divide-line border-t border-line">
            {payouts.map((payout) => (
              <li key={payout.id} className="py-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display text-xl font-semibold tabular-nums text-ink">
                      {formatRupiah(payout.amount)}
                    </p>
                    <p className="mt-1 text-sm text-ink-soft">
                      Dari penjualan {payout.purchase.listing.tariff.name}
                    </p>
                  </div>
                  <StatusBadge status={payout.status} />
                </div>

                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex flex-wrap justify-between gap-2">
                    <dt className="text-ink-soft">Dijadwalkan cair</dt>
                    <dd className="text-ink">{formatDate(payout.scheduledAt)}</dd>
                  </div>

                  {payout.settledAt ? (
                    <div className="flex flex-wrap justify-between gap-2">
                      <dt className="text-ink-soft">Tanggal cair</dt>
                      <dd className="text-ink">{formatDate(payout.settledAt)}</dd>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap justify-between gap-2">
                    <dt className="text-ink-soft">Rekening tujuan</dt>
                    <dd className="tabular-nums text-ink">
                      {payout.bankName} {payout.accountNumber}
                    </dd>
                  </div>

                  {payout.reference ? (
                    <div className="flex flex-wrap justify-between gap-2">
                      <dt className="text-ink-soft">Nomor referensi</dt>
                      <dd className="tabular-nums text-ink">{payout.reference}</dd>
                    </div>
                  ) : null}
                </dl>

                {payout.status === "failed" ? (
                  <p className="mt-3 text-sm leading-relaxed text-danger">
                    {payout.failureReason
                      ? `Gagal: ${payout.failureReason}`
                      : "Pencairan gagal. Periksa kembali nomor rekening Anda, lalu hubungi pengelola."}
                  </p>
                ) : null}

                <Link
                  href={`/pedagang/penjualan/${payout.purchase.listingId}`}
                  className="mt-3 inline-block text-sm font-medium text-accent underline-offset-4 hover:underline"
                >
                  Lihat penjualannya
                </Link>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-8 text-sm leading-relaxed text-ink-soft">
          Transfer ke rekening masih diproses pengelola LimbahBagus satu per
          satu, belum otomatis. Kalau dana belum masuk sesudah tanggal yang
          dijadwalkan, hubungi pengelola lewat petugas pasar.
        </p>
      </section>

      <p className="mt-12 text-sm text-ink-soft">
        <Link href="/pedagang" className="underline hover:text-ink">
          Kembali ke beranda
        </Link>
      </p>
    </div>
  );
}

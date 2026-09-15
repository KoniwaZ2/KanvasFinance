import Link from "next/link";
import type { ReactNode } from "react";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { guardPage } from "@/lib/auth";
import { formatDate, formatKg, formatRupiah } from "@/lib/format";
import {
  lotValue,
  PLATFORM_FEE_PER_TRANSACTION,
  readyWindowLabel,
} from "@/lib/waste";
import { ButtonLink, EmptyState, StatusBadge } from "@/components/ui";
import { ClaimForm } from "./claim-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bursa Sampah Organik",
  description:
    "Lot sampah organik yang ditawarkan pedagang pasar, dengan harga resmi yang sama di semua pedagang.",
};

type SearchParams = Promise<{ jenis?: string; pasar?: string }>;

function toInputDate(value: Date): string {
  const local = new Date(value);
  local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
  return local.toISOString().slice(0, 10);
}

/** Tautan filter dibangun di server supaya daftar tetap bisa dibagikan lewat URL. */
function filterHref(current: { jenis?: string; pasar?: string }, patch: {
  jenis?: string | null;
  pasar?: string | null;
}): string {
  const next = new URLSearchParams();
  const jenis = patch.jenis === undefined ? current.jenis : patch.jenis;
  const pasar = patch.pasar === undefined ? current.pasar : patch.pasar;

  if (jenis) next.set("jenis", jenis);
  if (pasar) next.set("pasar", pasar);

  const query = next.toString();
  return query ? `/mitra/bursa?${query}` : "/mitra/bursa";
}

function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`rounded-full border px-4 py-2 text-sm transition-colors ${
        active
          ? "border-accent bg-accent-soft text-accent"
          : "border-line text-ink-soft hover:bg-surface-sunken"
      }`}
    >
      {children}
    </Link>
  );
}

export default async function BursaPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await guardPage("PROCESSOR", "ADMIN");
  const params = await searchParams;
  const jenis = params.jenis?.trim() || undefined;
  const pasar = params.pasar?.trim() || undefined;

  const profile =
    user.role === "PROCESSOR"
      ? await db.processorProfile.findUnique({ where: { userId: user.id } })
      : null;

  const canBuy = user.role === "ADMIN" || profile?.buysWaste === true;

  const [listings, tariffs, marketRows] = await Promise.all([
    db.wasteListing.findMany({
      where: {
        status: { in: ["open", "reserved"] },
        ...(jenis ? { tariffId: jenis } : {}),
        ...(pasar ? { trader: { marketName: pasar } } : {}),
      },
      include: {
        tariff: true,
        trader: {
          select: { businessName: true, marketName: true },
        },
      },
      orderBy: [{ status: "asc" }, { readyDate: "asc" }],
      take: 60,
    }),
    db.wasteTariff.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    db.wasteListing.findMany({
      where: { status: { in: ["open", "reserved"] } },
      select: { traderId: true, trader: { select: { marketName: true } } },
      distinct: ["traderId"],
    }),
  ]);

  const markets = Array.from(
    new Set(marketRows.map((row) => row.trader.marketName)),
  ).sort((a, b) => a.localeCompare(b, "id-ID"));

  const openCount = listings.filter((item) => item.status === "open").length;
  const hasFilter = Boolean(jenis || pasar);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 md:py-16">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">
        Bursa sampah organik
      </h1>
      <p className="mt-3 max-w-[62ch] leading-relaxed text-ink-soft">
        Lot yang ditawarkan pedagang pasar hari ini. Harga sudah ditetapkan
        pemerintah daerah dan tidak bisa ditawar, jadi yang Anda pilih hanya
        jenis sampah, jumlah, dan kapan menjemputnya.
      </p>
      <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-ink-soft">
        Setiap pembelian dikenakan biaya layanan{" "}
        <span className="tabular-nums">
          {formatRupiah(PLATFORM_FEE_PER_TRANSACTION)}
        </span>{" "}
        per transaksi, ditanggung pengolah di atas nilai sampah. Pedagang tetap
        menerima utuh sesuai timbangan.
      </p>

      {!canBuy ? (
        <div className="mt-10">
          <EmptyState
            title="Akun Anda tidak membeli sampah dari bursa"
            description="Unit Anda terdaftar sebagai peternak maggot mandiri yang memakai bahan baku sendiri. Hubungi pengelola LimbahBagus kalau ingin mulai membeli lot dari pedagang pasar."
            action={
              <ButtonLink href="/mitra" variant="ghost">
                Kembali ke dashboard
              </ButtonLink>
            }
          />
        </div>
      ) : (
        <>
          <div className="mt-10 border-y border-line py-5">
            <p className="text-sm font-medium text-ink">Jenis sampah</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {tariffs.map((tariff) => (
                <FilterChip
                  key={tariff.id}
                  href={filterHref(
                    { jenis, pasar },
                    { jenis: jenis === tariff.id ? null : tariff.id },
                  )}
                  active={jenis === tariff.id}
                >
                  {tariff.name}
                </FilterChip>
              ))}
            </div>

            {markets.length > 0 ? (
              <>
                <p className="mt-5 text-sm font-medium text-ink">Pasar</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {markets.map((market) => (
                    <FilterChip
                      key={market}
                      href={filterHref(
                        { jenis, pasar },
                        { pasar: pasar === market ? null : market },
                      )}
                      active={pasar === market}
                    >
                      {market}
                    </FilterChip>
                  ))}
                </div>
              </>
            ) : null}

            {hasFilter ? (
              <Link
                href="/mitra/bursa"
                className="mt-5 inline-block text-sm font-medium text-accent underline-offset-4 hover:underline"
              >
                Hapus semua filter
              </Link>
            ) : null}
          </div>

          {listings.length === 0 ? (
            <div className="mt-10">
              <EmptyState
                title={
                  hasFilter
                    ? "Tidak ada lot yang cocok dengan filter ini"
                    : "Belum ada lot terbuka saat ini"
                }
                description={
                  hasFilter
                    ? "Coba hapus filternya untuk melihat seluruh lot yang sedang ditawarkan."
                    : "Pedagang pasar biasanya memasang lot pada pagi hari setelah sortiran dagangan selesai. Periksa lagi menjelang siang."
                }
                action={
                  hasFilter ? (
                    <ButtonLink href="/mitra/bursa" variant="ghost">
                      Hapus filter
                    </ButtonLink>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <>
              <p className="mt-8 text-sm text-ink-soft">
                <span className="tabular-nums">{openCount}</span> lot terbuka
                dari <span className="tabular-nums">{listings.length}</span> lot
                yang ditampilkan.
              </p>

              <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {listings.map((listing) => {
                  const taken = listing.status !== "open";
                  const estimatedAmount = lotValue(
                    listing.tariff.pricePerKg,
                    listing.estimatedKg,
                  );

                  return (
                    <article
                      key={listing.id}
                      className={`flex flex-col rounded-xl border border-line bg-surface-raised p-5 ${
                        taken ? "opacity-60" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h2 className="font-display text-lg font-semibold text-ink">
                          {listing.tariff.name}
                        </h2>
                        {taken ? <StatusBadge status={listing.status} /> : null}
                      </div>

                      <p className="mt-1 text-sm text-ink-soft">
                        {listing.trader.marketName}, {listing.trader.businessName}
                      </p>

                      <div className="mt-5 rounded-xl bg-surface-sunken px-4 py-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-ink-soft">
                              Estimasi berat
                            </p>
                            <p className="mt-1 text-[0.95rem] font-medium tabular-nums text-ink">
                              {formatKg(listing.estimatedKg)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-ink-soft">Harga per kg</p>
                            <p className="mt-1 text-[0.95rem] font-medium tabular-nums text-ink">
                              {formatRupiah(listing.tariff.pricePerKg)}
                            </p>
                          </div>
                        </div>

                        <p className="mt-4 text-xs text-ink-soft">
                          Perkiraan nilai lot
                        </p>
                        <p className="font-display text-2xl font-semibold tabular-nums tracking-tight text-ink sm:text-3xl">
                          {formatRupiah(estimatedAmount)}
                        </p>
                        <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                          Masih perkiraan. Nilai yang mengikat adalah hasil
                          timbangan Anda di lokasi.
                        </p>
                      </div>

                      <dl className="mt-5 space-y-2 text-sm">
                        <div className="flex flex-wrap justify-between gap-2">
                          <dt className="text-ink-soft">Siap dijemput</dt>
                          <dd className="text-ink">
                            {formatDate(listing.readyDate)},{" "}
                            {readyWindowLabel(listing.readyWindow)}
                          </dd>
                        </div>
                      </dl>

                      {listing.note ? (
                        <p className="mt-4 rounded-xl bg-surface-sunken px-4 py-3 text-sm leading-relaxed text-ink-soft">
                          Catatan pedagang: {listing.note}
                        </p>
                      ) : null}

                      <p className="mt-4 text-xs leading-relaxed text-ink-soft">
                        Harga resmi, sama di semua pedagang.{" "}
                        <Link
                          href="/harga-sampah"
                          className="underline hover:text-ink"
                        >
                          Lihat daftar harga
                        </Link>
                      </p>

                      <div className="mt-5 border-t border-line pt-5">
                        {taken ? (
                          <button
                            type="button"
                            disabled
                            className="h-11 w-full rounded-full border border-line bg-transparent text-[0.95rem] font-medium text-ink-soft"
                          >
                            Sudah Diambil
                          </button>
                        ) : (
                          <ClaimForm
                            listingId={listing.id}
                            defaultPickupDate={toInputDate(listing.readyDate)}
                          />
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      <p className="mt-10 text-sm text-ink-soft">
        <Link href="/mitra" className="underline hover:text-ink">
          Kembali ke daftar penjemputan saya
        </Link>
      </p>
    </div>
  );
}

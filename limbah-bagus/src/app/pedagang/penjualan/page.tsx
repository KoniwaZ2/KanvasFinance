import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { guardPage } from "@/lib/auth";
import { ButtonLink, EmptyState } from "@/components/ui";
import { SaleCard, type SaleCardData } from "@/components/sale-card";
import { lotValue } from "@/lib/waste";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Penjualan Saya",
  description: "Semua lot sampah yang pernah Anda pasang beserta uangnya.",
};

export default async function PenjualanPage() {
  const user = await guardPage("TRADER");

  const trader = await db.traderProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  if (!trader) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 md:py-16">
        <EmptyState
          title="Data usaha belum lengkap"
          description="Akun Anda belum terhubung dengan data lapak, jadi belum ada penjualan yang bisa ditampilkan."
          action={<ButtonLink href="/daftar-pedagang">Lengkapi data usaha</ButtonLink>}
        />
      </div>
    );
  }

  const listings = await db.wasteListing.findMany({
    where: { traderId: trader.id },
    orderBy: { createdAt: "desc" },
    include: {
      tariff: true,
      purchase: {
        include: {
          processor: { select: { unitName: true } },
          payout: true,
        },
      },
    },
  });

  const sales: SaleCardData[] = listings.map((listing) => {
    const purchase = listing.purchase;

    return {
      listingId: listing.id,
      tariffName: listing.tariff.name,
      // Tarif yang tercatat di pembelian menang, supaya perubahan harga
      // di kemudian hari tidak mengubah transaksi yang sudah berjalan.
      pricePerKg: purchase?.unitPricePerKg ?? listing.tariff.pricePerKg,
      status: purchase ? purchase.status : listing.status,
      estimatedKg: listing.estimatedKg,
      estimatedAmount:
        purchase?.estimatedAmount ??
        lotValue(listing.tariff.pricePerKg, listing.estimatedKg),
      actualKg: purchase?.actualKg ?? null,
      finalAmount: purchase?.finalAmount ?? null,
      processorName: purchase?.processor.unitName ?? null,
      readyDate: listing.readyDate,
      readyWindow: listing.readyWindow,
      pickupDate: purchase?.pickupDate ?? null,
      paymentMethod: purchase?.paymentMethod ?? null,
      payoutStatus: purchase?.payout?.status ?? null,
      payoutScheduledAt: purchase?.payout?.scheduledAt ?? null,
    };
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 md:py-16">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">
            Penjualan saya
          </h1>
          <p className="mt-3 max-w-[60ch] leading-relaxed text-ink-soft">
            Semua lot yang pernah Anda pasang, dari yang terbaru. Perkiraan dan
            hasil timbangan selalu ditampilkan berdampingan supaya jelas.
          </p>
        </div>
        <ButtonLink href="/pedagang/jual">Pasang Lot Baru</ButtonLink>
      </div>

      <div className="mt-10">
        {sales.length === 0 ? (
          <EmptyState
            title="Belum ada penjualan"
            description="Anda belum pernah memasang lot sampah. Pasang lot pertama, lalu pengolah maggot yang akan menjemput ke lapak Anda."
            action={<ButtonLink href="/pedagang/jual">Pasang Lot Pertama</ButtonLink>}
          />
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {sales.map((sale) => (
              <SaleCard key={sale.listingId} sale={sale} />
            ))}
          </div>
        )}
      </div>

      <p className="mt-12 text-sm text-ink-soft">
        <Link href="/pedagang" className="underline hover:text-ink">
          Kembali ke beranda
        </Link>
      </p>
    </div>
  );
}

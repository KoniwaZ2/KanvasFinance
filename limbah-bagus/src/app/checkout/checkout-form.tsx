"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  ButtonLink,
  Card,
  EmptyState,
  ErrorNote,
  Field,
  InfoNote,
  SkeletonRow,
  inputClass,
  textareaClass,
} from "@/components/ui";
import { useCartProducts } from "@/components/use-cart-products";
import { clearCart } from "@/lib/cart";
import { formatRupiah } from "@/lib/format";

type CreateOrderResponse = {
  orderId?: string;
  midtransOrderId?: string;
  qrisUrl?: string | null;
  message?: string;
};

export function CheckoutForm({
  defaultName,
  defaultPhone,
}: {
  defaultName: string;
  defaultPhone: string;
}) {
  const router = useRouter();
  const { rows, total, loading, error, hasStockProblem, isEmpty } =
    useCartProducts();

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const formData = new FormData(event.currentTarget);

    const payload = {
      recipientName: String(formData.get("recipientName") ?? "").trim(),
      recipientPhone: String(formData.get("recipientPhone") ?? "").trim(),
      deliveryAddress: String(formData.get("deliveryAddress") ?? "").trim(),
      items: rows.map((row) => ({
        productId: row.product.id,
        quantityKg: row.line.quantityKg,
      })),
    };

    if (payload.items.length === 0) {
      setFormError("Keranjang kosong. Tambahkan produk terlebih dahulu.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as CreateOrderResponse;

      if (!response.ok || !data.orderId) {
        setFormError(
          data.message ?? "Pesanan gagal dibuat. Coba beberapa saat lagi.",
        );
        setSubmitting(false);
        return;
      }

      // Pesanan sudah tercatat di server dengan status menunggu pembayaran dan
      // kode QRIS-nya sudah terbit. Keranjang dikosongkan, lalu pembayaran
      // dilanjutkan di halaman pesanan yang menampilkan status sebenarnya dari
      // database.
      clearCart();
      router.push(`/pesanan/${data.orderId}`);
    } catch {
      setFormError(
        "Pesanan gagal dikirim. Periksa koneksi internet lalu coba lagi.",
      );
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonRow className="h-40" />
        <SkeletonRow className="h-24" />
      </div>
    );
  }

  if (error) {
    return <ErrorNote>{error}</ErrorNote>;
  }

  if (isEmpty || rows.length === 0) {
    return (
      <EmptyState
        title="Belum ada produk untuk dibayar"
        description="Keranjang kosong, jadi belum ada yang bisa diproses. Pilih produk dari katalog terlebih dahulu."
        action={<ButtonLink href="/katalog">Lihat Katalog</ButtonLink>}
      />
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-8 lg:grid-cols-[1fr_20rem] lg:items-start"
    >
      <Card className="p-6">
        <h2 className="font-display text-lg font-semibold text-ink">
          Data Penerima
        </h2>

        <div className="mt-6 space-y-5">
          <Field label="Nama penerima">
            <input
              name="recipientName"
              type="text"
              required
              minLength={2}
              defaultValue={defaultName}
              className={inputClass}
              placeholder="Nama yang menerima barang"
            />
          </Field>

          <Field
            label="Nomor telepon"
            hint="Dipakai mitra pengolah untuk mengabari jadwal pengiriman."
          >
            <input
              name="recipientPhone"
              type="tel"
              required
              defaultValue={defaultPhone}
              className={inputClass}
              placeholder="08xxxxxxxxxx"
            />
          </Field>

          <Field
            label="Alamat pengiriman"
            hint="Sertakan patokan lokasi agar mudah ditemukan kurir."
          >
            <textarea
              name="deliveryAddress"
              required
              minLength={10}
              className={textareaClass}
              placeholder="Nama lokasi, jalan, kampung, kecamatan"
            />
          </Field>
        </div>

        {formError ? (
          <div className="mt-5">
            <ErrorNote>{formError}</ErrorNote>
          </div>
        ) : null}
      </Card>

      <Card className="p-6 lg:sticky lg:top-24">
        <h2 className="font-display text-lg font-semibold text-ink">
          Rincian Pesanan
        </h2>

        <dl className="mt-5 space-y-3 text-sm">
          {rows.map((row) => (
            <div key={row.product.id} className="flex justify-between gap-4">
              <dt className="min-w-0 text-ink-soft">
                {row.product.name}
                <span className="block text-xs tabular-nums">
                  {row.line.quantityKg} kg x {formatRupiah(row.product.pricePerKg)}
                </span>
              </dt>
              <dd className="shrink-0 tabular-nums text-ink">
                {formatRupiah(row.subtotal)}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-5 flex items-baseline justify-between border-t border-line pt-5">
          <span className="text-sm font-medium text-ink">Total</span>
          <span className="font-display text-2xl font-semibold tabular-nums text-ink">
            {formatRupiah(total)}
          </span>
        </div>

        {hasStockProblem ? (
          <p className="mt-5 text-sm text-danger">
            Ada produk yang jumlahnya melebihi stok. Perbaiki di halaman
            keranjang sebelum melanjutkan.
          </p>
        ) : (
          <Button type="submit" disabled={submitting} className="mt-6 w-full">
            {submitting ? "Menyiapkan kode" : "Lanjut ke Pembayaran QRIS"}
          </Button>
        )}

        <div className="mt-4">
          <InfoNote>
            Pembayaran hanya lewat QRIS. Pesanan dicatat lebih dulu, lalu kode
            QR-nya tampil di halaman berikutnya untuk dipindai dari aplikasi
            bank atau e-wallet mana pun.
          </InfoNote>
        </div>
      </Card>
    </form>
  );
}

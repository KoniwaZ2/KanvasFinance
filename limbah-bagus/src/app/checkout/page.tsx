import type { Metadata } from "next";
import { db } from "@/lib/db";
import { guardPage } from "@/lib/auth";
import { CheckoutForm } from "./checkout-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pembayaran",
  description: "Lengkapi data penerima sebelum membuat pesanan.",
};

export default async function CheckoutPage() {
  const user = await guardPage("BUYER");

  const profile = await db.user.findUnique({
    where: { id: user.id },
    select: { name: true, phone: true },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-14">
      <header className="max-w-2xl">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">
          Pembayaran
        </h1>
        <p className="mt-3 leading-relaxed text-ink-soft">
          Pastikan data penerima benar. Pesanan dicatat dulu, pembayaran dipilih
          di langkah berikutnya.
        </p>
      </header>

      <div className="mt-10">
        <CheckoutForm
          defaultName={profile?.name ?? user.name}
          defaultPhone={profile?.phone ?? ""}
        />
      </div>
    </div>
  );
}

"use client";

import { useActionState } from "react";
import {
  confirmCashReceivedAction,
  type PurchaseState,
} from "@/app/actions/purchase";
import { Button, ErrorNote, SuccessNote } from "@/components/ui";

const initialState: PurchaseState = {};

/**
 * Satu-satunya tombol yang boleh menutup pembayaran tunai.
 *
 * Pengolah hanya bisa menyatakan sudah menyerahkan uang. Transaksi baru lunas
 * setelah pedagang menekan tombol ini sendiri, jadi kalimatnya sengaja tegas.
 */
export function ConfirmCashForm({
  purchaseId,
  label = "Saya Sudah Terima Uangnya",
}: {
  purchaseId: string;
  label?: string;
}) {
  const [state, formAction, pending] = useActionState(
    confirmCashReceivedAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="purchaseId" value={purchaseId} />

      <Button type="submit" disabled={pending} size="lg" className="w-full sm:w-auto">
        {pending ? "Menyimpan" : label}
      </Button>

      <p className="text-xs leading-relaxed text-ink-soft">
        Tekan hanya kalau uangnya benar benar sudah ada di tangan Anda. Setelah
        ditekan, transaksi ditutup sebagai lunas dan tidak bisa dibuka lagi
        sendiri.
      </p>

      {state.error ? <ErrorNote>{state.error}</ErrorNote> : null}
      {state.ok ? <SuccessNote>{state.ok}</SuccessNote> : null}
    </form>
  );
}

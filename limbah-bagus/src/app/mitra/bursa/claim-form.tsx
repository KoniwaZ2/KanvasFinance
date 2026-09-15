"use client";

import { useState } from "react";
import { useActionState } from "react";
import { claimListingAction, type PurchaseState } from "@/app/actions/purchase";
import { Button, ErrorNote, inputClass } from "@/components/ui";

const initialState: PurchaseState = {};

/**
 * Ambil satu lot dari bursa.
 *
 * Tombol pertama hanya membuka input tanggal jemput, tidak langsung mengirim,
 * supaya pengolah tidak menyanggupi jadwal tanpa melihat tanggalnya dulu.
 */
export function ClaimForm({
  listingId,
  defaultPickupDate,
}: {
  listingId: string;
  defaultPickupDate: string;
}) {
  const [state, formAction, pending] = useActionState(
    claimListingAction,
    initialState,
  );
  const [open, setOpen] = useState(false);

  if (state.ok) {
    return (
      <p className="rounded-xl bg-success-soft px-4 py-3 text-sm leading-relaxed text-success">
        {state.ok}
      </p>
    );
  }

  if (!open) {
    return (
      <div>
        <Button type="button" onClick={() => setOpen(true)} className="w-full">
          Ambil Lot Ini
        </Button>
        {state.error ? (
          <div className="mt-3">
            <ErrorNote>{state.error}</ErrorNote>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="listingId" value={listingId} />

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">Tanggal jemput</span>
        <input
          type="date"
          name="pickupDate"
          defaultValue={defaultPickupDate}
          min={defaultPickupDate}
          required
          className={inputClass}
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending} className="flex-1">
          {pending ? "Mengambil lot" : "Konfirmasi Ambil Lot"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setOpen(false)}
          disabled={pending}
        >
          Batal
        </Button>
      </div>

      {state.error ? <ErrorNote>{state.error}</ErrorNote> : null}
    </form>
  );
}

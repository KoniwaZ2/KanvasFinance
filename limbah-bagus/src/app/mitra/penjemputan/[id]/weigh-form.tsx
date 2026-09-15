"use client";

import { useActionState, useState } from "react";
import {
  cancelPurchaseAction,
  recordWeighInAction,
  type PurchaseState,
} from "@/app/actions/purchase";
import {
  Button,
  ErrorNote,
  InfoNote,
  SuccessNote,
  inputClass,
  textareaClass,
} from "@/components/ui";
import { formatKg, formatRupiah } from "@/lib/format";

const initialState: PurchaseState = {};

/**
 * Layar timbang di lokasi.
 *
 * Angka yang diketik langsung diterjemahkan menjadi rupiah supaya pengolah dan
 * pedagang melihat hitungan yang sama sebelum apa pun dikirim. Perhitungan di
 * sini hanya tampilan; nilai yang mengikat tetap dihitung ulang di server.
 */
export function WeighForm({
  purchaseId,
  estimatedKg,
  unitPricePerKg,
  platformFee,
}: {
  purchaseId: string;
  estimatedKg: number;
  unitPricePerKg: number;
  platformFee: number;
}) {
  const [state, formAction, pending] = useActionState(
    recordWeighInAction,
    initialState,
  );
  const [input, setInput] = useState("");

  const kg = Number(input);
  const valid = input.trim() !== "" && Number.isFinite(kg) && kg > 0;
  const wasteAmount = valid ? Math.round(kg) * unitPricePerKg : 0;

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="purchaseId" value={purchaseId} />

      <div>
        <label htmlFor="actualKg" className="text-base font-medium text-ink">
          Berat hasil timbangan
        </label>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">
          Isi angka dari timbangan, bukan perkiraan. Angka inilah yang mengunci
          nilai transaksi dan masuk ke catatan dampak.
        </p>

        <div className="mt-4 flex flex-wrap items-end gap-4">
          <div className="flex items-center gap-3">
            <input
              id="actualKg"
              name="actualKg"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              required
              value={input}
              onChange={(event) =>
                setInput(event.target.value.replace(/[^0-9]/g, ""))
              }
              placeholder="0"
              className={`${inputClass} h-16 w-40 text-2xl font-semibold tabular-nums`}
            />
            <span className="text-xl font-medium text-ink-soft">kg</span>
          </div>

          <div className="pb-2">
            <p className="text-sm text-ink-soft">Perkiraan pedagang</p>
            <p className="text-base font-medium tabular-nums text-ink">
              {formatKg(estimatedKg)}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-surface-sunken px-4 py-4">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-ink-soft">
              Nilai sampah ({valid ? formatKg(Math.round(kg)) : "0 kg"} x{" "}
              <span className="tabular-nums">
                {formatRupiah(unitPricePerKg)}
              </span>
              )
            </dt>
            <dd className="tabular-nums text-ink">
              {formatRupiah(wasteAmount)}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ink-soft">Biaya layanan platform</dt>
            <dd className="tabular-nums text-ink">
              {formatRupiah(platformFee)}
            </dd>
          </div>
        </dl>

        <p className="mt-4 text-sm text-ink-soft">Total yang Anda bayar</p>
        <p className="font-display text-3xl font-semibold tabular-nums tracking-tight text-ink sm:text-4xl">
          {formatRupiah(wasteAmount + platformFee)}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Pedagang menerima{" "}
          <span className="tabular-nums">{formatRupiah(wasteAmount)}</span>{" "}
          utuh. Biaya layanan ditanggung Anda sebagai pembeli.
        </p>
      </div>

      {state.error ? <ErrorNote>{state.error}</ErrorNote> : null}
      {state.ok ? <SuccessNote>{state.ok}</SuccessNote> : null}

      <Button
        type="submit"
        size="lg"
        disabled={pending || !valid}
        className="w-full sm:w-auto"
      >
        {pending ? "Menyimpan berat" : "Simpan Berat dan Lanjut Bayar"}
      </Button>
    </form>
  );
}

/** Batal penjemputan. Sengaja kecil supaya tidak menyaingi aksi menimbang. */
export function CancelPickupForm({ purchaseId }: { purchaseId: string }) {
  const [state, formAction, pending] = useActionState(
    cancelPurchaseAction,
    initialState,
  );
  const [open, setOpen] = useState(false);

  if (state.ok) {
    return <InfoNote>{state.ok}</InfoNote>;
  }

  if (!open) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-sm text-ink-soft underline underline-offset-4 hover:text-ink"
        >
          Batalkan penjemputan ini
        </button>
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
      <input type="hidden" name="purchaseId" value={purchaseId} />

      <p className="text-sm leading-relaxed text-ink-soft">
        Lot ini akan kembali terbuka di bursa dan bisa diambil pengolah lain.
        Sebutkan alasannya kalau ada, supaya pedagang tahu duduk perkaranya.
      </p>

      <textarea
        name="reason"
        rows={3}
        placeholder="Alasan pembatalan, boleh dikosongkan"
        className={textareaClass}
      />

      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="danger" size="sm" disabled={pending}>
          {pending ? "Membatalkan" : "Ya, Batalkan"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setOpen(false)}
          disabled={pending}
        >
          Kembali
        </Button>
      </div>

      {state.error ? <ErrorNote>{state.error}</ErrorNote> : null}
    </form>
  );
}

"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { createListingAction, type ListingState } from "@/app/actions/listing";
import {
  Button,
  ErrorNote,
  Field,
  SuccessNote,
  inputClass,
  textareaClass,
} from "@/components/ui";
import { formatKg, formatRupiah } from "@/lib/format";
import { READY_WINDOWS, lotValue } from "@/lib/waste";

export type TariffChoice = {
  id: string;
  name: string;
  description: string;
  pricePerKg: number;
};

const initialState: ListingState = {};

type FieldsProps = {
  tariffs: TariffChoice[];
  minDate: string;
  maxDate: string;
  maxDateLabel: string;
};

/**
 * Tidak ada input harga di form ini, dan memang tidak boleh ada.
 * Harga ditetapkan pemerintah, pedagang hanya memilih jenis sampahnya.
 */
export function ListingForm(props: FieldsProps) {
  const [state, formAction, pending] = useActionState(
    createListingAction,
    initialState,
  );

  // Isian dikosongkan dengan cara memasang ulang blok isian lewat key, bukan
  // dengan menulis ulang setiap state satu per satu setelah render.
  const [seenState, setSeenState] = useState(state);
  const [resetKey, setResetKey] = useState(0);

  if (seenState !== state) {
    setSeenState(state);
    if (state.ok) setResetKey((value) => value + 1);
  }

  return (
    <form action={formAction} className="space-y-10">
      <ListingFields key={resetKey} {...props} />

      {state.error ? <ErrorNote>{state.error}</ErrorNote> : null}

      {state.ok ? (
        <SuccessNote>
          {state.ok}{" "}
          <Link href="/pedagang/penjualan" className="font-medium underline">
            Lihat daftar penjualan Anda
          </Link>
        </SuccessNote>
      ) : null}

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Memasang lot" : "Pasang Lot ke Bursa"}
        </Button>
        <p className="text-sm text-ink-soft">
          Lot bisa Anda tarik lagi selama belum diambil pengolah.
        </p>
      </div>
    </form>
  );
}

function ListingFields({
  tariffs,
  minDate,
  maxDate,
  maxDateLabel,
}: FieldsProps) {
  const [tariffId, setTariffId] = useState("");
  const [kg, setKg] = useState("");

  const selected = tariffs.find((tariff) => tariff.id === tariffId);
  const kgNumber = Number(kg);
  const validKg = Number.isFinite(kgNumber) && kgNumber >= 5;
  const estimate =
    selected && validKg
      ? lotValue(selected.pricePerKg, Math.floor(kgNumber))
      : null;

  return (
    <div className="space-y-10">
      <fieldset>
        <legend className="text-sm font-medium text-ink">
          Jenis sampah yang dijual
        </legend>
        <p className="mt-1 text-xs text-ink-soft">
          Satu lot untuk satu jenis sampah. Kalau ada dua jenis, pasang dua lot.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {tariffs.map((tariff) => {
            const active = tariffId === tariff.id;

            return (
              <label
                key={tariff.id}
                className={`flex cursor-pointer flex-col rounded-xl border p-4 transition-colors ${
                  active
                    ? "border-accent bg-accent-soft"
                    : "border-line bg-surface-raised hover:bg-surface-sunken"
                }`}
              >
                <span className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="tariffId"
                    value={tariff.id}
                    checked={active}
                    onChange={() => setTariffId(tariff.id)}
                    className="mt-1 h-4 w-4 shrink-0 accent-[var(--accent)]"
                  />
                  <span className="min-w-0">
                    <span className="block font-medium text-ink">
                      {tariff.name}
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-ink-soft">
                      {tariff.description}
                    </span>
                  </span>
                </span>

                <span className="mt-4 block border-t border-line pt-3">
                  <span className="block font-display text-2xl font-semibold tabular-nums tracking-tight text-ink">
                    {formatRupiah(tariff.pricePerKg)}
                  </span>
                  <span className="block text-xs text-ink-soft">per kg</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field
          label="Perkiraan berat (kg)"
          hint="Kira kira saja. Beratnya ditimbang ulang saat dijemput."
        >
          <input
            type="number"
            name="estimatedKg"
            value={kg}
            onChange={(event) => setKg(event.target.value)}
            min={5}
            step={1}
            inputMode="numeric"
            placeholder="50"
            required
            className={inputClass}
          />
        </Field>

        <Field
          label="Tanggal siap dijemput"
          hint={`Sampah organik cepat busuk, paling jauh ${maxDateLabel}.`}
        >
          <input
            type="date"
            name="readyDate"
            min={minDate}
            max={maxDate}
            defaultValue={minDate}
            required
            className={inputClass}
          />
        </Field>
      </div>

      <fieldset>
        <legend className="text-sm font-medium text-ink">
          Waktu siap dijemput
        </legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {READY_WINDOWS.map((slot, index) => (
            <label
              key={slot.id}
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface-raised p-4 hover:bg-surface-sunken"
            >
              <input
                type="radio"
                name="readyWindow"
                value={slot.id}
                defaultChecked={index === 0}
                className="mt-1 h-4 w-4 shrink-0 accent-[var(--accent)]"
              />
              <span>
                <span className="block font-medium text-ink">{slot.label}</span>
                <span className="mt-1 block text-xs tabular-nums text-ink-soft">
                  {slot.hint}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <Field
        label="Catatan untuk penjemput (boleh dikosongkan)"
        hint="Contoh: sudah dipisah dari plastik, ambil lewat pintu belakang."
      >
        <textarea
          name="note"
          maxLength={300}
          placeholder="Sudah dipisah dari plastik"
          className={textareaClass}
        />
      </Field>

      <div className="rounded-xl border border-line bg-surface-sunken p-5 sm:p-6">
        <p className="text-sm font-medium text-ink">
          Perkiraan uang yang Anda terima
        </p>

        {estimate === null ? (
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            Pilih jenis sampah dan isi perkiraan beratnya, minimal 5 kg, maka
            perkiraan uangnya langsung muncul di sini.
          </p>
        ) : (
          <>
            <p className="mt-3 font-display text-4xl font-semibold tabular-nums tracking-tight text-ink sm:text-5xl">
              {formatRupiah(estimate)}
            </p>
            <p className="mt-2 text-sm tabular-nums text-ink-soft">
              {formatRupiah(selected?.pricePerKg ?? 0)} per kg dikali{" "}
              {formatKg(Math.floor(kgNumber))}
            </p>
          </>
        )}

        <p className="mt-4 text-sm leading-relaxed text-ink">
          Angka ini masih PERKIRAAN. Uang yang benar benar Anda terima dihitung
          dari berat timbangan di lapak Anda saat sampah dijemput, bukan dari
          perkiraan ini.
        </p>
      </div>

      <p className="text-sm leading-relaxed text-ink-soft">
        Harga ini ditetapkan pemerintah daerah dan sama untuk semua pedagang,
        jadi tidak ada tawar menawar.{" "}
        <Link href="/harga-sampah" className="underline hover:text-ink">
          Lihat daftar harga resmi
        </Link>
      </p>
    </div>
  );
}

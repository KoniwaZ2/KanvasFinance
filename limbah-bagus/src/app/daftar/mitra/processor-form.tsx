"use client";

import { useActionState, useState } from "react";
import {
  registerProcessorAction,
  type RegisterState,
} from "@/app/actions/register";
import {
  Button,
  ErrorNote,
  Field,
  inputClass,
  textareaClass,
} from "@/components/ui";

const initialState: RegisterState = {};

const KINDS = [
  {
    value: "unit_bsf",
    title: "Unit pengolah sampah",
    body: "Menerima penjemputan sampah organik dari pedagang pasar.",
  },
  {
    value: "peternak",
    title: "Peternak maggot mandiri",
    body: "Membudidayakan maggot dengan bahan baku sendiri.",
  },
];

export function ProcessorRegisterForm() {
  const [state, formAction, pending] = useActionState(
    registerProcessorAction,
    initialState,
  );
  const [kind, setKind] = useState("unit_bsf");

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <fieldset>
        <legend className="text-sm font-medium text-ink">Bentuk usaha</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {KINDS.map((option) => (
            <label
              key={option.value}
              className={`cursor-pointer rounded-xl border p-4 transition-colors ${
                kind === option.value
                  ? "border-accent bg-accent-soft"
                  : "border-line bg-surface-raised hover:border-ink-soft"
              }`}
            >
              <input
                type="radio"
                name="kind"
                value={option.value}
                checked={kind === option.value}
                onChange={() => setKind(option.value)}
                className="sr-only"
              />
              <span className="block text-sm font-medium text-ink">
                {option.title}
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-ink-soft">
                {option.body}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <Field label="Nama usaha atau kelompok">
        <input
          name="unitName"
          required
          placeholder={
            kind === "peternak"
              ? "Contoh: Peternakan Maggot Sukamulya"
              : "Contoh: Unit BSF Kronjo Lestari"
          }
          className={inputClass}
        />
      </Field>

      <Field label="Lokasi" hint="Kecamatan dan kabupaten.">
        <input
          name="location"
          required
          placeholder="Contoh: Kronjo, Kabupaten Tangerang"
          className={inputClass}
        />
      </Field>

      <Field
        label="Kapasitas per hari (kg)"
        hint={
          kind === "peternak"
            ? "Perkiraan hasil panen maggot per hari."
            : "Perkiraan sampah organik yang sanggup diolah per hari."
        }
      >
        <input
          type="number"
          name="capacityKgPerDay"
          required
          min={1}
          max={100000}
          placeholder="Contoh: 300"
          className={inputClass}
        />
      </Field>

      <Field label="Nama penanggung jawab">
        <input
          name="name"
          required
          autoComplete="name"
          placeholder="Nama pengurus usaha"
          className={inputClass}
        />
      </Field>

      <Field label="Email" hint="Dipakai untuk masuk ke dashboard mitra.">
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="nama@contoh.id"
          className={inputClass}
        />
      </Field>

      <Field label="Nomor telepon">
        <input
          name="phone"
          required
          inputMode="tel"
          autoComplete="tel"
          placeholder="08xxxxxxxxxx"
          className={inputClass}
        />
      </Field>

      <Field label="Kata sandi" hint="Minimal 8 karakter.">
        <input
          type="password"
          name="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="Buat kata sandi"
          className={inputClass}
        />
      </Field>

      <Field
        label="Keterangan singkat"
        hint="Opsional. Ditampilkan ke pembeli sebagai profil pengolah."
      >
        <textarea
          name="description"
          maxLength={600}
          placeholder="Sejak kapan beroperasi, jenis produk, atau cara pengolahan."
          className={textareaClass}
        />
      </Field>

      {state.error ? <ErrorNote>{state.error}</ErrorNote> : null}

      <Button type="submit" size="lg" disabled={pending} className="mt-1">
        {pending ? "Memproses" : "Buat akun mitra"}
      </Button>
    </form>
  );
}

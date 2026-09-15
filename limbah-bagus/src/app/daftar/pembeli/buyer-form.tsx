"use client";

import { useActionState } from "react";
import { registerBuyerAction, type RegisterState } from "@/app/actions/register";
import { Button, ErrorNote, Field, inputClass } from "@/components/ui";

const initialState: RegisterState = {};

export function BuyerRegisterForm() {
  const [state, formAction, pending] = useActionState(
    registerBuyerAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <Field label="Nama lengkap">
        <input
          name="name"
          required
          autoComplete="name"
          placeholder="Nama sesuai identitas"
          className={inputClass}
        />
      </Field>

      <Field label="Email" hint="Dipakai untuk masuk dan menerima bukti bayar.">
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="nama@contoh.id"
          className={inputClass}
        />
      </Field>

      <Field label="Nomor telepon" hint="Dihubungi kurir saat pengiriman.">
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

      {state.error ? <ErrorNote>{state.error}</ErrorNote> : null}

      <Button type="submit" size="lg" disabled={pending} className="mt-1">
        {pending ? "Memproses" : "Buat akun pembeli"}
      </Button>
    </form>
  );
}

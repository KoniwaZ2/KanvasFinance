"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/app/actions/auth";
import { Button, ErrorNote, Field, inputClass } from "@/components/ui";

const initialState: LoginState = {};

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(
    loginAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {/* Tujuan semula. Nilainya diperiksa ulang di server sebelum dipakai. */}
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <Field label="Email">
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          placeholder="nama@contoh.id"
          className={inputClass}
        />
      </Field>

      <Field label="Kata sandi">
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          placeholder="Masukkan kata sandi"
          className={inputClass}
        />
      </Field>

      {state.error ? <ErrorNote>{state.error}</ErrorNote> : null}

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Memeriksa..." : "Masuk"}
      </Button>
    </form>
  );
}

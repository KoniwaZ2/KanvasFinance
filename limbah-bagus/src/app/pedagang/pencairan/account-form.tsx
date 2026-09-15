"use client";

import { useActionState } from "react";
import {
  updatePayoutAccountAction,
  type PayoutState,
} from "@/app/actions/payout";
import {
  Button,
  ErrorNote,
  Field,
  SuccessNote,
  inputClass,
} from "@/components/ui";

const initialState: PayoutState = {};

export function AccountForm({
  bankName,
  accountNumber,
  accountName,
}: {
  bankName: string;
  accountNumber: string;
  accountName: string;
}) {
  const [state, formAction, pending] = useActionState(
    updatePayoutAccountAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-6">
      <Field
        label="Nama bank atau e-wallet"
        hint="Contoh: BCA, BRI, Bank Banten, DANA, GoPay."
      >
        <input
          type="text"
          name="payoutBankName"
          defaultValue={bankName}
          maxLength={60}
          required
          placeholder="BRI"
          className={inputClass}
        />
      </Field>

      <Field
        label="Nomor rekening"
        hint="Angka saja, tanpa spasi atau tanda hubung."
      >
        <input
          type="text"
          name="payoutAccountNumber"
          defaultValue={accountNumber}
          inputMode="numeric"
          pattern="[0-9]{6,20}"
          required
          placeholder="012345678901"
          className={`${inputClass} tabular-nums`}
        />
      </Field>

      <Field
        label="Nama pemilik rekening"
        hint="Tulis persis seperti yang tertera di buku tabungan atau aplikasi."
      >
        <input
          type="text"
          name="payoutAccountName"
          defaultValue={accountName}
          maxLength={80}
          required
          placeholder="Ratna Wulandari"
          className={inputClass}
        />
      </Field>

      {state.error ? <ErrorNote>{state.error}</ErrorNote> : null}
      {state.ok ? <SuccessNote>{state.ok}</SuccessNote> : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Menyimpan" : "Simpan Rekening"}
      </Button>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { updateStockAction, type StockState } from "@/app/actions/product";
import { inputClass } from "@/components/ui";

const initialState: StockState = {};

export function StockForm({
  productId,
  stockKg,
  isActive,
}: {
  productId: string;
  stockKg: number;
  isActive: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    updateStockAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="productId" value={productId} />

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-ink">Stok (kg)</span>
        <input
          type="number"
          name="stockKg"
          defaultValue={stockKg}
          min={0}
          max={100000}
          className={`${inputClass} h-10 w-32`}
        />
      </label>

      <label className="flex h-10 items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={isActive}
          className="h-4 w-4 rounded border-line accent-[var(--accent)]"
        />
        Tampil di katalog
      </label>

      <button
        type="submit"
        disabled={pending}
        className="h-10 rounded-full bg-accent px-5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-55"
      >
        {pending ? "Menyimpan" : "Simpan"}
      </button>

      {state.error ? (
        <p className="w-full text-xs text-danger">{state.error}</p>
      ) : null}
      {state.ok ? (
        <p className="w-full text-xs text-success">{state.ok}</p>
      ) : null}
    </form>
  );
}

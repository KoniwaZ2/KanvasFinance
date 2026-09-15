"use client";

import { useActionState } from "react";
import { cancelListingAction, type ListingState } from "@/app/actions/listing";
import { Button } from "@/components/ui";

const initialState: ListingState = {};

/** Menarik lot yang belum diambil pengolah mana pun. */
export function CancelLotForm({ listingId }: { listingId: string }) {
  const [state, formAction, pending] = useActionState(
    cancelListingAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="listingId" value={listingId} />

      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        {pending ? "Menarik" : "Tarik lot"}
      </Button>

      {state.error ? (
        <p className="text-xs leading-relaxed text-danger">{state.error}</p>
      ) : null}
      {state.ok ? (
        <p className="text-xs leading-relaxed text-success">{state.ok}</p>
      ) : null}
    </form>
  );
}

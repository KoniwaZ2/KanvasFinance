"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { AuthError, requireRole } from "@/lib/auth";

export type PayoutState = { error?: string; ok?: string };

const accountSchema = z.object({
  payoutBankName: z
    .string()
    .trim()
    .min(2, "Nama bank atau e-wallet wajib diisi")
    .max(60),
  payoutAccountNumber: z
    .string()
    .trim()
    .regex(/^[0-9]{6,20}$/, "Nomor rekening hanya angka, 6 sampai 20 digit"),
  payoutAccountName: z
    .string()
    .trim()
    .min(2, "Nama pemilik rekening wajib diisi")
    .max(80),
});

/**
 * Rekening tujuan pencairan hasil penjualan yang dibayar lewat QRIS.
 *
 * Selama rekening kosong, pedagang tetap bisa berjualan dan menerima uang
 * tunai. Yang tidak tersedia hanya pembayaran QRIS, karena tidak ada tujuan
 * untuk meneruskan dananya.
 */
export async function updatePayoutAccountAction(
  _prev: PayoutState,
  formData: FormData,
): Promise<PayoutState> {
  let user;

  try {
    user = await requireRole("TRADER");
  } catch (error) {
    if (error instanceof AuthError) return { error: error.message };
    throw error;
  }

  const parsed = accountSchema.safeParse({
    payoutBankName: formData.get("payoutBankName"),
    payoutAccountNumber: formData.get("payoutAccountNumber"),
    payoutAccountName: formData.get("payoutAccountName"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data rekening belum lengkap." };
  }

  await db.traderProfile.update({
    where: { userId: user.id },
    data: parsed.data,
  });

  revalidatePath("/pedagang/pencairan");
  revalidatePath("/pedagang");

  return { ok: "Rekening tujuan pencairan tersimpan." };
}

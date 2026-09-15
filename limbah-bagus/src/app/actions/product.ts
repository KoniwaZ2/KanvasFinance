"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { AuthError, requireRole } from "@/lib/auth";

export type StockState = { error?: string; ok?: string };

const stockSchema = z.object({
  productId: z.string().min(1),
  stockKg: z.coerce.number().int().min(0).max(100_000),
  isActive: z.boolean(),
});

/** Mitra pengolah memperbarui stok produknya sendiri. */
export async function updateStockAction(
  _prev: StockState,
  formData: FormData,
): Promise<StockState> {
  let user;

  try {
    user = await requireRole("PROCESSOR", "ADMIN");
  } catch (error) {
    if (error instanceof AuthError) return { error: error.message };
    throw error;
  }

  const parsed = stockSchema.safeParse({
    productId: formData.get("productId"),
    stockKg: formData.get("stockKg"),
    isActive: formData.get("isActive") === "on",
  });

  if (!parsed.success) {
    return { error: "Jumlah stok harus berupa angka 0 atau lebih." };
  }

  const product = await db.product.findUnique({
    where: { id: parsed.data.productId },
    include: { processor: { select: { userId: true } } },
  });

  if (!product) {
    return { error: "Produk tidak ditemukan." };
  }

  // Kepemilikan diperiksa di server, bukan dipercaya dari form.
  if (user.role !== "ADMIN" && product.processor.userId !== user.id) {
    return { error: "Produk ini bukan milik unit pengolahan Anda." };
  }

  await db.product.update({
    where: { id: product.id },
    data: { stockKg: parsed.data.stockKg, isActive: parsed.data.isActive },
  });

  revalidatePath("/mitra/produk");
  revalidatePath("/katalog");

  return { ok: `Stok ${product.name} diperbarui.` };
}

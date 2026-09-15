"use server";

import { db } from "@/lib/db";

/**
 * Detail produk untuk keranjang dan checkout.
 *
 * Keranjang di browser hanya menyimpan productId dan jumlah kg. Nama, harga,
 * dan stok selalu diambil ulang dari database lewat fungsi ini, supaya harga
 * yang ditampilkan tidak pernah berasal dari data lama di localStorage.
 */
export async function getCartProducts(productIds: string[]) {
  const unique = Array.from(new Set(productIds)).filter(
    (id) => typeof id === "string" && id.length > 0,
  );

  if (unique.length === 0) return [];

  const products = await db.product.findMany({
    where: { id: { in: unique }, isActive: true },
    include: {
      processor: { select: { unitName: true, location: true } },
    },
  });

  return products.map((product) => ({
    id: product.id,
    slug: product.slug,
    name: product.name,
    type: product.type,
    pricePerKg: product.pricePerKg,
    stockKg: product.stockKg,
    imageUrl: product.imageUrl,
    processorName: product.processor.unitName,
    processorLocation: product.processor.location,
  }));
}

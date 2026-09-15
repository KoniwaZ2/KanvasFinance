import { db } from "@/lib/db";

/**
 * Pembacaan tarif resmi dari database.
 *
 * Dipisah dari lib/waste.ts karena menyentuh klien Prisma: berkas ini hanya
 * boleh diimpor dari Server Component, server action, atau route handler.
 */

/** Daftar tarif yang berlaku, untuk form listing dan halaman harga publik. */
export async function getActiveTariffs() {
  return db.wasteTariff.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}

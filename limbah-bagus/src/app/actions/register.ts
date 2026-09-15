"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";

export type RegisterState = { error?: string };

const baseAccount = {
  name: z.string().trim().min(2, "Nama terlalu pendek"),
  email: z.string().trim().toLowerCase().email("Format email tidak valid"),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s]{8,20}$/, "Nomor telepon tidak valid"),
  password: z.string().min(8, "Kata sandi minimal 8 karakter"),
};

const buyerSchema = z.object(baseAccount);

const traderSchema = z.object({
  businessName: z.string().trim().min(3, "Nama usaha minimal 3 huruf"),
  marketName: z.string().trim().min(3, "Nama pasar atau lokasi wajib diisi"),
  address: z.string().trim().min(10, "Alamat terlalu pendek"),
  dailyWasteEstKg: z.coerce
    .number()
    .int("Perkiraan sampah harus berupa angka bulat")
    .min(1, "Perkiraan sampah minimal 1 kg")
    .max(5000, "Perkiraan sampah terlalu besar"),
  contactName: z.string().trim().min(2, "Nama penanggung jawab wajib diisi"),
  email: z.string().trim().toLowerCase().email("Format email tidak valid"),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s]{8,20}$/, "Nomor telepon tidak valid"),
  password: z.string().min(8, "Kata sandi minimal 8 karakter"),
  // Rekening pencairan opsional saat mendaftar. Tanpa rekening, pedagang tetap
  // bisa berjualan dan menerima uang tunai; yang belum tersedia hanya QRIS.
  payoutBankName: z.string().trim().max(60).optional(),
  payoutAccountNumber: z
    .string()
    .trim()
    .regex(/^[0-9]{6,20}$/, "Nomor rekening hanya angka, 6 sampai 20 digit")
    .optional()
    .or(z.literal("")),
  payoutAccountName: z.string().trim().max(80).optional(),
});

const processorSchema = z.object({
  ...baseAccount,
  unitName: z.string().trim().min(3, "Nama usaha terlalu pendek"),
  location: z.string().trim().min(4, "Lokasi terlalu pendek"),
  capacityKgPerDay: z.coerce
    .number()
    .int()
    .min(1, "Kapasitas minimal 1 kg per hari")
    .max(100_000),
  kind: z.enum(["unit_bsf", "peternak"]),
  description: z.string().trim().max(600).optional(),
});

async function emailTaken(email: string): Promise<boolean> {
  return Boolean(await db.user.findUnique({ where: { email } }));
}

/** Pendaftaran petani atau peternak yang ingin membeli pakan dan pupuk. */
export async function registerBuyerAction(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const parsed = buyerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data belum lengkap." };
  }

  if (await emailTaken(parsed.data.email)) {
    return {
      error: "Email ini sudah terdaftar. Silakan masuk memakai email tersebut.",
    };
  }

  const user = await db.user.create({
    data: {
      email: parsed.data.email,
      passwordHash: hashPassword(parsed.data.password),
      name: parsed.data.name,
      phone: parsed.data.phone,
      role: "BUYER",
    },
  });

  await createSession(user.id, "BUYER");

  // redirect melempar sinyal khusus Next.js, jadi dipanggil di luar try/catch.
  redirect("/katalog");
}

/**
 * Pendaftaran mitra pengolah.
 *
 * Dua bentuk usaha diterima:
 *  - unit_bsf : membeli sampah organik di bursa lalu mengolahnya
 *  - peternak : membudidayakan maggot sendiri dan hanya menjual hasilnya
 */
export async function registerProcessorAction(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const parsed = processorSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
    unitName: formData.get("unitName"),
    location: formData.get("location"),
    capacityKgPerDay: formData.get("capacityKgPerDay"),
    kind: formData.get("kind"),
    description: formData.get("description") ?? undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data belum lengkap." };
  }

  if (await emailTaken(parsed.data.email)) {
    return {
      error: "Email ini sudah terdaftar. Silakan masuk memakai email tersebut.",
    };
  }

  const isPeternak = parsed.data.kind === "peternak";

  const user = await db.user.create({
    data: {
      email: parsed.data.email,
      passwordHash: hashPassword(parsed.data.password),
      name: parsed.data.name,
      phone: parsed.data.phone,
      role: "PROCESSOR",
      processorProfile: {
        create: {
          unitName: parsed.data.unitName,
          location: parsed.data.location,
          capacityKgPerDay: parsed.data.capacityKgPerDay,
          kind: parsed.data.kind,
          // Peternak mandiri memakai bahan baku sendiri, jadi tidak ikut
          // membeli lot di bursa sampah. Mereka tetap menjual di katalog.
          buysWaste: !isPeternak,
          description:
            parsed.data.description?.trim() ||
            (isPeternak
              ? "Peternak maggot yang membudidayakan sendiri dan menjual hasil panennya."
              : "Unit pengolahan yang membeli sampah organik pasar dan mengolahnya menjadi maggot BSF dan pupuk kasgot."),
        },
      },
    },
  });

  await createSession(user.id, "PROCESSOR");

  redirect("/mitra");
}

/**
 * Pendaftaran pedagang pasar yang ingin menjual sampah organiknya.
 *
 * Tidak ada paket, tidak ada tagihan, dan tidak ada pembayaran di langkah ini.
 * Arah uangnya terbalik: pedagang yang akan menerima uang, bukan membayar.
 * Karena itu akun langsung aktif dan bisa memasang lot pertamanya.
 */
export async function registerTraderAction(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const parsed = traderSchema.safeParse({
    businessName: formData.get("businessName"),
    marketName: formData.get("marketName"),
    address: formData.get("address"),
    dailyWasteEstKg: formData.get("dailyWasteEstKg"),
    contactName: formData.get("contactName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
    payoutBankName: formData.get("payoutBankName") ?? undefined,
    payoutAccountNumber: formData.get("payoutAccountNumber") ?? undefined,
    payoutAccountName: formData.get("payoutAccountName") ?? undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data belum lengkap." };
  }

  const data = parsed.data;

  if (await emailTaken(data.email)) {
    return {
      error:
        "Email ini sudah terdaftar. Silakan masuk memakai email tersebut atau gunakan email lain.",
    };
  }

  // Rekening hanya disimpan kalau ketiganya lengkap. Data setengah jadi lebih
  // berbahaya daripada kosong: nomor tanpa nama pemilik tidak bisa dicairkan.
  const hasAccount = Boolean(
    data.payoutBankName && data.payoutAccountNumber && data.payoutAccountName,
  );

  const user = await db.user.create({
    data: {
      email: data.email,
      passwordHash: hashPassword(data.password),
      name: data.contactName,
      phone: data.phone,
      role: "TRADER",
      traderProfile: {
        create: {
          businessName: data.businessName,
          marketName: data.marketName,
          address: data.address,
          dailyWasteEstKg: data.dailyWasteEstKg,
          payoutBankName: hasAccount ? data.payoutBankName : null,
          payoutAccountNumber: hasAccount ? data.payoutAccountNumber : null,
          payoutAccountName: hasAccount ? data.payoutAccountName : null,
        },
      },
    },
  });

  await createSession(user.id, "TRADER");

  // redirect melempar sinyal khusus Next.js, jadi dipanggil di luar try/catch.
  redirect("/pedagang/jual");
}

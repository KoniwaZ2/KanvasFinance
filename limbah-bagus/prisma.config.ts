import { defineConfig, env } from "prisma/config";

// Prisma 7 tidak lagi memuat file .env secara otomatis, jadi dimuat manual di sini.
for (const file of [".env", ".env.local"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    // File opsional, abaikan kalau tidak ada.
  }
}

// Prisma 7 juga memindahkan konfigurasi koneksi dari schema.prisma ke file ini.
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});

import crypto from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { isRole, ROLE_HOME, type Role } from "@/lib/access";

export const SESSION_COOKIE_NAME = "limbahbagus_session";

/**
 * Sesi sederhana berbasis cookie bertanda tangan HMAC.
 * Cukup untuk MVP satu deployment; tidak ada state sesi di server.
 */

const COOKIE_NAME = SESSION_COOKIE_NAME;
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 hari

export type { Role };

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET belum diisi di .env.local");
  }
  return secret;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;

  const derived = crypto.scryptSync(password, salt, 64);
  const storedBuffer = Buffer.from(hash, "hex");

  if (storedBuffer.length !== derived.length) return false;
  return crypto.timingSafeEqual(storedBuffer, derived);
}

function sign(value: string): string {
  return crypto
    .createHmac("sha256", sessionSecret())
    .update(value)
    .digest("base64url");
}

export async function createSession(userId: string, role: Role) {
  // Peran ikut ditandatangani di dalam token supaya proxy.ts bisa mengalihkan
  // rute tanpa menyentuh database. Karena bertanda tangan, peran yang diubah
  // sendiri oleh pengguna akan membuat tanda tangan tidak cocok dan sesi ditolak.
  const expires = Date.now() + SESSION_MAX_AGE * 1000;
  const payload = `${userId}.${role}.${expires}`;
  const token = `${payload}.${sign(payload)}`;

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/**
 * Membaca isi token tanpa menyentuh database.
 * Hanya untuk pemeriksaan cepat di proxy.ts. Halaman dan server action tetap
 * memakai getSessionUser() yang memverifikasi ulang ke database.
 */
export function readSessionToken(
  token: string | undefined,
): { userId: string; role: Role } | null {
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length !== 4) return null;

  const [userId, role, expires, signature] = parts;
  const payload = `${userId}.${role}.${expires}`;

  const expectedSignature = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expectedSignature);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  if (!Number(expires) || Number(expires) < Date.now()) return null;
  if (!isRole(role)) return null;

  return { userId, role };
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const session = readSessionToken(store.get(COOKIE_NAME)?.value);
  if (!session) return null;

  // Peran di database adalah yang menentukan, bukan peran di dalam cookie.
  // Kalau peran akun diubah, sesi lama langsung mengikuti keadaan terbaru.
  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!user || !isRole(user.role)) return null;

  return { ...user, role: user.role };
}

/** Wajib login. Melempar error jika tidak ada sesi valid. Untuk server action. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new AuthError("Silakan masuk terlebih dahulu.");
  }
  return user;
}

/** Wajib login dengan peran tertentu. Untuk server action dan route handler. */
export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    throw new AuthError("Akun Anda tidak memiliki akses ke bagian ini.");
  }
  return user;
}

/**
 * Penjaga untuk halaman. Ini pemeriksaan yang sebenarnya, bukan proxy.ts.
 *
 * Belum masuk: diantar ke halaman masuk sambil mengingat tujuan semula.
 * Salah peran: diantar ke beranda perannya sendiri, bukan diberi halaman error,
 * supaya pengguna tidak terjebak di jalan buntu.
 */
export async function guardPage(...allowed: Role[]): Promise<SessionUser> {
  const user = await getSessionUser();

  if (!user) {
    // Cookie yang tanda tangannya sah tapi akunnya sudah tidak ada di database
    // harus dibuang dulu. Kalau tidak, proxy.ts tetap menganggapnya sah dan
    // mengantar kembali ke halaman ini, sehingga pengguna terjebak berputar.
    const store = await cookies();
    if (readSessionToken(store.get(COOKIE_NAME)?.value)) {
      redirect("/keluar");
    }

    redirect("/masuk");
  }

  if (allowed.length > 0 && !allowed.includes(user.role)) {
    redirect(ROLE_HOME[user.role]);
  }

  return user;
}

export class AuthError extends Error {}

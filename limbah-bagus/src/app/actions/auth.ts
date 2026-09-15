"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, destroySession, verifyPassword } from "@/lib/auth";
import { canAccess, isRole, ROLE_HOME } from "@/lib/access";

export type LoginState = { error?: string };

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email dan kata sandi wajib diisi." };
  }

  const user = await db.user.findUnique({ where: { email } });

  // Pesan yang sama untuk email tidak dikenal maupun sandi salah,
  // supaya tidak membocorkan email mana yang terdaftar.
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { error: "Email atau kata sandi tidak cocok." };
  }

  if (!isRole(user.role)) {
    return { error: "Peran akun tidak dikenali. Hubungi pengelola." };
  }

  await createSession(user.id, user.role);

  // Tujuan hanya diikuti kalau memang boleh dibuka peran ini, dan hanya berupa
  // path internal. Tanpa pemeriksaan ini, parameter next bisa dipakai untuk
  // mengarahkan pengguna ke situs luar setelah masuk.
  const requested = String(formData.get("next") ?? "");
  const safeNext =
    requested.startsWith("/") &&
    !requested.startsWith("//") &&
    canAccess(user.role, requested)
      ? requested
      : null;

  redirect(safeNext ?? ROLE_HOME[user.role]);
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

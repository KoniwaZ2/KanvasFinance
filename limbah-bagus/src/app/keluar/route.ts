import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";

/**
 * Menghapus sesi lalu mengantar ke halaman masuk.
 *
 * Ada sebagai Route Handler, bukan server action, karena dipakai untuk
 * memutus sesi yang tanda tangannya masih sah tapi akunnya sudah tidak ada di
 * database (misalnya database dibangun ulang saat development). Server
 * Component tidak boleh menghapus cookie, jadi guardPage mengantar ke sini.
 *
 * Tanpa jalur ini, cookie basi membuat pengguna terjebak: halaman terbatas
 * mengantar ke /masuk karena akunnya tidak ditemukan, lalu proxy mengantar
 * kembali ke halaman terbatas karena cookie-nya terlihat sah.
 */
export async function GET(request: Request) {
  await destroySession();

  const target = new URL("/masuk", request.url);
  target.searchParams.set("sesi", "berakhir");

  return NextResponse.redirect(target);
}

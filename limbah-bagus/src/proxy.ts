import { NextResponse, type NextRequest } from "next/server";
import { readSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import {
  canAccess,
  isGuestOnlyPath,
  ROLE_HOME,
  requiredRolesFor,
} from "@/lib/access";

/**
 * Pengalihan cepat berdasarkan peran, dijalankan sebelum halaman dirender.
 *
 * Ini lapisan kenyamanan, bukan lapisan keamanan: tugasnya mengantar pengguna
 * ke tempat yang benar tanpa sempat melihat halaman yang bukan haknya.
 * Penjagaan yang sebenarnya tetap ada di setiap halaman, server action, dan
 * route handler lewat guardPage/requireRole, yang memverifikasi ulang peran
 * ke database. Sesuai anjuran Next.js, proxy tidak menyentuh database.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const session = readSessionToken(
    request.cookies.get(SESSION_COOKIE_NAME)?.value,
  );

  // Sudah masuk tapi membuka halaman masuk atau pendaftaran:
  // antar ke beranda perannya.
  if (session && isGuestOnlyPath(pathname)) {
    return NextResponse.redirect(new URL(ROLE_HOME[session.role], request.url));
  }

  const required = requiredRolesFor(pathname);
  if (!required) return NextResponse.next();

  // Rute terbatas tapi belum masuk: antar ke halaman masuk sambil
  // mengingat tujuan semula.
  if (!session) {
    const target = new URL("/masuk", request.url);
    target.searchParams.set("next", pathname);
    return NextResponse.redirect(target);
  }

  // Sudah masuk tapi perannya tidak berhak: antar ke berandanya sendiri.
  if (!canAccess(session.role, pathname)) {
    return NextResponse.redirect(new URL(ROLE_HOME[session.role], request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/masuk/:path*",
    "/daftar",
    "/daftar/:path*",
    "/daftar-pedagang/:path*",
    "/pedagang/:path*",
    "/mitra/:path*",
    "/keranjang/:path*",
    "/checkout/:path*",
    "/pesanan/:path*",
  ],
};

/**
 * Satu sumber kebenaran untuk hak akses.
 *
 * Dipakai di tiga tempat sekaligus supaya tampilan dan penjagaan tidak pernah
 * berbeda pendapat:
 *  1. proxy.ts, untuk pengalihan cepat sebelum halaman dirender
 *  2. halaman dan server action, sebagai penjagaan yang sebenarnya
 *  3. navigasi, untuk menampilkan hanya menu yang memang bisa dibuka
 *
 * Menyembunyikan menu bukan pengamanan. Setiap rute di sini tetap diperiksa
 * ulang di server, jadi mengetik URL langsung tidak menembus apa pun.
 */

export type Role = "TRADER" | "PROCESSOR" | "BUYER" | "ADMIN";

export const ROLES: Role[] = ["TRADER", "PROCESSOR", "BUYER", "ADMIN"];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && ROLES.includes(value as Role);
}

/** Halaman pertama yang dilihat tiap peran setelah masuk. */
export const ROLE_HOME: Record<Role, string> = {
  TRADER: "/pedagang",
  PROCESSOR: "/mitra",
  BUYER: "/katalog",
  ADMIN: "/mitra",
};

/** Bisa dibuka siapa saja, termasuk pengunjung yang belum masuk. */
const PUBLIC_PREFIXES = [
  "/dashboard-dampak",
  "/metodologi",
  "/untuk-pedagang",
  "/harga-sampah",
  "/katalog",
];

/** Hanya untuk yang belum masuk. Yang sudah masuk dialihkan ke berandanya. */
const GUEST_ONLY_PREFIXES = ["/masuk", "/daftar", "/daftar-pedagang"];

/** Rute terbatas beserta peran yang boleh membukanya. */
const ROLE_GATED: { prefix: string; roles: Role[] }[] = [
  { prefix: "/pedagang", roles: ["TRADER"] },
  { prefix: "/mitra", roles: ["PROCESSOR", "ADMIN"] },
  { prefix: "/keranjang", roles: ["BUYER"] },
  { prefix: "/checkout", roles: ["BUYER"] },
  { prefix: "/pesanan", roles: ["BUYER"] },
];

function matches(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.some((prefix) => matches(pathname, prefix));
}

export function isGuestOnlyPath(pathname: string): boolean {
  return GUEST_ONLY_PREFIXES.some((prefix) => matches(pathname, prefix));
}

/** Peran yang diizinkan untuk satu rute, atau null kalau rute itu tidak terbatas. */
export function requiredRolesFor(pathname: string): Role[] | null {
  const gate = ROLE_GATED.find((entry) => matches(pathname, entry.prefix));
  return gate ? gate.roles : null;
}

export function canAccess(role: Role | null, pathname: string): boolean {
  const required = requiredRolesFor(pathname);
  if (!required) return true;
  if (!role) return false;
  return required.includes(role);
}

/** Keranjang dan checkout hanya relevan untuk pembeli. */
export function canShop(role: Role | null): boolean {
  return role === null || role === "BUYER";
}

export type NavItem = { href: string; label: string };

/**
 * Menu yang ditampilkan untuk tiap peran. Hanya berisi halaman yang benar-benar
 * bisa dibuka peran tersebut, supaya tidak ada menu yang menuntun ke penolakan.
 */
export function navItemsFor(role: Role | null): NavItem[] {
  switch (role) {
    case "TRADER":
      return [
        { href: "/pedagang", label: "Beranda" },
        { href: "/pedagang/penjualan", label: "Penjualan" },
        { href: "/pedagang/pencairan", label: "Pencairan" },
        { href: "/harga-sampah", label: "Harga" },
      ];
    case "PROCESSOR":
      return [
        { href: "/mitra", label: "Penjemputan Saya" },
        { href: "/mitra/bursa", label: "Bursa Sampah" },
        { href: "/mitra/produk", label: "Produk Saya" },
        { href: "/dashboard-dampak", label: "Dampak" },
      ];
    case "ADMIN":
      return [
        { href: "/mitra", label: "Operasional" },
        { href: "/mitra/bursa", label: "Bursa Sampah" },
        { href: "/katalog", label: "Katalog" },
        { href: "/dashboard-dampak", label: "Dampak" },
      ];
    case "BUYER":
      return [
        { href: "/katalog", label: "Katalog" },
        { href: "/pesanan", label: "Pesanan Saya" },
        { href: "/dashboard-dampak", label: "Dampak" },
      ];
    default:
      return [
        { href: "/katalog", label: "Katalog" },
        { href: "/harga-sampah", label: "Harga Sampah" },
        { href: "/untuk-pedagang", label: "Untuk Pedagang" },
        { href: "/dashboard-dampak", label: "Dampak" },
      ];
  }
}

/** Label akun di navigasi, menjelaskan peran yang sedang dipakai. */
export function roleLabel(role: Role): string {
  switch (role) {
    case "TRADER":
      return "Pedagang";
    case "PROCESSOR":
      return "Mitra pengolah";
    case "BUYER":
      return "Pembeli";
    case "ADMIN":
      return "Pengelola";
  }
}

import Link from "next/link";
import type { SessionUser } from "@/lib/auth";
import { logoutAction } from "@/app/actions/auth";
import { CartIndicator } from "@/components/cart-indicator";
import { MobileNav } from "@/components/mobile-nav";
import { canShop, navItemsFor, ROLE_HOME, roleLabel } from "@/lib/access";

/**
 * Navigasi hanya menampilkan halaman yang memang bisa dibuka peran yang sedang
 * masuk. Ini soal kejelasan, bukan keamanan: penjagaan sebenarnya ada di
 * proxy.ts dan guardPage di tiap halaman.
 */
export function SiteHeader({ user }: { user: SessionUser | null }) {
  const items = navItemsFor(user?.role ?? null);
  const showCart = canShop(user?.role ?? null);
  const home = user ? ROLE_HOME[user.role] : "/";

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
        <Link href={home} className="flex shrink-0 items-center gap-2.5">
          <span
            className="grid h-8 w-8 place-items-center rounded-lg bg-brand font-display text-sm font-semibold text-brand-contrast"
            aria-hidden
          >
            LB
          </span>
          <span className="font-display text-lg font-semibold tracking-tight text-ink">
            LimbahBagus
          </span>
        </Link>

        <nav
          aria-label="Navigasi utama"
          className="hidden items-center gap-7 text-sm text-ink-soft md:flex"
        >
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="transition-colors hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {showCart ? <CartIndicator /> : null}

          {user ? (
            <>
              <span className="hidden text-right text-xs leading-tight text-ink-soft lg:block">
                <span className="block font-medium text-ink">{user.name}</span>
                {roleLabel(user.role)}
              </span>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="rounded-full border border-line px-4 py-2 text-sm text-ink-soft transition-colors hover:bg-surface-sunken"
                >
                  Keluar
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/masuk"
              className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
            >
              Masuk
            </Link>
          )}

          <MobileNav items={items} />
        </div>
      </div>
    </header>
  );
}

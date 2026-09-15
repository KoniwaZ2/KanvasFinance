import Link from "next/link";
import { getSessionUser } from "@/lib/auth";

/**
 * Footer menyesuaikan peran, sama seperti navigasi utama: kolom yang tidak
 * bisa dipakai peran tertentu tidak ditampilkan, supaya tidak ada tautan yang
 * menuntun ke halaman yang akan menolak mereka.
 */
export async function SiteFooter() {
  const user = await getSessionUser();
  const role = user?.role ?? null;

  const showBuyerLinks = role === null || role === "BUYER";
  const showTraderLinks = role === null || role === "TRADER";

  return (
    <footer className="mt-24 border-t border-line bg-surface-raised">
      <div className="mx-auto max-w-7xl px-4 py-14">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          <div className="max-w-sm">
            <div className="flex items-center gap-2.5">
              <span
                className="grid h-8 w-8 place-items-center rounded-lg bg-brand font-display text-sm font-semibold text-brand-contrast"
                aria-hidden
              >
                LB
              </span>
              <span className="font-display text-lg font-semibold text-ink">
                LimbahBagus
              </span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-ink-soft">
              Mengalihkan sampah organik pasar Kabupaten Tangerang dari TPA
              Jatiwaringin menjadi pakan ternak dan pupuk untuk petani lokal.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            {showBuyerLinks ? (
              <div>
                <h3 className="text-sm font-medium text-ink">Pembeli</h3>
                <ul className="mt-4 space-y-3 text-sm text-ink-soft">
                  <li>
                    <Link href="/katalog" className="hover:text-ink">
                      Katalog produk
                    </Link>
                  </li>
                  <li>
                    <Link href="/pesanan" className="hover:text-ink">
                      Lacak pesanan
                    </Link>
                  </li>
                </ul>
              </div>
            ) : null}

            {showTraderLinks ? (
              <div>
                <h3 className="text-sm font-medium text-ink">Pedagang</h3>
                <ul className="mt-4 space-y-3 text-sm text-ink-soft">
                  <li>
                    <Link href="/untuk-pedagang" className="hover:text-ink">
                      Jual sampah organik
                    </Link>
                  </li>
                  <li>
                    <Link href="/harga-sampah" className="hover:text-ink">
                      Harga resmi per kg
                    </Link>
                  </li>
                  <li>
                    <Link href="/pedagang" className="hover:text-ink">
                      Penjualan saya
                    </Link>
                  </li>
                </ul>
              </div>
            ) : null}

            <div>
              <h3 className="text-sm font-medium text-ink">Program</h3>
              <ul className="mt-4 space-y-3 text-sm text-ink-soft">
                <li>
                  <Link href="/dashboard-dampak" className="hover:text-ink">
                    Dashboard dampak
                  </Link>
                </li>
                <li>
                  <Link href="/metodologi" className="hover:text-ink">
                    Metodologi perhitungan
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <p className="mt-12 border-t border-line pt-6 text-xs text-ink-soft">
          LimbahBagus, Kabupaten Tangerang. Pembayaran diproses melalui Midtrans.
        </p>
      </div>
    </footer>
  );
}

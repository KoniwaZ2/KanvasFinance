"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { ListIcon, XIcon } from "@phosphor-icons/react";
import type { NavItem } from "@/lib/access";

/** Navigasi layar kecil. Isinya sama persis dengan menu desktop. */
export function MobileNav({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [lastPathname, setLastPathname] = useState(pathname);

  // Menu ditutup setiap kali pindah halaman supaya tidak menutupi konten baru.
  // Disetel saat render, bukan lewat efek, agar tidak ada render berlapis.
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={open ? "Tutup menu" : "Buka menu"}
        className="grid h-9 w-9 place-items-center rounded-full border border-line text-ink transition-colors hover:bg-surface-sunken"
      >
        {open ? <XIcon size={18} /> : <ListIcon size={18} />}
      </button>

      {open ? (
        <div className="absolute inset-x-0 top-16 border-b border-line bg-surface-raised shadow-sm">
          <nav
            aria-label="Navigasi utama"
            className="mx-auto flex max-w-7xl flex-col px-4 py-2"
          >
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="border-b border-line py-3 text-[0.95rem] text-ink last:border-b-0"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      ) : null}
    </div>
  );
}

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/**
 * Komponen dasar yang dipakai seluruh aplikasi.
 * Radius dan warna mengikuti token di globals.css (docs/DESIGN.md).
 * Satu warna aksen untuk semua aksi utama, tidak berganti antar halaman.
 */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "md" | "sm" | "lg";

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap transition-colors duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-55";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-white hover:bg-accent-hover",
  secondary:
    "bg-brand text-brand-contrast hover:bg-brand-hover",
  ghost:
    "border border-line bg-transparent text-ink hover:bg-surface-sunken",
  danger: "bg-danger text-white hover:opacity-90",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-6 text-[0.95rem]",
  lg: "h-12 px-7 text-base",
};

export function buttonClass(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  extra = "",
) {
  return `${buttonBase} ${buttonVariants[variant]} ${buttonSizes[size]} ${extra}`;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button className={buttonClass(variant, size, className)} {...props} />
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

export function Card({
  className = "",
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      className={`rounded-xl border border-line bg-surface-raised ${className}`}
      {...props}
    />
  );
}

export function SectionHeading({
  title,
  description,
  className = "",
}: {
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={`max-w-2xl ${className}`}>
      <h2 className="font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-3 max-w-[65ch] leading-relaxed text-ink-soft">
          {description}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Label status pembayaran, pesanan, dan penjemputan.
 *
 * Warna mengikuti arti statusnya, bukan warna aksen aplikasi:
 *  hijau  = beres, uang sudah masuk atau pekerjaan selesai
 *  kuning = masih ditunggu, pengguna perlu bertindak
 *  merah  = gagal atau dibatalkan
 *  biru   = sedang berjalan, tidak perlu tindakan apa pun
 *  abu    = tidak aktif lagi, tanpa kesalahan siapa pun
 *
 * Warna aksen terracotta sengaja tidak dipakai di sini supaya status berhasil
 * tidak tertukar dengan tombol ajakan bertindak.
 */
const SUCCESS = "bg-success-soft text-success";
const PENDING = "bg-warning-soft text-warning";
const FAILED = "bg-danger-soft text-danger";
const ONGOING = "bg-info-soft text-info";
const INACTIVE = "bg-surface-sunken text-ink-soft";

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    // Status pembayaran dari Midtrans
    PENDING: { label: "Menunggu Pembayaran", className: PENDING },
    SETTLEMENT: { label: "Pembayaran Berhasil", className: SUCCESS },
    EXPIRE: { label: "Kedaluwarsa", className: INACTIVE },
    CANCEL: { label: "Dibatalkan", className: FAILED },
    DENY: { label: "Ditolak", className: FAILED },
    REFUND: { label: "Dana Dikembalikan", className: ONGOING },

    // Status pesanan katalog
    awaiting_payment: { label: "Menunggu Pembayaran", className: PENDING },
    paid: { label: "Lunas", className: SUCCESS },
    fulfilled: { label: "Selesai Dikirim", className: SUCCESS },
    cancelled: { label: "Dibatalkan", className: FAILED },

    // Status listing sampah di bursa
    open: { label: "Terbuka", className: ONGOING },
    reserved: { label: "Sudah Diambil", className: PENDING },
    completed: { label: "Selesai", className: SUCCESS },
    expired: { label: "Kedaluwarsa", className: INACTIVE },

    // Status pembelian sampah
    scheduled: { label: "Menunggu Jemput", className: ONGOING },
    weighed: { label: "Menunggu Pembayaran", className: PENDING },
    awaiting_cash_confirmation: {
      label: "Menunggu Konfirmasi Pedagang",
      className: PENDING,
    },

    // Status pencairan dana ke rekening pedagang
    pending: { label: "Dalam Antrean Cair", className: PENDING },
    settled: { label: "Dana Cair", className: SUCCESS },
    failed: { label: "Pencairan Gagal", className: FAILED },
  };

  const entry = map[status] ?? { label: status, className: INACTIVE };

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${entry.className}`}
    >
      {entry.label}
    </span>
  );
}

/** Kondisi kosong yang menjelaskan cara mengisinya, bukan sekadar "tidak ada data". */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-line px-6 py-14 text-center">
      <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-soft">
        {description}
      </p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
      {children}
    </p>
  );
}

export function InfoNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl bg-surface-sunken px-4 py-3 text-sm leading-relaxed text-ink-soft">
      {children}
    </p>
  );
}

/** Konfirmasi bahwa sesuatu sudah beres, misalnya pembayaran yang masuk. */
export function SuccessNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-success/30 bg-success-soft/50 px-4 py-3 text-sm leading-relaxed text-ink">
      {children}
    </p>
  );
}

/** Kerangka pemuatan yang mengikuti bentuk konten akhir, bukan spinner generik. */
export function SkeletonRow({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-surface-sunken ${className}`}
      aria-hidden
    />
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-ink">{label}</span>
      {hint ? <span className="text-xs text-ink-soft">{hint}</span> : null}
      {children}
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </label>
  );
}

export const inputClass =
  "h-11 w-full rounded-xl border border-line bg-surface-raised px-4 text-[0.95rem] text-ink placeholder:text-ink-soft/70 focus:border-accent focus:outline-none";

export const textareaClass =
  "min-h-28 w-full rounded-xl border border-line bg-surface-raised px-4 py-3 text-[0.95rem] text-ink placeholder:text-ink-soft/70 focus:border-accent focus:outline-none";

/**
 * Ukuran angka menyesuaikan panjangnya. Nominal rupiah penuh jauh lebih
 * panjang dari angka cacah, dan pada ukuran terbesar deretan digitnya
 * melewati lebar kolom lalu menabrak statistik di sebelahnya.
 */
function statValueSize(value: string): string {
  if (value.length <= 8) return "text-4xl md:text-5xl";
  if (value.length <= 12) return "text-3xl md:text-4xl";
  return "text-2xl md:text-3xl";
}

export function Stat({
  value,
  label,
  note,
}: {
  value: string;
  label: string;
  note?: string;
}) {
  return (
    <div className="min-w-0">
      <p
        className={`font-display font-semibold tabular-nums tracking-tight text-ink ${statValueSize(
          value,
        )}`}
      >
        {value}
      </p>
      <p className="mt-2 text-sm font-medium text-ink">{label}</p>
      {note ? <p className="mt-1 text-xs text-ink-soft">{note}</p> : null}
    </div>
  );
}

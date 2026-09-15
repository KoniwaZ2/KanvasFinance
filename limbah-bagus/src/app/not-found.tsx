import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 text-center">
      <p className="font-display text-5xl font-semibold tabular-nums text-ink">
        404
      </p>
      <h1 className="mt-4 font-display text-2xl font-semibold text-ink">
        Halaman tidak ditemukan
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">
        Tautan yang Anda buka mungkin sudah berubah, atau Anda tidak punya akses
        ke halaman ini.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/">Kembali ke beranda</ButtonLink>
        <ButtonLink href="/katalog" variant="ghost">
          Lihat katalog
        </ButtonLink>
      </div>
    </div>
  );
}

"use client";

import { useActionState, useState } from "react";
import { registerTraderAction, type RegisterState } from "@/app/actions/register";
import {
  Button,
  ErrorNote,
  Field,
  InfoNote,
  inputClass,
  textareaClass,
} from "@/components/ui";

const initialState: RegisterState = {};

export function RegisterTraderForm() {
  const [state, formAction, pending] = useActionState(
    registerTraderAction,
    initialState,
  );

  // Rekening disembunyikan di balik satu tombol karena tidak wajib. Pedagang
  // yang hanya ingin dibayar tunai tidak perlu melihat tiga kolom tambahan.
  const [showAccount, setShowAccount] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-12">
      <section>
        <h2 className="font-display text-xl font-semibold text-ink">
          Data usaha
        </h2>
        <p className="mt-2 text-sm text-ink-soft">
          Dipakai pengolah untuk menemukan lokasi Anda saat menjemput sampah.
        </p>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <Field label="Nama usaha">
            <input
              name="businessName"
              required
              placeholder="Kios Sayur Bu Maryati"
              className={inputClass}
            />
          </Field>

          <Field label="Pasar atau lokasi">
            <input
              name="marketName"
              required
              placeholder="Pasar Cikupa"
              className={inputClass}
            />
          </Field>

          <div className="sm:col-span-2">
            <Field
              label="Alamat lengkap"
              hint="Sebutkan blok, nomor kios, dan patokan agar mudah ditemukan."
            >
              <textarea
                name="address"
                required
                placeholder="Blok C No. 14, Pasar Cikupa, Kabupaten Tangerang"
                className={textareaClass}
              />
            </Field>
          </div>

          <Field
            label="Perkiraan sampah organik per hari (kg)"
            hint="Perkiraan kasar sudah cukup, angka ini bukan patokan pembayaran."
          >
            <input
              type="number"
              name="dailyWasteEstKg"
              required
              min={1}
              max={5000}
              defaultValue={40}
              className={inputClass}
            />
          </Field>
        </div>
      </section>

      <section>
        <h2 className="font-display text-xl font-semibold text-ink">
          Akun masuk
        </h2>
        <p className="mt-2 text-sm text-ink-soft">
          Dipakai untuk masuk dan menerima pemberitahuan penjemputan.
        </p>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <Field label="Nama penanggung jawab">
            <input
              name="contactName"
              required
              placeholder="Maryati"
              className={inputClass}
            />
          </Field>

          <Field label="Nomor telepon atau WhatsApp">
            <input
              name="phone"
              required
              inputMode="tel"
              placeholder="0812 3456 7890"
              className={inputClass}
            />
          </Field>

          <Field label="Email">
            <input
              type="email"
              name="email"
              required
              placeholder="nama@email.com"
              className={inputClass}
            />
          </Field>

          <Field label="Kata sandi" hint="Minimal 8 karakter.">
            <input
              type="password"
              name="password"
              required
              minLength={8}
              className={inputClass}
            />
          </Field>
        </div>
      </section>

      <section>
        <h2 className="font-display text-xl font-semibold text-ink">
          Rekening penerimaan
        </h2>
        <p className="mt-2 max-w-[60ch] text-sm leading-relaxed text-ink-soft">
          Boleh dilewati sekarang. Tanpa rekening, pembeli tetap bisa membayar
          tunai di tempat saat sampah dijemput. Rekening hanya diperlukan kalau
          Anda ingin menerima pembayaran lewat QRIS, dan bisa diisi kapan saja
          lewat halaman Pencairan.
        </p>

        {showAccount ? (
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <Field label="Bank atau e-wallet">
              <input
                name="payoutBankName"
                placeholder="BCA"
                className={inputClass}
              />
            </Field>

            <Field label="Nomor rekening">
              <input
                name="payoutAccountNumber"
                inputMode="numeric"
                placeholder="1234567890"
                className={inputClass}
              />
            </Field>

            <div className="sm:col-span-2">
              <Field
                label="Nama pemilik rekening"
                hint="Tulis sama persis seperti di buku tabungan atau aplikasi e-wallet."
              >
                <input
                  name="payoutAccountName"
                  placeholder="Maryati"
                  className={inputClass}
                />
              </Field>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowAccount(true)}
            className="mt-6 text-sm font-medium text-accent underline underline-offset-4"
          >
            Isi rekening sekarang
          </button>
        )}
      </section>

      <div className="flex flex-col gap-4">
        {state.error ? <ErrorNote>{state.error}</ErrorNote> : null}

        <InfoNote>
          Mendaftar tidak dipungut biaya dan tidak ada iuran bulanan. Anda yang
          menerima uang dari sampah yang dijemput, dihitung dari berat timbangan
          di lokasi dikali harga resmi yang berlaku.
        </InfoNote>

        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Mendaftarkan" : "Daftar dan Mulai Menjual"}
        </Button>
      </div>
    </form>
  );
}

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const dateLong = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const dateShort = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const dateTime = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatRupiah(value: number): string {
  return rupiah.format(value);
}

export function formatDate(value: Date | string): string {
  return dateLong.format(new Date(value));
}

export function formatDateShort(value: Date | string): string {
  return dateShort.format(new Date(value));
}

export function formatDateTime(value: Date | string): string {
  return dateTime.format(new Date(value));
}

export function formatKg(value: number): string {
  return `${new Intl.NumberFormat("id-ID").format(value)} kg`;
}

/** Tonase untuk dashboard dampak. Satu desimal, tidak memalsukan presisi. */
export function formatTon(kg: number): string {
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(kg / 1000);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value);
}

/**
 * Rupiah kumulatif untuk kartu statistik berukuran besar.
 * Nilai dan satuannya dipisah supaya satuan bisa ditaruh di label, tidak
 * ikut memanjangkan angka sampai menabrak kolom sebelahnya.
 */
export function scaleRupiah(value: number): { amount: string; unit: string } {
  const scales = [
    { limit: 1_000_000_000_000, unit: "triliun" },
    { limit: 1_000_000_000, unit: "miliar" },
    { limit: 1_000_000, unit: "juta" },
  ];
  for (const scale of scales) {
    if (Math.abs(value) >= scale.limit) {
      return {
        amount: new Intl.NumberFormat("id-ID", {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        }).format(value / scale.limit),
        unit: scale.unit,
      };
    }
  }
  return { amount: formatNumber(Math.round(value)), unit: "" };
}

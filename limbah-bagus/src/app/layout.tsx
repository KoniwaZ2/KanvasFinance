import type { Metadata } from "next";
import { Outfit, Geist } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getSessionUser } from "@/lib/auth";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "LimbahBagus",
    template: "%s | LimbahBagus",
  },
  description:
    "Menghubungkan sampah organik pasar di Kabupaten Tangerang dengan pengolah maggot BSF, lalu menyalurkan pakan dan pupuk hasil olahannya ke petani dan peternak lokal.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getSessionUser();

  return (
    <html lang="id">
      <body className={`${outfit.variable} ${geist.variable} antialiased`}>
        <div className="flex min-h-[100dvh] flex-col">
          <SiteHeader user={user} />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}

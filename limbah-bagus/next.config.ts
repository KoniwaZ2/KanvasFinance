import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Saat development, aplikasi sering dibuka dari perangkat lain di jaringan
  // yang sama atau lewat tunnel ngrok. Tanpa daftar ini, Next.js memblokir
  // permintaan ke aset dev dari host tersebut.
  allowedDevOrigins: [
    "192.168.1.29",
    "eastbound-alienate-pretzel.ngrok-free.dev",
  ],
};

export default nextConfig;

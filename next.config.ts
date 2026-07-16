import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Pacchetti con binari nativi / worker: non devono essere impacchettati dal
  // bundler delle server function, altrimenti il rendering PDF→immagine si rompe.
  serverExternalPackages: ["@napi-rs/canvas", "unpdf"],
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Non esporre l'header X-Powered-By: Next.js (riduce l'information disclosure).
  poweredByHeader: false,
  allowedDevOrigins: ["192.168.1.121"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ylzuyhmtzfqnoyqkwiqx.supabase.co",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  // M1: security header applicati a tutte le risposte. Volutamente NON includiamo
  // una Content-Security-Policy stringente qui: va costruita e testata a parte per
  // non rompere script/stili inline di Next e le connessioni a Supabase.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Forza HTTPS per 2 anni (il sito gira su HTTPS su Vercel).
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          // Anti-clickjacking: il sito non può essere messo in un iframe esterno.
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Blocca il MIME-sniffing.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Non inviare l'URL completo come referrer verso altri siti.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Disattiva feature del browser non usate in-app (lo scan QR usa la
          // fotocamera nativa del telefono, non getUserMedia nel browser).
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

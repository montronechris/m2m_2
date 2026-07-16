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
};

export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configurazione base per Next.js
  reactStrictMode: true,

  // Consente l'accesso in sviluppo dalla rete locale
  allowedDevOrigins: ["192.168.1.121"],

  // Immagini esterne consentite
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

module.exports = nextConfig;
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Consente accesso in rete locale (opzionale)
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
      }
    ],
  },
};

module.exports = nextConfig;

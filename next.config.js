/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

<<<<<<< HEAD
=======
  // Consente accesso in rete locale (opzionale)
>>>>>>> e2c572376d9daa8f531ce90b6c321da5351904ab
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

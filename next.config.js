/** @type {import('next').NextConfig} */
const nextConfig = {
<<<<<<< HEAD
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
=======
  // Configurazione base per Next.js 15
  reactStrictMode: true,
  
  // Se usi immagini esterne (es. da Supabase o Unsplash), aggiungile qui
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ylzuyhmtzfqnoyqkwiqx.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
>>>>>>> 7c85809aabc815c67c3275935da3c1e8e5a33a4b
      },
    ],
  },
};

module.exports = nextConfig;
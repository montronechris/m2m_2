// src/app/layout.tsx
import "./globals.css";
import { Inter } from "next/font/google";
<<<<<<< HEAD
import Script from "next/script";
=======
>>>>>>> 7c85809aabc815c67c3275935da3c1e8e5a33a4b

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "TavolaRapida",
  description: "Ordina dal telefono",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
<<<<<<< HEAD
        <Script
          id="brand-color-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var keys=Object.keys(localStorage).filter(function(k){return k.startsWith('brand_color_');});if(keys.length>0){var color=localStorage.getItem(keys[0]);if(color){var hex=color.replace('#','');var r=parseInt(hex.slice(0,2),16);var g=parseInt(hex.slice(2,4),16);var b=parseInt(hex.slice(4,6),16);var bg='rgb('+Math.round(r+(255-r)*0.88)+','+Math.round(g+(255-g)*0.88)+','+Math.round(b+(255-b)*0.88)+')';document.documentElement.style.setProperty('--brand-bg',bg);}}}catch(e){}})();`,
          }}
        />
=======
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var keys=Object.keys(localStorage).filter(function(k){return k.startsWith('brand_color_');});if(keys.length>0){var color=localStorage.getItem(keys[0]);if(color){var hex=color.replace('#','');var r=parseInt(hex.slice(0,2),16);var g=parseInt(hex.slice(2,4),16);var b=parseInt(hex.slice(4,6),16);var bg='rgb('+Math.round(r+(255-r)*0.88)+','+Math.round(g+(255-g)*0.88)+','+Math.round(b+(255-b)*0.88)+')';document.documentElement.style.setProperty('--brand-bg',bg);}}}catch(e){}})();` }} />
>>>>>>> 7c85809aabc815c67c3275935da3c1e8e5a33a4b
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
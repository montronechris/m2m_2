import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { I18nProvider } from "@/components/i18n/I18nProvider";
import { AnimatedBackground } from "@/components/landing/AnimatedBackground";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,   // previene lo zoom automatico di iOS sui campi di testo
};

export const metadata: Metadata = {
  title: "m2m — Transform Your Restaurant Experience",
  description:
    "Menù digitali, ordinazione QR istantanea, gestione cucina in tempo reale e analytics potenti — tutto in un'unica piattaforma per ristoranti moderni.",
  keywords: ["menù digitale", "ordinazione QR", "software ristorante", "kitchen display", "m2m"],
  authors: [{ name: "m2m" }],
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
  },
  openGraph: {
    title: "m2m — Transform Your Restaurant Experience",
    description: "La piattaforma all-in-one per ristoranti moderni.",
    siteName: "m2m",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "m2m — Transform Your Restaurant Experience",
    description: "La piattaforma all-in-one per ristoranti moderni.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" suppressHydrationWarning>
      <head />
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {/* Script sincrono: imposta il bg PRIMA che React renderizzi,
            eliminando il flash di colore sbagliato su /cart, /order, /status. */}
        <Script src="/bg-init.js" strategy="beforeInteractive" />
        <I18nProvider>
          <AnimatedBackground />
          {children}
          <Toaster />
        </I18nProvider>
      </body>
    </html>
  );
}
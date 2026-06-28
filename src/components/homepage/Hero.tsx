"use client";
import { motion } from "framer-motion";
import { SCAN_URL } from "@/lib/config";

const fade = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: 0.15 * i, duration: 0.7, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } }),
};

export default function Hero() {
  return (
    <section className="relative z-10 flex min-h-[100svh] flex-col items-center justify-center px-6 pt-28 text-center">
      <div className="pointer-events-none absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage: "radial-gradient(rgba(182,121,76,0.12) 1px, transparent 1px)",
          backgroundSize: "26px 26px",
          maskImage: "radial-gradient(60% 60% at 50% 40%, black, transparent)",
        }} />

      <motion.span custom={0} variants={fade} initial="hidden" animate="show" className="label">
        <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulseGlow" />
        Sistema di gestione ordini per ristoranti
      </motion.span>

      <motion.h1 custom={1} variants={fade} initial="hidden" animate="show"
        className="mt-6 max-w-4xl font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-7xl">
        Dalla sala alla cucina, <span className="text-gradient">ogni ordine al posto giusto</span>
      </motion.h1>

      <motion.p custom={2} variants={fade} initial="hidden" animate="show" className="mt-6 max-w-2xl text-lg text-ink/60">
        Il menu digitale QR che porta ogni comanda in cucina in tempo reale. Meno errori,
        servizio più veloce, dati al sicuro.
      </motion.p>

      <motion.div custom={3} variants={fade} initial="hidden" animate="show" className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
        <a href={SCAN_URL} rel="noopener" className="btn-primary text-base">Avvia Demo Tavolo →</a>
        <a href="#features" className="btn-ghost">Scopri i Vantaggi</a>
      </motion.div>

      <motion.div custom={4} variants={fade} initial="hidden" animate="show"
        className="mt-16 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-sm text-ink/50">
        <Stat n="-40%" l="tempi di attesa" />
        <Stat n="TLS 1.3" l="crittografia" />
        <Stat n="0" l="carta sprecata" />
      </motion.div>
    </section>
  );
}

function Stat({ n, l }: { n: string; l: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="font-display text-2xl font-bold text-gold">{n}</span>
      <span>{l}</span>
    </div>
  );
}

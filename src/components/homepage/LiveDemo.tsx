"use client";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const IsometricMap = dynamic(() => import("@/components/homepage/IsometricMap"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center text-cream-200/50">
      <span className="animate-pulseGlow">Caricamento sala 3D…</span>
    </div>
  ),
});

const feed = [
  { t: "Tavolo 7 → Cucina", s: "In preparazione", ok: false },
  { t: "Tavolo 2 → Pronto", s: "Pronto in 4 min", ok: true },
  { t: "Tavolo 5 → Cucina", s: "Ricevuto ora", ok: false },
  { t: "Tavolo 1 → Servito", s: "Completato", ok: true },
];

export default function LiveDemo() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setI((p) => (p + 1) % feed.length), 2600);
    return () => clearInterval(iv);
  }, []);

  return (
    <section id="demo" className="relative z-10 mx-auto max-w-6xl px-6 py-32">
      <div className="text-center">
        <span className="label">Demo Live</span>
        <h2 className="mt-5 font-display text-4xl font-bold tracking-tight sm:text-5xl">
          Ordini in <span className="text-gradient">tempo reale</span>, dal tavolo alla cucina
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-ink/60">
          Ogni comanda viaggia istantaneamente. Vista isometrica live della tua sala.
        </p>
      </div>

      <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative mt-12 h-[560px] overflow-hidden rounded-[2rem] border border-ink/10 bg-espresso shadow-soft">
        <div className="absolute inset-0"><IsometricMap /></div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-espresso to-transparent" />

        <div className="absolute left-6 top-6 w-64 space-y-3">
          {feed.map((f, idx) => (
            <motion.div key={f.t}
              animate={{ opacity: idx === i ? 1 : 0.35, scale: idx === i ? 1 : 0.97, x: idx === i ? 0 : -4 }}
              transition={{ duration: 0.4 }}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-cream-50 backdrop-blur">
              <span className="font-medium">{f.t}</span>
              <span className={`flex items-center gap-1.5 text-xs ${f.ok ? "text-sage-soft" : "text-cream-200/60"}`}>
                <span className={`h-2 w-2 rounded-full ${f.ok ? "bg-sage-soft animate-pulseGlow" : "bg-cream-200/40"}`} />
                {f.s}
              </span>
            </motion.div>
          ))}
        </div>

        <div className="absolute bottom-6 right-6 flex gap-4 text-xs text-cream-200/70">
          <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-gold-soft" /> Tavolo</span>
          <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-cream-50" /> Cucina</span>
        </div>
      </motion.div>
    </section>
  );
}

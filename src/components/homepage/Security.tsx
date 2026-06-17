"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { motion, useScroll, useTransform, useMotionValueEvent } from "framer-motion";
import { useEffect } from "react";

const badges = [
  { t: "Crittografia TLS 1.3", d: "Ogni dato viaggia su canali criptati, illeggibili a terzi non autorizzati." },
  { t: "Integrità Comande", d: "Il tavolo è bloccato dal server. Impossibile ordinare per conto altrui manipolando l'URL." },
  { t: "Conformità GDPR", d: "Gestione trasparente dei dati con conservazione minima e diritto all'oblio garantito." },
];

export default function Security() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const veil = useTransform(scrollYProgress, [0, 0.3, 0.5, 0.7, 1], [0, 0.85, 0.97, 0.85, 0]);
  const [dark, setDark] = useState(false);
  useMotionValueEvent(scrollYProgress, "change", (v) => setDark(v > 0.26 && v < 0.74));

  return (
    <section ref={ref} id="security" className="relative z-10 mx-auto max-w-6xl px-6 py-32">
      {/* veil scuro guidato dallo scroll */}
      <motion.div style={{ opacity: veil }} className="pointer-events-none fixed inset-0 z-[5] bg-espresso" />

      <div className="relative z-10 grid items-center gap-16 transition-colors duration-500 lg:grid-cols-2"
        style={{ color: dark ? "#F1E8D8" : "#2B2620" }}>
        <div>
          <span className="label">Sicurezza</span>
          <h2 className="mt-5 font-display text-4xl font-bold tracking-tight sm:text-5xl">
            La tua sicurezza è la <span className="text-gold">nostra priorità</span>
          </h2>
          <p className={`mt-5 ${dark ? "text-cream-200/70" : "text-ink/60"}`}>
            Protocolli enterprise per garantire che ogni ordine sia tracciabile, sicuro e immutabile.
          </p>
          <div className="mt-10 space-y-4">
            {badges.map((b, i) => (
              <motion.div key={b.t} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.5 }} className="flex gap-4">
                <span className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-sage/20 text-sage-soft">✓</span>
                <div>
                  <h4 className="font-display font-semibold">{b.t}</h4>
                  <p className={`text-sm ${dark ? "text-cream-200/50" : "text-ink/50"}`}>{b.d}</p>
                </div>
              </motion.div>
            ))}
          </div>
          <Link href="/security" className="btn-primary mt-10 text-sm">
            Scopri di più sulla nostra Sicurezza →
          </Link>
        </div>
        <SecureTerminal />
      </div>
    </section>
  );
}

function SecureTerminal() {
  const [secs, setSecs] = useState(599);
  useEffect(() => {
    const iv = setInterval(() => setSecs((s) => (s > 0 ? s - 1 : 599)), 1000);
    return () => clearInterval(iv);
  }, []);
  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");
  const rows = [
    ["SECURE_SESSION_ID", "8f9a2b…", "text-cream-200"],
    ["STATUS", "ACTIVE & ENCRYPTED", "text-gold-soft"],
    ["TABLE_LOCK", "TRUE (ID: 1)", "text-gold-soft"],
    ["EXPIRES_IN", `${mm}:${ss}`, "text-cream-200"],
  ] as const;
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="overflow-hidden rounded-3xl bg-espresso p-1 shadow-soft ring-1 ring-white/5">
      <div className="flex items-center gap-2 px-5 py-3">
        <span className="h-3 w-3 rounded-full bg-[#d98b6b]" />
        <span className="h-3 w-3 rounded-full bg-[#d8b66b]" />
        <span className="h-3 w-3 rounded-full bg-sage-soft" />
        <span className="ml-3 text-xs text-cream-200/50">session — TLS 1.3</span>
      </div>
      <div className="space-y-3 rounded-2xl bg-black/30 p-6 font-mono text-sm">
        {rows.map(([k, v, c]) => (
          <div key={k} className="flex justify-between border-b border-white/5 pb-2">
            <span className="text-cream-200/40">{k}:</span><span className={c}>{v}</span>
          </div>
        ))}
        <div className="pt-2 text-sage-soft"><span className="animate-pulseGlow">▮</span> connessione verificata</div>
      </div>
    </motion.div>
  );
}

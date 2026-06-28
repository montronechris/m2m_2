"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Item = {
  title: string; desc: string; icon: string;
  detail?: string; href?: string; cta: string;
};

const items: Item[] = [
  {
    title: "Efficienza Massima",
    desc: "Riduci i tempi di attesa del 40%. Le comande arrivano in cucina in tempo reale.",
    icon: "⚡",
    cta: "Come ti fa risparmiare tempo",
    detail:
      "Ogni comanda parte dal tavolo e arriva in cucina all'istante: il personale non deve più attraversare la sala per prendere e riportare ordini. Meno passaggi, meno errori di trascrizione, meno confusione nelle ore di punta. Niente via-vai inutile tra sala e cucina: lo staff resta concentrato su servizio e accoglienza, mentre il flusso degli ordini è sempre ordinato, tracciato e prioritizzato. Risultato: turni più fluidi e attese ridotte.",
  },
  {
    title: "Impatto Zero",
    desc: "Addio alla stampa dei menu. Aggiorna prezzi e piatti in un click da qualsiasi dispositivo.",
    icon: "🌿",
    cta: "Perché siamo una startup green",
    detail:
      "Niente comande di carta, niente menu da ristampare a ogni cambio di prezzo o piatto: tutto è digitale e aggiornabile in un istante. Come startup green progettiamo il prodotto per ridurre gli sprechi alla fonte — meno carta, meno stampe, meno rifiuti — e per consumare il minimo lato server. Un ristorante che usa TavolaRapida elimina migliaia di scontrini di comanda l'anno. Sostenibilità non come slogan, ma come scelta di architettura.",
  },
  {
    title: "Sicurezza Blindata",
    desc: "Sessioni temporanee crittografate. Nessuno può ordinare per un altro tavolo manipolando l'URL.",
    icon: "🔒",
    cta: "Scopri di più",
    href: "#security",
  },
];

export default function Features() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section id="features" className="relative z-10 mx-auto max-w-6xl px-6 py-32">
      <div className="text-center">
        <span className="label">Perché Sceglierci</span>
        <h2 className="mt-5 font-display text-4xl font-bold tracking-tight sm:text-5xl">
          Tre motivi per <span className="text-gradient">cambiare oggi</span>
        </h2>
      </div>
      <div className="mt-16 grid items-start gap-6 md:grid-cols-3">
        {items.map((it, i) => {
          const isOpen = open === i;
          return (
            <motion.div key={it.title}
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ delay: i * 0.12, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="card group relative overflow-hidden p-8">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gold/10 blur-2xl transition group-hover:bg-gold/20" />
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gold/10 text-2xl">{it.icon}</div>
              <h3 className="mt-6 font-display text-xl font-semibold">{it.title}</h3>
              <p className="mt-3 text-ink/60">{it.desc}</p>

              {it.href ? (
                <a href={it.href} className="btn-primary mt-6 !px-5 !py-2.5 text-sm">{it.cta} →</a>
              ) : (
                <button onClick={() => setOpen(isOpen ? null : i)}
                  className="mt-6 inline-flex items-center gap-2 rounded-full border border-ink/15 px-5 py-2.5 text-sm text-ink/70 transition hover:border-gold/50 hover:text-gold">
                  {isOpen ? "Chiudi" : it.cta}
                  <motion.span animate={{ rotate: isOpen ? 180 : 0 }} className="text-xs">▾</motion.span>
                </button>
              )}

              <AnimatePresence initial={false}>
                {isOpen && it.detail && (
                  <motion.p
                    initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden text-sm leading-relaxed text-ink/60">
                    <span className="mt-4 block border-t border-ink/10 pt-4">{it.detail}</span>
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

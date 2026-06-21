// src/app/security/page.tsx
"use client";

import Link from "next/link";
import KnifeNav from "@/components/homepage/KnifeNav";
import ContactForm from "@/components/homepage/ContactForm";
import Footer from "@/components/homepage/Footer";
import { motion } from "framer-motion";
import {
  ShieldCheck, Lock, KeyRound, Database, Mail,
  FileCheck2, AlertTriangle, Eye, ServerCog,
  Clock, ArrowRight,
} from "lucide-react";

const PRINCIPLES = [
  {
    icon: Lock,
    title: "Crittografia end-to-end",
    desc: "Tutto il traffico tra dispositivo, server e database viaggia su TLS 1.3. Le password sono salate e hashate con bcrypt, mai salvate in chiaro.",
  },
  {
    icon: KeyRound,
    title: "Sessioni effimere",
    desc: "Ogni scansione QR genera una sessione temporanea univoca, valida pochi minuti e legata server-side al tavolo: non è falsificabile dal client.",
  },
  {
    icon: Database,
    title: "Isolamento dei dati",
    desc: "Ogni ristorante opera in uno spazio dati isolato (Row Level Security). Nessun account può leggere o scrivere dati di un altro account.",
  },
  {
    icon: ServerCog,
    title: "Infrastruttura gestita",
    desc: "Hosting su infrastruttura cloud con backup automatici, patching regolare e monitoraggio attivo dei servizi critici 24/7.",
  },
  {
    icon: Eye,
    title: "Privacy by design",
    desc: "Raccogliamo solo i dati strettamente necessari al servizio. Nessuna profilazione pubblicitaria, nessuna vendita di dati a terzi.",
  },
  {
    icon: FileCheck2,
    title: "Conformità GDPR",
    desc: "Trattamento dati conforme al Regolamento UE 2016/679: diritto di accesso, rettifica e cancellazione garantiti su richiesta.",
  },
];

const FAQ = [
  {
    q: "Dove vengono salvati i dati dei miei ordini?",
    a: "Su infrastruttura cloud Supabase (PostgreSQL) con backup automatici e cifratura at-rest. I dati restano nell'Unione Europea.",
  },
  {
    q: "Un cliente può modificare l'URL per ordinare su un altro tavolo?",
    a: "No. Il numero di tavolo non viene mai letto dall'URL: il server lo recupera dal database tramite l'ID di sessione, che è legato in modo univoco al QR scansionato.",
  },
  {
    q: "Come segnalo una vulnerabilità di sicurezza?",
    a: "Scrivici a security@tavolarapida.it con i dettagli tecnici. Rispondiamo entro 48 ore e, se confermata, risolviamo le vulnerabilità critiche entro 7 giorni.",
  },
  {
    q: "Posso richiedere la cancellazione dei miei dati?",
    a: "Sì, in qualsiasi momento, in linea con il GDPR. Basta una richiesta via email: elaboriamo la cancellazione entro 30 giorni.",
  },
];

export default function SecurityPage() {
  return (
    <main className="relative overflow-x-clip">
      <KnifeNav />

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 pt-44 pb-24 text-center">
        <motion.span
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }} className="label"
        >
          Trust Center
        </motion.span>
        <motion.h1
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mt-5 font-display text-5xl font-bold tracking-tight sm:text-6xl"
        >
          Sicurezza e <span className="text-gradient">Protezione dei Dati</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mx-auto mt-6 max-w-2xl text-lg text-ink/60"
        >
          Tutto quello che facciamo per proteggere i dati dei ristoratori e dei loro clienti,
          spiegato in modo trasparente. Dalla crittografia del traffico alle sessioni temporanee
          legate a ogni singolo tavolo, ogni componente della piattaforma è progettato pensando
          prima alla sicurezza e poi alla funzionalità. Non ci limitiamo a dichiararlo: qui sotto
          trovi nel dettaglio come isoliamo i dati di ogni ristorante, come gestiamo le
          segnalazioni di vulnerabilità e quali garanzie offriamo in termini di conformità GDPR.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mx-auto mt-12 grid max-w-2xl grid-cols-2 gap-6 sm:grid-cols-4"
        >
          {[
            { v: "TLS 1.3", l: "su ogni connessione" },
            { v: "RLS", l: "isolamento per ristorante" },
            { v: "< 48h", l: "risposta a segnalazioni" },
            { v: "100% UE", l: "residenza dei dati" },
          ].map((s) => (
            <div key={s.v} className="text-center">
              <div className="font-display text-2xl font-bold text-gold">{s.v}</div>
              <div className="mt-1 text-xs uppercase tracking-wide text-ink/45">{s.l}</div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Principi di sicurezza */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-24">
        <div className="text-center">
          <span className="label">I nostri principi</span>
          <h2 className="mt-5 font-display text-4xl font-bold tracking-tight sm:text-5xl">
            Sei pilastri, <span className="text-gradient">una sola priorità</span>
          </h2>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {PRINCIPLES.map(({ icon: Icon, title, desc }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ delay: i * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="card group relative overflow-hidden p-8"
            >
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gold/10 blur-2xl transition group-hover:bg-gold/20" />
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gold/10 text-gold">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mt-6 font-display text-xl font-semibold">{title}</h3>
              <p className="mt-3 text-ink/60">{desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Segnalazione vulnerabilità */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 py-24">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div>
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-wood/10 text-wood">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h2 className="mt-6 font-display text-3xl font-bold tracking-tight">
              Hai trovato una vulnerabilità?
            </h2>
            <p className="mt-4 text-ink/60">
              Prendiamo sul serio ogni segnalazione di sicurezza responsabile. Se scopri una
              falla nella piattaforma, scrivici prima di divulgarla pubblicamente: ti
              ringrazieremo per averci aiutato a proteggere tutti i nostri ristoratori.
            </p>
            <Link href="mailto:security@tavolarapida.it" className="btn-primary mt-8 text-sm">
              <Mail className="mr-2 h-4 w-4" /> security@tavolarapida.it
            </Link>
          </div>

          <div className="overflow-hidden rounded-3xl bg-espresso p-8 shadow-soft ring-1 ring-white/5">
            <h3 className="flex items-center gap-2 font-display font-semibold text-cream-50">
              <Clock className="h-5 w-5 text-sage-soft" /> I nostri tempi di risposta
            </h3>
            <ul className="mt-6 space-y-4 text-sm text-cream-200/70">
              <li className="flex items-start gap-3">
                <span className="mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-sage/20 text-sage-soft">✓</span>
                Conferma di ricezione entro <strong className="text-cream-50">48 ore</strong>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-sage/20 text-sage-soft">✓</span>
                Valutazione e classificazione entro <strong className="text-cream-50">5 giorni</strong>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-sage/20 text-sage-soft">✓</span>
                Fix per vulnerabilità critiche entro <strong className="text-cream-50">7 giorni</strong>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="relative z-10 mx-auto max-w-3xl px-6 py-24">
        <div className="text-center">
          <span className="label">FAQ</span>
          <h2 className="mt-5 font-display text-4xl font-bold tracking-tight sm:text-5xl">
            Domande <span className="text-gradient">frequenti</span>
          </h2>
        </div>

        <div className="mt-16 space-y-4">
          {FAQ.map(({ q, a }) => (
            <div key={q} className="card p-6">
              <h3 className="flex items-start gap-2 font-display font-semibold">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-gold" /> {q}
              </h3>
              <p className="mt-2 pl-7 text-ink/60">{a}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/perche-sceglierci"
            className="inline-flex items-center gap-2 font-semibold text-gold transition hover:text-gold-soft"
          >
            Scopri l'architettura tecnica completa <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <ContactForm />
      <Footer />
    </main>
  );
}

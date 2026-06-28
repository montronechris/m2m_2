// src/app/perche-sceglierci/page.tsx
"use client";

import { useState } from "react";
import SiteHeader from "@/components/layout/SiteHeader";
import ContactForm from "@/components/homepage/ContactForm";
import Footer from "@/components/homepage/Footer";
import { useSiteLanguage } from "@/hooks/use-site-language";
import type { Language } from "@/components/layout/SiteHeader";
import { motion } from "framer-motion";
import {
  QrCode, RefreshCw, Lock, Database, ShieldCheck,
} from "lucide-react";

type T = {
  badge: string;
  heroTitle1: string;
  heroTitle2: string;
  heroDesc: string;
  step1Title: string;
  step1Desc: string;
  step2Title: string;
  step2Desc: string;
  step3Title: string;
  step3Desc: string;
  warningText: string;
  ctaBadge: string;
  ctaTitle1: string;
  ctaTitle2: string;
  ctaDesc: string;
  ctaBadgeBottom: string;
};

const TRANSLATIONS: Record<Language, T> = {
  IT: {
    badge: "Architettura Sicura",
    heroTitle1: "Perché la tua Sicurezza",
    heroTitle2: "è la nostra Priorità",
    heroDesc:
      "Non usiamo semplici URL. Utilizziamo un sistema di Sessioni Temporanee Crittografate per garantire che ogni ordine provenga esclusivamente dal tavolo fisico associato. Nessun parametro modificabile, nessun link riutilizzabile: ogni sessione nasce da una scansione reale, vive pochi minuti e viene verificata dal server a ogni passaggio, dalla scansione del QR fino alla conferma dell'ordine in cucina.",
    step1Title: "1. Il QR Code è solo la Chiave",
    step1Desc:
      "Il QR Code sul tavolo contiene un Token Statico (es. TAV1-X9Z2). Questo token non è un link diretto al menu, ma una richiesta di accesso al nostro server sicuro.",
    step2Title: "2. Generazione Sessione Effimera",
    step2Desc:
      "Alla scansione, il server genera un Link Temporaneo Unico (UUID) valido solo per 10 minuti. L'utente viene reindirizzato a questo link sicuro.",
    step3Title: "3. Blocco Server-Side del Tavolo",
    step3Desc:
      "Quando l'ordine viene inviato, il server ignora qualsiasi parametro nell'URL. Recupera il numero del tavolo direttamente dal database usando l'ID della sessione.",
    warningText:
      "⚠️ Anche se l'utente modifica l'URL in &table=99, l'ordine arriverà comunque al Tavolo 1 registrato nel DB.",
    ctaBadge: "Pronti a Iniziare?",
    ctaTitle1: "Pronto a trasformare",
    ctaTitle2: "il tuo ristorante?",
    ctaDesc:
      "La sicurezza è solo l'inizio. Scopri come TavolaRapida può ottimizzare i tuoi flussi di lavoro, ridurre i costi e migliorare l'esperienza dei tuoi clienti con una demo personalizzata.",
    ctaBadgeBottom: "Architettura verificata, dati protetti",
  },
  EN: {
    badge: "Secure Architecture",
    heroTitle1: "Why Your Security",
    heroTitle2: "is Our Priority",
    heroDesc:
      "We don't use simple URLs. We use a Cryptographic Temporary Session system to ensure every order comes exclusively from the associated physical table. No modifiable parameters, no reusable links: each session is born from a real scan, lives a few minutes, and is verified by the server at every step, from QR scan to kitchen order confirmation.",
    step1Title: "1. The QR Code is Just the Key",
    step1Desc:
      "The QR Code on the table contains a Static Token (e.g. TAV1-X9Z2). This token is not a direct link to the menu, but an access request to our secure server.",
    step2Title: "2. Ephemeral Session Generation",
    step2Desc:
      "On scan, the server generates a unique Temporary Link (UUID) valid for only 10 minutes. The user is redirected to this secure link.",
    step3Title: "3. Server-Side Table Lock",
    step3Desc:
      "When the order is submitted, the server ignores any URL parameters. It retrieves the table number directly from the database using the session ID.",
    warningText:
      "⚠️ Even if the user modifies the URL to &table=99, the order will still go to Table 1 registered in the DB.",
    ctaBadge: "Ready to Start?",
    ctaTitle1: "Ready to transform",
    ctaTitle2: "your restaurant?",
    ctaDesc:
      "Security is just the beginning. Discover how TavolaRapida can optimize your workflows, reduce costs, and improve your customers' experience with a personalized demo.",
    ctaBadgeBottom: "Verified architecture, protected data",
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

export default function WhyChooseUsPage() {
  const [language, setLanguage] = useSiteLanguage();
  const t = TRANSLATIONS[language];

  return (
    <main className="relative overflow-x-clip">
      <SiteHeader language={language} onLanguageChange={setLanguage} />

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 pt-44 pb-24 text-center">
        <motion.span
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }} className="label"
        >
          {t.badge}
        </motion.span>
        <motion.h1
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mt-5 font-display text-5xl font-bold tracking-tight sm:text-6xl"
        >
          {t.heroTitle1} <br />
          <span className="text-gradient">{t.heroTitle2}</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mx-auto mt-6 max-w-2xl text-lg text-ink/60"
        >
          {t.heroDesc}
        </motion.p>
      </section>

      {/* Dettaglio tecnico */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-24 space-y-24">
        {/* Step 1 */}
        <div className="grid items-center gap-12 md:grid-cols-2">
          <motion.div
            initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="order-2 space-y-6 md:order-1"
          >
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-gold/10 text-gold">
              <QrCode className="h-6 w-6" />
            </div>
            <h2 className="font-display text-3xl font-bold tracking-tight">
              {t.step1Title}
            </h2>
            <p className="text-lg leading-relaxed text-ink/60">
              {t.step1Desc}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="order-1 overflow-hidden rounded-3xl bg-espresso p-1 shadow-soft ring-1 ring-white/5 md:order-2"
          >
            <div className="space-y-3 rounded-2xl bg-black/30 p-6 font-mono text-sm">
              <p><span className="text-gold-soft">POST</span> /api/scan/TAV1-X9Z2</p>
              <p className="text-cream-200/40">// Server verifica il token...</p>
              <p className="text-sage-soft">if (token valid) &#123;</p>
              <p className="pl-4 text-cream-200">generateSecureSession();</p>
              <p className="text-sage-soft">&#125;</p>
            </div>
          </motion.div>
        </div>

        {/* Step 2 */}
        <div className="grid items-center gap-12 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden rounded-3xl bg-espresso p-1 shadow-soft ring-1 ring-white/5"
          >
            <div className="space-y-3 rounded-2xl bg-black/30 p-6 font-mono text-sm">
              <p><span className="text-gold-soft">RESPONSE</span> 200 OK</p>
              <p className="text-cream-200">&#123;</p>
              <p className="pl-4 text-cream-200/70">"sessionId": "a1b2-c3d4-uuid...",</p>
              <p className="pl-4 text-cream-200/70">"expiresIn": "10 minutes",</p>
              <p className="pl-4 text-cream-200/70">"tableId": 1</p>
              <p className="text-cream-200">&#125;</p>
            </div>
          </motion.div>

          <motion.div
            initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-6"
          >
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-sage/15 text-sage">
              <RefreshCw className="h-6 w-6" />
            </div>
            <h2 className="font-display text-3xl font-bold tracking-tight">
              {t.step2Title}
            </h2>
            <p className="text-lg leading-relaxed text-ink/60">
              {t.step2Desc}
            </p>
          </motion.div>
        </div>

        {/* Step 3 */}
        <div className="grid items-center gap-12 md:grid-cols-2">
          <motion.div
            initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="order-2 space-y-6 md:order-1"
          >
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-wood/10 text-wood">
              <Lock className="h-6 w-6" />
            </div>
            <h2 className="font-display text-3xl font-bold tracking-tight">
              {t.step3Title}
            </h2>
            <p className="text-lg leading-relaxed text-ink/60">
              {t.step3Desc}
            </p>
            <div className="card border-l-4 border-l-wood/60 p-4">
              <p className="text-sm font-medium text-ink/70">
                {t.warningText}
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="order-1 flex justify-center md:order-2"
          >
            <div className="relative flex h-64 w-64 items-center justify-center rounded-full border-4 border-dashed border-ink/15 bg-cream-100">
              <div className="text-center">
                <Database className="mx-auto mb-2 h-16 w-16 text-ink/30" />
                <p className="font-display font-semibold text-ink/60">DB Source of Truth</p>
                <p className="text-xs text-ink/40">Table ID: 1 (Locked)</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA transizione */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 py-24 text-center">
        <motion.span
          initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.5 }} className="label"
        >
          {t.ctaBadge}
        </motion.span>
        <motion.h2
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }}
          className="mt-5 font-display text-4xl font-bold tracking-tight sm:text-5xl"
        >
          {t.ctaTitle1} <br />
          <span className="text-gradient">{t.ctaTitle2}</span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.2 }}
          className="mx-auto mt-6 max-w-2xl text-lg text-ink/60"
        >
          {t.ctaDesc}
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-8 flex items-center justify-center gap-2 text-sm text-ink/50"
        >
          <ShieldCheck className="h-4 w-4 text-gold" /> {t.ctaBadgeBottom}
        </motion.div>
      </section>

      <ContactForm />
      <Footer />
    </main>
  );
}

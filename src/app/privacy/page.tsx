// src/app/privacy/page.tsx
// Informativa sulla Privacy — pagina self-contained.
// Palette ispirata alla homepage: pesca #FFF5E6, arancione #FF6B35,
// viola #9333EA, teal #10B981, charcoal #1F2937.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import {
  ArrowLeft,
  ShieldCheck,
  Mail,
  FileText,
  Lock,
  Database,
  Eye,
  Clock,
  UtensilsCrossed,
  Globe,
  type LucideIcon,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Tipi & dati                                                         */
/* ------------------------------------------------------------------ */

type Language = "IT" | "EN";
type AccentName = "orange" | "purple" | "teal";

type Section = {
  id?: string;
  icon: LucideIcon;
  accent: AccentName;
  title: string;
  body: string;
};

type T = {
  back: string;
  eyebrow: string;
  title: string;
  updated: string;
  intro: string;
  badges: { label: string; icon: LucideIcon; accent: AccentName }[];
  stats: { value: string; label: string }[];
  sections: Section[];
  ctaTitle: string;
  ctaDesc: string;
  ctaButton: string;
  nav: { label: string; href: string }[];
  footerTagline: string;
  footerLegal: string;
  footerLegalLinks: { label: string; href: string }[];
  footerContacts: { label: string; icon: LucideIcon; accent: AccentName }[];
  footerRights: string;
  footerCompliance: string;
};

const ACCENTS: Record<
  AccentName,
  { from: string; to: string; soft: string; text: string; ring: string }
> = {
  orange: {
    from: "#FF6B35",
    to: "#F97316",
    soft: "rgba(255, 107, 53, 0.12)",
    text: "#FF6B35",
    ring: "rgba(255, 107, 53, 0.25)",
  },
  purple: {
    from: "#9333EA",
    to: "#A855F7",
    soft: "rgba(147, 51, 234, 0.12)",
    text: "#9333EA",
    ring: "rgba(147, 51, 234, 0.25)",
  },
  teal: {
    from: "#10B981",
    to: "#059669",
    soft: "rgba(16, 185, 129, 0.12)",
    text: "#10B981",
    ring: "rgba(16, 185, 129, 0.25)",
  },
};

const TRANSLATIONS: Record<Language, T> = {
  IT: {
    back: "Torna alla home",
    eyebrow: "Trasparenza & Sicurezza",
    title: "Informativa sulla Privacy",
    updated: "Ultimo aggiornamento: Giugno 2026",
    intro:
      "Questa informativa descrive come TavolaRapida raccoglie, utilizza e protegge i dati personali di ristoratori, staff e clienti. La trasparenza è parte integrante del nostro approccio alla sicurezza: vogliamo che tu sappia esattamente cosa facciamo con i tuoi dati e perché.",
    badges: [
      { label: "GDPR", icon: ShieldCheck, accent: "orange" },
      { label: "AES-256", icon: Lock, accent: "purple" },
      { label: "TLS 1.3", icon: Lock, accent: "teal" },
      { label: "ISO 27001 ready", icon: ShieldCheck, accent: "orange" },
    ],
    stats: [
      { value: "10 anni", label: "Conservazione conforme" },
      { value: "30 giorni", label: "Risposta alle richieste" },
      { value: "48 ore", label: "Report di vulnerabilità" },
    ],
    sections: [
      {
        icon: FileText,
        accent: "orange",
        title: "1. Titolare del trattamento",
        body:
          "Il titolare del trattamento dei dati personali raccolti tramite TavolaRapida è il gestore del ristorante che utilizza il servizio, in qualità di titolare autonomo per i dati dei propri clienti e collaboratori. TavolaRapida agisce esclusivamente come responsabile esterno del trattamento, secondo le modalità tecniche e organizzative definite nei presenti termini.",
      },
      {
        id: "dati",
        icon: Database,
        accent: "purple",
        title: "2. Dati raccolti",
        body:
          "Raccogliamo i dati strettamente necessari al funzionamento del servizio: nome, email e ruolo per gli account amministratore e staff; dati degli ordini (piatti, tavolo, orario) per i clienti che ordinano tramite QR code. Non raccogliamo dati di pagamento, gestiti da provider terzi certificati. I dati di navigazione (indirizzo IP, user agent) sono raccolti in forma aggregata esclusivamente per finalità di sicurezza e monitoraggio.",
      },
      {
        icon: Eye,
        accent: "teal",
        title: "3. Finalità del trattamento",
        body:
          "I dati sono trattati per: gestire l'accesso e i permessi degli account, elaborare e tracciare gli ordini, registrare le presenze del personale, generare statistiche aggregate per il gestore del ristorante. Il trattamento avviene sulla base del contratto di servizio e del legittimo interesse del titolare a erogare correttamente il servizio.",
      },
      {
        icon: Clock,
        accent: "orange",
        title: "4. Conservazione dei dati",
        body:
          "I dati relativi agli ordini e alle presenze sono conservati per il tempo necessario alle finalità gestionali e fiscali (10 anni per obblighi di legge). I dati degli account staff sono conservati fino alla cessazione del rapporto di collaborazione o su richiesta di cancellazione. Le sessioni temporanee dei tavoli vengono eliminate automaticamente dopo 10 minuti dall'ultima attività.",
      },
      {
        id: "diritti",
        icon: ShieldCheck,
        accent: "purple",
        title: "5. Diritti dell'interessato",
        body:
          "In conformità al Regolamento UE 2016/679 (GDPR), hai diritto di accedere, rettificare, limitare o richiedere la cancellazione dei tuoi dati personali, nonché di opporti al loro trattamento e di richiedere la portabilità. Le richieste possono essere inviate a privacy@tavolarapida.it e vengono evase entro 30 giorni dal ricevimento.",
      },
      {
        id: "sicurezza",
        icon: Lock,
        accent: "teal",
        title: "6. Sicurezza",
        body:
          "I dati sono protetti tramite cifratura in transito (TLS 1.3) e a riposo (AES-256), isolamento dei dati per ogni ristorante tramite Row Level Security di PostgreSQL e accessi controllati tramite autenticazione individuale con password hashate (bcrypt). Le sessioni utente sono effimere e legate al singolo dispositivo.",
      },
      {
        icon: Mail,
        accent: "orange",
        title: "7. Contatti",
        body:
          "Per qualsiasi domanda relativa al trattamento dei dati personali, scrivi a privacy@tavolarapida.it. Per segnalazioni di vulnerabilità di sicurezza, utilizza l'indirizzo dedicato security@tavolarapida.it (risposta garantita entro 48 ore). Il responsabile della protezione dei dati (DPO) è contattabile tramite gli stessi canali.",
      },
    ],
    ctaTitle: "Hai domande sulla privacy?",
    ctaDesc: "Scrivici a privacy@tavolarapida.it — risposta entro 30 giorni.",
    ctaButton: "Trust Center",
    nav: [
      { label: "Panoramica", href: "#panoramica" },
      { label: "Dati", href: "#dati" },
      { label: "Diritti", href: "#diritti" },
      { label: "Sicurezza", href: "#sicurezza" },
    ],
    footerTagline:
      "La piattaforma di ordinazione QR per ristoranti moderni. Veloce, sicura, trasparente.",
    footerLegal: "Legale",
    footerLegalLinks: [
      { label: "Privacy", href: "#panoramica" },
      { label: "Sicurezza", href: "#sicurezza" },
      { label: "Diritti GDPR", href: "#diritti" },
    ],
    footerContacts: [
      { label: "privacy@tavolarapida.it", icon: Mail, accent: "orange" },
      { label: "security@tavolarapida.it", icon: ShieldCheck, accent: "purple" },
      { label: "TLS 1.3 · AES-256", icon: Lock, accent: "teal" },
    ],
    footerRights: "Tutti i diritti riservati.",
    footerCompliance: "Conforme GDPR · ISO 27001 ready",
  },
  EN: {
    back: "Back to home",
    eyebrow: "Transparency & Security",
    title: "Privacy Policy",
    updated: "Last updated: June 2026",
    intro:
      "This policy describes how TavolaRapida collects, uses, and protects the personal data of restaurateurs, staff, and customers. Transparency is an integral part of our security approach: we want you to know exactly what we do with your data and why.",
    badges: [
      { label: "GDPR", icon: ShieldCheck, accent: "orange" },
      { label: "AES-256", icon: Lock, accent: "purple" },
      { label: "TLS 1.3", icon: Lock, accent: "teal" },
      { label: "ISO 27001 ready", icon: ShieldCheck, accent: "orange" },
    ],
    stats: [
      { value: "10 years", label: "Compliant retention" },
      { value: "30 days", label: "Request response time" },
      { value: "48 hours", label: "Vulnerability reports" },
    ],
    sections: [
      {
        icon: FileText,
        accent: "orange",
        title: "1. Data Controller",
        body:
          "The data controller for personal data collected through TavolaRapida is the restaurant operator using the service, acting as an independent controller for their customers' and collaborators' data. TavolaRapida acts exclusively as an external data processor, according to the technical and organizational terms defined herein.",
      },
      {
        id: "dati",
        icon: Database,
        accent: "purple",
        title: "2. Data collected",
        body:
          "We collect data strictly necessary for the service to function: name, email, and role for administrator and staff accounts; order data (dishes, table, time) for customers ordering via QR code. We do not collect payment data, handled by certified third-party providers. Navigation data (IP address, user agent) is collected in aggregate form exclusively for security and monitoring purposes.",
      },
      {
        icon: Eye,
        accent: "teal",
        title: "3. Purpose of processing",
        body:
          "Data is processed to: manage account access and permissions, process and track orders, record staff attendance, generate aggregate statistics for the restaurant operator. Processing is based on the service contract and the controller's legitimate interest in properly delivering the service.",
      },
      {
        icon: Clock,
        accent: "orange",
        title: "4. Data retention",
        body:
          "Order and attendance data is retained for the time necessary for management and tax purposes (10 years by law). Staff account data is retained until the collaboration ends or upon deletion request. Temporary table sessions are automatically deleted 10 minutes after the last activity.",
      },
      {
        id: "diritti",
        icon: ShieldCheck,
        accent: "purple",
        title: "5. Data subject rights",
        body:
          "In compliance with EU Regulation 2016/679 (GDPR), you have the right to access, rectify, restrict, or request deletion of your personal data, as well as object to its processing and request portability. Requests can be sent to privacy@tavolarapida.it and are processed within 30 days of receipt.",
      },
      {
        id: "sicurezza",
        icon: Lock,
        accent: "teal",
        title: "6. Security",
        body:
          "Data is protected through in-transit encryption (TLS 1.3) and at-rest encryption (AES-256), per-restaurant data isolation via PostgreSQL Row Level Security, and access controls through individual authentication with hashed passwords (bcrypt). User sessions are ephemeral and tied to the individual device.",
      },
      {
        icon: Mail,
        accent: "orange",
        title: "7. Contacts",
        body:
          "For any questions regarding personal data processing, write to privacy@tavolarapida.it. For security vulnerability reports, use the dedicated address security@tavolarapida.it (response guaranteed within 48 hours). The Data Protection Officer (DPO) can be reached through the same channels.",
      },
    ],
    ctaTitle: "Questions about privacy?",
    ctaDesc: "Write to privacy@tavolarapida.it — response within 30 days.",
    ctaButton: "Trust Center",
    nav: [
      { label: "Overview", href: "#panoramica" },
      { label: "Data", href: "#dati" },
      { label: "Rights", href: "#diritti" },
      { label: "Security", href: "#sicurezza" },
    ],
    footerTagline:
      "The QR ordering platform for modern restaurants. Fast, secure, transparent.",
    footerLegal: "Legal",
    footerLegalLinks: [
      { label: "Privacy", href: "#panoramica" },
      { label: "Security", href: "#sicurezza" },
      { label: "GDPR Rights", href: "#diritti" },
    ],
    footerContacts: [
      { label: "privacy@tavolarapida.it", icon: Mail, accent: "orange" },
      { label: "security@tavolarapida.it", icon: ShieldCheck, accent: "purple" },
      { label: "TLS 1.3 · AES-256", icon: Lock, accent: "teal" },
    ],
    footerRights: "All rights reserved.",
    footerCompliance: "GDPR Compliant · ISO 27001 ready",
  },
};

const STORAGE_KEY = "tavolarapida-language";

const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

/* ------------------------------------------------------------------ */
/* Componenti inline (header & footer)                                 */
/* ------------------------------------------------------------------ */

function PrivacyHeader({
  language,
  onLanguageChange,
  nav,
}: {
  language: Language;
  onLanguageChange: (l: Language) => void;
  nav: { label: string; href: string }[];
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className="fixed inset-x-0 top-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? "rgba(255, 245, 230, 0.85)" : "rgba(255, 240, 212, 0.55)",
        backdropFilter: "blur(16px) saturate(180%)",
        WebkitBackdropFilter: "blur(16px) saturate(180%)",
        borderBottom: scrolled ? "1px solid rgba(255, 107, 53, 0.12)" : "1px solid transparent",
        boxShadow: scrolled ? "0 4px 24px -12px rgba(31, 41, 55, 0.15)" : "none",
      }}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 md:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-xl text-white"
            style={{
              background: "linear-gradient(135deg, #FF6B35 0%, #F97316 100%)",
              boxShadow: "0 6px 18px -4px rgba(255, 107, 53, 0.5)",
            }}
          >
            <UtensilsCrossed className="h-5 w-5" />
          </span>
          <span className="text-lg font-extrabold tracking-tight text-[#1F2937]">
            Tavola<span className="text-[#FF6B35]">Rapida</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-full px-3.5 py-2 text-sm font-medium text-[#374151] transition-colors hover:bg-[#FF6B35]/10 hover:text-[#FF6B35]"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div
            className="flex items-center rounded-full p-0.5"
            style={{ background: "rgba(31, 41, 55, 0.06)" }}
          >
            <Globe className="ml-2 mr-1 h-3.5 w-3.5 text-[#6B7280]" />
            {(["IT", "EN"] as Language[]).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => onLanguageChange(lang)}
                className="rounded-full px-2.5 py-1 text-xs font-bold transition-all"
                style={
                  language === lang
                    ? {
                        background: "linear-gradient(135deg, #FF6B35 0%, #F97316 100%)",
                        color: "#ffffff",
                        boxShadow: "0 2px 8px -2px rgba(255, 107, 53, 0.5)",
                      }
                    : { color: "#6B7280" }
                }
              >
                {lang}
              </button>
            ))}
          </div>

          <a
            href="#panoramica"
            className="hidden items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white transition-transform hover:scale-105 sm:inline-flex"
            style={{
              background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
              boxShadow: "0 4px 14px -3px rgba(16, 185, 129, 0.45)",
            }}
          >
            Demo
          </a>
        </div>
      </div>
    </header>
  );
}

function PrivacyFooter({ t }: { t: T }) {
  return (
    <footer className="mt-auto border-t border-[#FF6B35]/12 bg-white">
      <div className="mx-auto max-w-6xl px-5 py-12 md:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-xl text-white"
                style={{
                  background: "linear-gradient(135deg, #FF6B35 0%, #F97316 100%)",
                  boxShadow: "0 6px 18px -4px rgba(255, 107, 53, 0.5)",
                }}
              >
                <UtensilsCrossed className="h-5 w-5" />
              </span>
              <span className="text-lg font-extrabold tracking-tight text-[#1F2937]">
                Tavola<span className="text-[#FF6B35]">Rapida</span>
              </span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-[#6B7280]">
              {t.footerTagline}
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF]">
              {t.footerLegal}
            </h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              {t.footerLegalLinks.map((l) => (
                <li key={l.label}>
                  <a href={l.href} className="text-[#374151] transition-colors hover:text-[#FF6B35]">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF]">
              {t.nav.some((n) => n.href === "#diritti") ? "Contatti" : "Contacts"}
            </h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              {t.footerContacts.map(({ label, icon: Icon, accent }) => {
                const a = ACCENTS[accent];
                return (
                  <li key={label} className="flex items-center gap-2 text-[#374151]">
                    <Icon className="h-4 w-4" style={{ color: a.text }} />
                    {label}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-[#F3F4F6] pt-6 sm:flex-row sm:items-center">
          <p className="text-xs text-[#9CA3AF]">
            © {new Date().getFullYear()} TavolaRapida. {t.footerRights}
          </p>
          <p className="text-xs text-[#9CA3AF]">{t.footerCompliance}</p>
        </div>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/* Pagina                                                              */
/* ------------------------------------------------------------------ */

export default function PrivacyPage() {
  const [language, setLanguage] = useState<Language>("IT");

  // Sincronizza la preferenza lingua persisted (legge da localStorage lato client).
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY) as Language | null;
      if ((saved === "IT" || saved === "EN") && saved !== language) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLanguage(saved);
      }
    } catch {
      /* ignore */
    }
  }, [language]);

  const changeLanguage = (lang: Language) => {
    setLanguage(lang);
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* ignore */
    }
  };

  const t = TRANSLATIONS[language];

  return (
    <div
      className="relative flex min-h-screen flex-col overflow-hidden"
      style={{
        background: "linear-gradient(120deg, #FFF5E6 0%, #FFF9F0 40%, #F8F9FA 100%)",
      }}
    >
      {/* Blob decorativi */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 top-10 h-96 w-96 rounded-full"
        style={{ background: "rgba(255, 107, 53, 0.18)", filter: "blur(110px)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 top-40 h-[28rem] w-[28rem] rounded-full"
        style={{ background: "rgba(147, 51, 234, 0.14)", filter: "blur(120px)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-1/3 h-80 w-80 rounded-full"
        style={{ background: "rgba(16, 185, 129, 0.12)", filter: "blur(110px)" }}
      />

      <PrivacyHeader
        language={language}
        onLanguageChange={changeLanguage}
        nav={t.nav}
      />

      <main className="relative mx-auto w-full max-w-3xl flex-1 px-5 pb-16 pt-28 md:px-6 md:pt-36">
        {/* Back link */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <Link
            href="/"
            className="-ml-3 inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-[#6B7280] transition-colors hover:bg-[#FF6B35]/8 hover:text-[#FF6B35]"
          >
            <ArrowLeft className="h-4 w-4" />
            {t.back}
          </Link>
        </motion.div>

        {/* Hero card */}
        <motion.section
          id="panoramica"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8 overflow-hidden rounded-[2rem] border p-7 md:p-10"
          style={{
            background: "rgba(255, 255, 255, 0.65)",
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
            borderColor: "rgba(255, 255, 255, 0.7)",
            boxShadow:
              "0 20px 60px -18px rgba(31, 41, 55, 0.18), inset 0 1px 0 rgba(255,255,255,0.8)",
          }}
        >
          <div className="flex items-center gap-3.5">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl text-white"
              style={{
                background: "linear-gradient(135deg, #FF6B35 0%, #F97316 100%)",
                boxShadow:
                  "0 10px 28px -6px rgba(255, 107, 53, 0.55), inset 0 1px 0 rgba(255,255,255,0.35)",
              }}
            >
              <ShieldCheck className="h-7 w-7" />
            </div>
            <div>
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#FF6B35]"
                style={{ background: "rgba(255, 107, 53, 0.10)" }}
              >
                {t.eyebrow}
              </span>
              <h1 className="mt-1.5 text-2xl font-black tracking-tight text-[#1F2937] md:text-3xl">
                {t.title}
              </h1>
            </div>
          </div>

          <p className="mt-4 text-xs font-medium text-[#9CA3AF]">{t.updated}</p>

          <p className="mt-4 text-sm leading-relaxed text-[#4B5563] md:text-base">
            {t.intro}
          </p>

          {/* Trust badges */}
          <div className="mt-6 flex flex-wrap gap-2">
            {t.badges.map(({ label, icon: Icon, accent }) => {
              const a = ACCENTS[accent];
              return (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold"
                  style={{ color: a.text, background: a.soft, borderColor: a.ring }}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </span>
              );
            })}
          </div>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {t.stats.map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-[#F3F4F6] bg-white/70 px-4 py-3"
              >
                <p className="text-lg font-extrabold text-[#1F2937]">{s.value}</p>
                <p className="mt-0.5 text-xs text-[#6B7280]">{s.label}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Sections */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="space-y-4"
        >
          {t.sections.map(({ id, icon: Icon, accent, title, body }) => {
            const a = ACCENTS[accent];
            return (
              <motion.article
                key={title}
                id={id}
                variants={itemVariants}
                className="group scroll-mt-24 rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-0.5"
                style={{
                  background: "rgba(255, 255, 255, 0.7)",
                  backdropFilter: "blur(16px) saturate(180%)",
                  WebkitBackdropFilter: "blur(16px) saturate(180%)",
                  borderColor: "rgba(255, 255, 255, 0.8)",
                  boxShadow: "0 6px 20px -10px rgba(31, 41, 55, 0.12)",
                }}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110"
                    style={{
                      background: `linear-gradient(135deg, ${a.from} 0%, ${a.to} 100%)`,
                      color: "#ffffff",
                      boxShadow: `0 6px 16px -4px ${a.ring}`,
                    }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="mb-2 text-base font-bold text-[#1F2937] md:text-lg">
                      {title}
                    </h2>
                    <p className="text-sm leading-relaxed text-[#4B5563] md:text-[15px]">
                      {body}
                    </p>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </motion.div>

        {/* CTA banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative mt-8 overflow-hidden rounded-[1.75rem] p-7 md:p-8"
          style={{
            background: "linear-gradient(120deg, #EC4899 0%, #9333EA 100%)",
            boxShadow: "0 20px 50px -16px rgba(147, 51, 234, 0.45)",
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full"
            style={{ background: "rgba(255, 255, 255, 0.18)", filter: "blur(40px)" }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-12 -left-8 h-44 w-44 rounded-full"
            style={{ background: "rgba(255, 255, 255, 0.12)", filter: "blur(50px)" }}
          />
          <div className="relative flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <div className="flex-1">
              <h3 className="text-lg font-extrabold text-white md:text-xl">
                {t.ctaTitle}
              </h3>
              <p className="mt-1 text-sm text-white/85">{t.ctaDesc}</p>
            </div>
            <Link
              href="/"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-[#9333EA] transition-transform hover:scale-105"
              style={{ boxShadow: "0 6px 18px -4px rgba(0,0,0,0.2)" }}
            >
              <ShieldCheck className="h-4 w-4" />
              {t.ctaButton}
            </Link>
          </div>
        </motion.div>
      </main>

      <PrivacyFooter t={t} />
    </div>
  );
}

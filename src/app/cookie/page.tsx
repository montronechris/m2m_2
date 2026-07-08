// src/app/cookie/page.tsx
// Cookie Policy — pagina self-contained.
// Palette ispirata alla homepage: pesca #FFF5E6, arancione #FF6B35,
// viola #9333EA, teal #10B981, charcoal #1F2937.
// Stessa grafica, animazioni in/out ed effetti della pagina Terms.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  ArrowLeft,
  Cookie,
  Mail,
  FileText,
  Settings2,
  BarChart3,
  Share2,
  ToggleLeft,
  RefreshCw,
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
    eyebrow: "Trasparenza & Tracciamento",
    title: "Cookie Policy",
    updated: "Ultimo aggiornamento: Giugno 2026",
    intro:
      "Questa Cookie Policy descrive i tipi di cookie e tecnologie simili utilizzate da TavolaRapida, le relative finalità e le modalità con cui puoi gestire le tue preferenze. Crediamo in un tracciamento minimo e trasparente: usiamo solo i cookie strettamente necessari al funzionamento del servizio e, previo consenso, cookie analitici aggregati per migliorare l'esperienza.",
    badges: [
      { label: "GDPR Art. 13", icon: Cookie, accent: "orange" },
      { label: "ePrivacy", icon: FileText, accent: "purple" },
      { label: "Tracciamento minimo", icon: ToggleLeft, accent: "teal" },
      { label: "Consenso granulare", icon: Settings2, accent: "orange" },
    ],
    stats: [
      { value: "4", label: "Categorie di cookie" },
      { value: "100%", label: "Cookie sotto controllo" },
      { value: "0", label: "Cookie pubblicitari" },
    ],
    sections: [
      {
        id: "cosasono",
        icon: Cookie,
        accent: "orange",
        title: "1. Cosa sono i cookie",
        body:
          "I cookie sono piccoli file di testo che il sito web visitato salva sul dispositivo dell'utente. Permettono di memorizzare informazioni sulle preferenze, mantenere la sessione attiva e raccogliere dati statistici aggregati sull'utilizzo. Esistono cookie di sessione (cancellati alla chiusura del browser) e cookie persistenti (mantenuti fino alla scadenza o alla cancellazione manuale). Le tecnologie simili (localStorage, pixel, fingerprint) svolgono funzioni analoghe e sono disciplinate dalla stessa normativa.",
      },
      {
        id: "categorie",
        icon: FileText,
        accent: "purple",
        title: "2. Categorie di cookie utilizzati",
        body:
          "TavolaRapida utilizza quattro categorie di cookie: tecnici necessari (per il funzionamento del servizio e non richiedono consenso), di preferenza (memorizzano lingua e impostazioni), analitici (attivati solo previo consenso, in forma aggregata e anonimizzata) e di terze parti (limitati a provider di pagamento e analytics certificati). Non utilizziamo cookie pubblicitari, profiling commerciale né tracciamento cross-site per finalità di marketing.",
      },
      {
        id: "tecnici",
        icon: Settings2,
        accent: "teal",
        title: "3. Cookie tecnici e necessari",
        body:
          "Questi cookie sono indispensabili per il funzionamento della piattaforma: gestiscono l'autenticazione del Gestore e dello staff, mantengono attiva la sessione del tavolo QR per 10 minuti dall'ultima attività, memorizzano il carrello ordini temporaneo e applicano le preferenze di lingua. Sono esentati dall'obbligo di consenso ai sensi dell'art. 122 del Codice Privacy e non possono essere disattivati, perché la loro disattivazione comprometterebbe le funzionalità base del servizio.",
      },
      {
        id: "analytics",
        icon: BarChart3,
        accent: "orange",
        title: "4. Cookie analitici",
        body:
          "Previo consenso esplicito dell'utente, raccogliamo metriche di utilizzo aggregate e anonimizzate: numero di ordini per fascia oraria, tempi medi di permanenza, pagine più visitate. I dati sono elaborati in forma statistica e non permettono l'identificazione del singolo utente. Il consenso è raccolto tramite banner iniziale e può essere revocato in qualsiasi momento dal pulsante «Gestisci cookie» in fondo a ogni pagina. La revoca non pregiudica i cookie tecnici.",
      },
      {
        id: "terzeparti",
        icon: Share2,
        accent: "purple",
        title: "5. Cookie di terze parti",
        body:
          "TavolaRapida integra esclusivamente provider terzi certificati e conformi al GDPR: Stripe per i pagamenti (cookie di sessione transazionali, senza profilazione) e Plausible per l'analytics privacy-first (nessun cookie persistente, nessun cross-site tracking). Non integriamo pixel pubblicitari, SDK social né servizi di remarketing. L'elenco aggiornato dei provider e dei domini coinvolti è disponibile su richiesta all'indirizzo privacy@tavolarapida.it.",
      },
      {
        id: "gestione",
        icon: ToggleLeft,
        accent: "teal",
        title: "6. Gestione e revoca del consenso",
        body:
          "Puoi gestire le tue preferenze cookie in qualsiasi momento cliccando su «Gestisci cookie» in fondo alla pagina o tramite le impostazioni del tuo browser. La disattivazione dei cookie tecnici non è supportata perché bloccherebbe l'accesso al servizio; la disattivazione di quelli analitici è invece possibile e non comporta alcuna perdita di funzionalità. Offriamo anche un pulsante «Rifiuta tutto» nel banner iniziale per negare il consenso analitico con un solo clic, in linea con le linee guida EDPB.",
      },
      {
        id: "aggiornamenti",
        icon: RefreshCw,
        accent: "orange",
        title: "7. Aggiornamenti e contatti",
        body:
          "La presente Cookie Policy può essere aggiornata per riflettere cambiamenti tecnologici o normativi: le modifiche sostanziali saranno segnalate tramite banner in homepage e, per i Gestori registrati, tramite email all'indirizzo associato all'account. Per domande sui cookie o per esercitare i tuoi diritti puoi scrivere a privacy@tavolarapida.it (risposta entro 30 giorni). Il DPO è contattabile tramite lo stesso canale.",
      },
    ],
    ctaTitle: "Domande sui cookie?",
    ctaDesc: "Scrivici a privacy@tavolarapida.it — risposta entro 30 giorni.",
    ctaButton: "Scrivici",
    nav: [
      { label: "Panoramica", href: "#panoramica" },
      { label: "Categorie", href: "#categorie" },
      { label: "Analytics", href: "#analytics" },
      { label: "Gestione", href: "#gestione" },
    ],
    footerTagline:
      "La piattaforma di ordinazione QR per ristoranti moderni. Veloce, sicura, trasparente.",
    footerLegal: "Legale",
    footerLegalLinks: [
      { label: "Cookie", href: "#panoramica" },
      { label: "Gestione", href: "#gestione" },
      { label: "Privacy", href: "/privacy" },
    ],
    footerContacts: [
      { label: "privacy@tavolarapida.it", icon: Mail, accent: "orange" },
      { label: "Tracciamento minimo", icon: ToggleLeft, accent: "purple" },
      { label: "GDPR · ePrivacy", icon: Cookie, accent: "teal" },
    ],
    footerRights: "Tutti i diritti riservati.",
    footerCompliance: "Conforme GDPR · ISO 27001 ready",
  },
  EN: {
    back: "Back to home",
    eyebrow: "Transparency & Tracking",
    title: "Cookie Policy",
    updated: "Last updated: June 2026",
    intro:
      "This Cookie Policy describes the types of cookies and similar technologies used by TavolaRapida, their purposes, and how you can manage your preferences. We believe in minimal and transparent tracking: we use only the cookies strictly necessary for the service to function and, with prior consent, aggregated analytical cookies to improve the experience.",
    badges: [
      { label: "GDPR Art. 13", icon: Cookie, accent: "orange" },
      { label: "ePrivacy", icon: FileText, accent: "purple" },
      { label: "Minimal tracking", icon: ToggleLeft, accent: "teal" },
      { label: "Granular consent", icon: Settings2, accent: "orange" },
    ],
    stats: [
      { value: "4", label: "Cookie categories" },
      { value: "100%", label: "Cookies under control" },
      { value: "0", label: "Advertising cookies" },
    ],
    sections: [
      {
        id: "cosasono",
        icon: Cookie,
        accent: "orange",
        title: "1. What cookies are",
        body:
          "Cookies are small text files that the visited website saves on the user's device. They allow storing information about preferences, keeping the session active, and collecting aggregate statistical data on usage. There are session cookies (deleted when the browser is closed) and persistent cookies (kept until expiration or manual deletion). Similar technologies (localStorage, pixels, fingerprinting) perform similar functions and are governed by the same regulations.",
      },
      {
        id: "categorie",
        icon: FileText,
        accent: "purple",
        title: "2. Categories of cookies used",
        body:
          "TavolaRapida uses four categories of cookies: technical necessary (required for the service to function and require no consent), preference cookies (store language and settings), analytical cookies (activated only with prior consent, in aggregate and anonymized form), and third-party cookies (limited to certified payment and analytics providers). We do not use advertising cookies, commercial profiling, or cross-site tracking for marketing purposes.",
      },
      {
        id: "tecnici",
        icon: Settings2,
        accent: "teal",
        title: "3. Technical and necessary cookies",
        body:
          "These cookies are essential for the platform to function: they manage Operator and staff authentication, keep the QR table session active for 10 minutes after the last activity, store the temporary order cart, and apply language preferences. They are exempt from the consent requirement pursuant to Article 122 of the Privacy Code and cannot be disabled, because disabling them would compromise the basic functionalities of the service.",
      },
      {
        id: "analytics",
        icon: BarChart3,
        accent: "orange",
        title: "4. Analytical cookies",
        body:
          "With the user's explicit consent, we collect aggregate and anonymized usage metrics: number of orders by time slot, average dwell times, most visited pages. Data is processed in statistical form and does not allow identification of the individual user. Consent is collected through an initial banner and can be revoked at any time from the «Manage cookies» button at the bottom of each page. Revocation does not affect technical cookies.",
      },
      {
        id: "terzeparti",
        icon: Share2,
        accent: "purple",
        title: "5. Third-party cookies",
        body:
          "TavolaRapida integrates only certified GDPR-compliant third-party providers: Stripe for payments (transactional session cookies, no profiling) and Plausible for privacy-first analytics (no persistent cookies, no cross-site tracking). We do not integrate advertising pixels, social SDKs, or remarketing services. The updated list of providers and domains involved is available on request at privacy@tavolarapida.it.",
      },
      {
        id: "gestione",
        icon: ToggleLeft,
        accent: "teal",
        title: "6. Consent management and revocation",
        body:
          "You can manage your cookie preferences at any time by clicking «Manage cookies» at the bottom of the page or through your browser settings. Disabling technical cookies is not supported because it would block access to the service; disabling analytical cookies is possible and does not entail any loss of functionality. We also offer a «Reject all» button in the initial banner to deny analytical consent with a single click, in line with EDPB guidelines.",
      },
      {
        id: "aggiornamenti",
        icon: RefreshCw,
        accent: "orange",
        title: "7. Updates and contacts",
        body:
          "This Cookie Policy may be updated to reflect technological or regulatory changes: substantial changes will be reported via a banner on the homepage and, for registered Operators, via email to the address associated with the account. For questions about cookies or to exercise your rights, you can write to privacy@tavolarapida.it (response within 30 days). The DPO can be reached through the same channel.",
      },
    ],
    ctaTitle: "Questions about cookies?",
    ctaDesc: "Write to privacy@tavolarapida.it — response within 30 days.",
    ctaButton: "Contact us",
    nav: [
      { label: "Overview", href: "#panoramica" },
      { label: "Categories", href: "#categorie" },
      { label: "Analytics", href: "#analytics" },
      { label: "Management", href: "#gestione" },
    ],
    footerTagline:
      "The QR ordering platform for modern restaurants. Fast, secure, transparent.",
    footerLegal: "Legal",
    footerLegalLinks: [
      { label: "Cookie", href: "#panoramica" },
      { label: "Management", href: "#gestione" },
      { label: "Privacy", href: "/privacy" },
    ],
    footerContacts: [
      { label: "privacy@tavolarapida.it", icon: Mail, accent: "orange" },
      { label: "Minimal tracking", icon: ToggleLeft, accent: "purple" },
      { label: "GDPR · ePrivacy", icon: Cookie, accent: "teal" },
    ],
    footerRights: "All rights reserved.",
    footerCompliance: "GDPR Compliant · ISO 27001 ready",
  },
};

const STORAGE_KEY = "tavolarapida-language";

/* ------------------------------------------------------------------ */
/* Animazioni (in / out) — coerenti con la pagina Terms                */
/* ------------------------------------------------------------------ */

const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
  exit: { transition: { staggerChildren: 0.04, staggerDirection: -1 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    y: -12,
    transition: { duration: 0.28, ease: [0.4, 0, 1, 1] },
  },
};

const heroVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    y: -16,
    transition: { duration: 0.3, ease: [0.4, 0, 1, 1] },
  },
};

const ctaVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    y: 12,
    transition: { duration: 0.28, ease: [0.4, 0, 1, 1] },
  },
};

/* ------------------------------------------------------------------ */
/* Componenti inline (header & footer)                                 */
/* ------------------------------------------------------------------ */

function CookieHeader({
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
            <Cookie className="h-5 w-5" />
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

function CookieFooter({ t }: { t: T }) {
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
                <Cookie className="h-5 w-5" />
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
              {t.nav.some((n) => n.href === "#gestione") ? "Contatti" : "Contacts"}
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

export default function CookiePage() {
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
      {/* Blob decorativi (identici alla pagina Terms) */}
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

      <CookieHeader
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

        {/* Animazione in/out sul cambio lingua: AnimatePresence con chiave language */}
        <AnimatePresence mode="wait">
          <motion.div
            key={language}
            initial="hidden"
            animate="show"
            exit="exit"
            className="space-y-8"
          >
            {/* Hero card */}
            <motion.section
              id="panoramica"
              variants={heroVariants}
              className="overflow-hidden rounded-[2rem] border p-7 md:p-10"
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
                <motion.div
                  className="flex h-14 w-14 items-center justify-center rounded-2xl text-white"
                  style={{
                    background: "linear-gradient(135deg, #FF6B35 0%, #F97316 100%)",
                    boxShadow:
                      "0 10px 28px -6px rgba(255, 107, 53, 0.55), inset 0 1px 0 rgba(255,255,255,0.35)",
                  }}
                  animate={{
                    rotate: [0, -8, 8, -6, 6, 0],
                    boxShadow: [
                      "0 10px 28px -6px rgba(255, 107, 53, 0.55), inset 0 1px 0 rgba(255,255,255,0.35)",
                      "0 10px 32px -4px rgba(255, 107, 53, 0.75), inset 0 1px 0 rgba(255,255,255,0.45)",
                      "0 10px 28px -6px rgba(255, 107, 53, 0.55), inset 0 1px 0 rgba(255,255,255,0.35)",
                    ],
                  }}
                  transition={{
                    duration: 5,
                    repeat: Infinity,
                    ease: "easeInOut",
                    times: [0, 0.2, 0.4, 0.6, 0.8, 1],
                  }}
                >
                  <Cookie className="h-7 w-7" />
                </motion.div>
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
              <motion.div
                variants={containerVariants}
                className="mt-6 flex flex-wrap gap-2"
              >
                {t.badges.map(({ label, icon: Icon, accent }) => {
                  const a = ACCENTS[accent];
                  return (
                    <motion.span
                      key={label}
                      variants={itemVariants}
                      whileHover={{ y: -2, scale: 1.04 }}
                      className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold"
                      style={{ color: a.text, background: a.soft, borderColor: a.ring }}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </motion.span>
                  );
                })}
              </motion.div>

              {/* Stats */}
              <motion.div
                variants={containerVariants}
                className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3"
              >
                {t.stats.map((s) => (
                  <motion.div
                    key={s.label}
                    variants={itemVariants}
                    whileHover={{ y: -2 }}
                    className="rounded-2xl border border-[#F3F4F6] bg-white/70 px-4 py-3 transition-shadow hover:shadow-md"
                  >
                    <p className="text-lg font-extrabold text-[#1F2937]">{s.value}</p>
                    <p className="mt-0.5 text-xs text-[#6B7280]">{s.label}</p>
                  </motion.div>
                ))}
              </motion.div>
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
                      <motion.div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110"
                        whileHover={{ rotate: -4 }}
                        style={{
                          background: `linear-gradient(135deg, ${a.from} 0%, ${a.to} 100%)`,
                          color: "#ffffff",
                          boxShadow: `0 6px 16px -4px ${a.ring}`,
                        }}
                      >
                        <Icon className="h-5 w-5" />
                      </motion.div>
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
              variants={ctaVariants}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-60px" }}
              className="relative overflow-hidden rounded-[1.75rem] p-7 md:p-8"
              style={{
                background: "linear-gradient(120deg, #EC4899 0%, #9333EA 100%)",
                boxShadow: "0 20px 50px -16px rgba(147, 51, 234, 0.45)",
              }}
            >
              <motion.div
                aria-hidden
                className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full"
                style={{ background: "rgba(255, 255, 255, 0.18)", filter: "blur(40px)" }}
                animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.85, 0.6] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div
                aria-hidden
                className="pointer-events-none absolute -bottom-12 -left-8 h-44 w-44 rounded-full"
                style={{ background: "rgba(255, 255, 255, 0.12)", filter: "blur(50px)" }}
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.75, 0.5] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
              />
              <div className="relative flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <h3 className="text-lg font-extrabold text-white md:text-xl">
                    {t.ctaTitle}
                  </h3>
                  <p className="mt-1 text-sm text-white/85">{t.ctaDesc}</p>
                </div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
                  <a
                    href="mailto:privacy@tavolarapida.it"
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-[#9333EA] transition-transform"
                    style={{ boxShadow: "0 6px 18px -4px rgba(0,0,0,0.2)" }}
                  >
                    <Cookie className="h-4 w-4" />
                    {t.ctaButton}
                  </a>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </main>

      <CookieFooter t={t} />
    </div>
  );
}

// src/app/privacy/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import SiteHeader from "@/components/layout/SiteHeader";
import Footer from "@/components/homepage/Footer";
import { useSiteLanguage } from "@/hooks/use-site-language";
import type { Language } from "@/components/layout/SiteHeader";
import { ArrowLeft, ShieldCheck, Mail, FileText, Lock, Database, Eye, Clock } from "lucide-react";

type T = {
  title: string;
  updated: string;
  intro: string;
  sections: { icon: typeof FileText; title: string; body: string }[];
  ctaTitle: string;
  ctaDesc: string;
  ctaButton: string;
};

const TRANSLATIONS: Record<Language, T> = {
  IT: {
    title: "Informativa sulla Privacy",
    updated: "Ultimo aggiornamento: Giugno 2026",
    intro:
      "Questa informativa descrive come TavolaRapida raccoglie, utilizza e protegge i dati personali di ristoratori, staff e clienti. La trasparenza è parte integrante del nostro approccio alla sicurezza: vogliamo che tu sappia esattamente cosa facciamo con i tuoi dati e perché.",
    sections: [
      {
        icon: FileText,
        title: "1. Titolare del trattamento",
        body: "Il titolare del trattamento dei dati personali raccolti tramite TavolaRapida è il gestore del ristorante che utilizza il servizio, in qualitàà di titolare autonomo per i dati dei propri clienti e collaboratori. TavolaRapida agisce esclusivamente come responsabile esterno del trattamento, secondo le modalità tecniche e organizzative definite nei presenti termini.",
      },
      {
        icon: Database,
        title: "2. Dati raccolti",
        body: "Raccogliamo i dati strettamente necessari al funzionamento del servizio: nome, email e ruolo per gli account amministratore e staff; dati degli ordini (piatti, tavolo, orario) per i clienti che ordinano tramite QR code. Non raccogliamo dati di pagamento, gestiti da provider terzi certificati. I dati di navigazione (indirizzo IP, user agent) sono raccolti in forma aggregata esclusivamente per finalità di sicurezza e monitoraggio.",
      },
      {
        icon: Eye,
        title: "3. Finalità del trattamento",
        body: "I dati sono trattati per: gestire l'accesso e i permessi degli account, elaborare e tracciare gli ordini, registrare le presenze del personale, generare statistiche aggregate per il gestore del ristorante. Il trattamento avviene sulla base del contratto di servizio e del legittimo interesse del titolare a erogare correttamente il servizio.",
      },
      {
        icon: Clock,
        title: "4. Conservazione dei dati",
        body: "I dati relativi agli ordini e alle presenze sono conservati per il tempo necessario alle finalità gestionali e fiscali (10 anni per obblighi di legge). I dati degli account staff sono conservati fino alla cessazione del rapporto di collaborazione o su richiesta di cancellazione. Le sessioni temporanee dei tavoli vengono eliminate automaticamente dopo 10 minuti dall'ultima attività.",
      },
      {
        icon: ShieldCheck,
        title: "5. Diritti dell'interessato",
        body: "In conformità al Regolamento UE 2016/679 (GDPR), hai diritto di accedere, rettificare, limitare o richiedere la cancellazione dei tuoi dati personali, nonché di opporti al loro trattamento e di richiedere la portabilità. Le richieste possono essere inviate a privacy@tavolarapida.it e vengono evase entro 30 giorni dal ricevimento.",
      },
      {
        icon: Lock,
        title: "6. Sicurezza",
        body: "I dati sono protetti tramite cifratura in transito (TLS 1.3) e a riposo (AES-256), isolamento dei dati per ogni ristorante tramite Row Level Security di PostgreSQL e accessi controllati tramite autenticazione individuale con password hashate (bcrypt). Le sessioni utente sono effimere e legate al singolo dispositivo.",
      },
      {
        icon: Mail,
        title: "7. Contatti",
        body: "Per qualsiasi domanda relativa al trattamento dei dati personali, scrivi a privacy@tavolarapida.it. Per segnalazioni di vulnerabilità di sicurezza, utilizza l'indirizzo dedicato security@tavolarapida.it (risposta garantita entro 48 ore). Il responsabile della protezione dei dati (DPO) è contattabile tramite gli stessi canali.",
      },
    ],
    ctaTitle: "Hai domande sulla privacy?",
    ctaDesc: "Scrivici a privacy@tavolarapida.it — risposta entro 30 giorni.",
    ctaButton: "Trust Center",
  },
  EN: {
    title: "Privacy Policy",
    updated: "Last updated: June 2026",
    intro:
      "This policy describes how TavolaRapida collects, uses, and protects the personal data of restaurateurs, staff, and customers. Transparency is an integral part of our security approach: we want you to know exactly what we do with your data and why.",
    sections: [
      {
        icon: FileText,
        title: "1. Data Controller",
        body: "The data controller for personal data collected through TavolaRapida is the restaurant operator using the service, acting as an independent controller for their customers' and collaborators' data. TavolaRapida acts exclusively as an external data processor, according to the technical and organizational terms defined herein.",
      },
      {
        icon: Database,
        title: "2. Data collected",
        body: "We collect data strictly necessary for the service to function: name, email, and role for administrator and staff accounts; order data (dishes, table, time) for customers ordering via QR code. We do not collect payment data, handled by certified third-party providers. Navigation data (IP address, user agent) is collected in aggregate form exclusively for security and monitoring purposes.",
      },
      {
        icon: Eye,
        title: "3. Purpose of processing",
        body: "Data is processed to: manage account access and permissions, process and track orders, record staff attendance, generate aggregate statistics for the restaurant operator. Processing is based on the service contract and the controller's legitimate interest in properly delivering the service.",
      },
      {
        icon: Clock,
        title: "4. Data retention",
        body: "Order and attendance data is retained for the time necessary for management and tax purposes (10 years by law). Staff account data is retained until the collaboration ends or upon deletion request. Temporary table sessions are automatically deleted 10 minutes after the last activity.",
      },
      {
        icon: ShieldCheck,
        title: "5. Data subject rights",
        body: "In compliance with EU Regulation 2016/679 (GDPR), you have the right to access, rectify, restrict, or request deletion of your personal data, as well as object to its processing and request portability. Requests can be sent to privacy@tavolarapida.it and are processed within 30 days of receipt.",
      },
      {
        icon: Lock,
        title: "6. Security",
        body: "Data is protected through in-transit encryption (TLS 1.3) and at-rest encryption (AES-256), per-restaurant data isolation via PostgreSQL Row Level Security, and access controls through individual authentication with hashed passwords (bcrypt). User sessions are ephemeral and tied to the individual device.",
      },
      {
        icon: Mail,
        title: "7. Contacts",
        body: "For any questions regarding personal data processing, write to privacy@tavolarapida.it. For security vulnerability reports, use the dedicated address security@tavolarapida.it (response guaranteed within 48 hours). The Data Protection Officer (DPO) can be reached through the same channels.",
      },
    ],
    ctaTitle: "Questions about privacy?",
    ctaDesc: "Write to privacy@tavolarapida.it — response within 30 days.",
    ctaButton: "Trust Center",
  },
};

export default function PrivacyPage() {
  const [language, setLanguage] = useSiteLanguage();
  const t = TRANSLATIONS[language];

  return (
    <main
      className="relative min-h-screen overflow-hidden"
      style={{
        background: `
          radial-gradient(circle at 0% 0%, rgba(182,121,76,0.12) 0%, transparent 45%),
          radial-gradient(circle at 100% 0%, rgba(224,160,32,0.10) 0%, transparent 45%),
          radial-gradient(circle at 50% 100%, rgba(126,148,114,0.08) 0%, transparent 55%),
          linear-gradient(135deg, #FBF8F1 0%, #F1E8D8 100%)`,
      }}
    >
      <div
        aria-hidden
        className="absolute top-20 -left-32 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: "rgba(182,121,76,0.16)", filter: "blur(100px)" }}
      />
      <div
        aria-hidden
        className="absolute bottom-20 -right-32 w-[28rem] h-[28rem] rounded-full pointer-events-none"
        style={{ background: "rgba(224,160,32,0.12)", filter: "blur(120px)" }}
      />

      <SiteHeader language={language} onLanguageChange={setLanguage} />

      <div className="relative mx-auto max-w-3xl px-5 pt-28 pb-12 md:px-6 md:pt-36 md:pb-20">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[oklch(0.50_0.08_60)] hover:text-[oklch(0.80_0.19_85)] transition-colors mb-10 min-h-[44px] py-2 px-3 -ml-3 rounded-full hover:bg-[oklch(0.80_0.19_85/0.08)]"
        >
          <ArrowLeft className="w-4 h-4" />
          {language === "IT" ? "Torna alla home" : "Back to home"}
        </Link>

        <div
          className="rounded-[2rem] p-7 md:p-10 mb-10 border"
          style={{
            background: "rgba(255,255,255,0.55)",
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
            borderColor: "rgba(255,255,255,0.6)",
            boxShadow: "0 16px 48px -12px rgba(43,38,32,0.18), inset 0 1px 0 rgba(255,255,255,0.7)",
          }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #B6794C 0%, #E0A020 100%)",
                boxShadow: "0 8px 24px -4px rgba(182,121,76,0.45), inset 0 1px 0 rgba(255,255,255,0.3)",
              }}
            >
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-[oklch(0.25_0.10_65)]">
                {t.title}
              </h1>
              <p className="text-xs text-[oklch(0.50_0.08_60)] mt-0.5">{t.updated}</p>
            </div>
          </div>
          <p className="text-sm md:text-base leading-relaxed text-[oklch(0.38_0.08_60)]">
            {t.intro}
          </p>
        </div>

        <div className="space-y-4">
          {t.sections.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-2xl p-6 border transition-all duration-300 hover:shadow-lg"
              style={{
                background: "rgba(255,255,255,0.55)",
                backdropFilter: "blur(16px) saturate(180%)",
                WebkitBackdropFilter: "blur(16px) saturate(180%)",
                borderColor: "rgba(255,255,255,0.6)",
                boxShadow: "0 4px 16px -8px rgba(43,38,32,0.1)",
              }}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: "rgba(182,121,76,0.12)",
                    color: "#B6794C",
                    border: "1px solid rgba(182,121,76,0.2)",
                  }}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base md:text-lg font-bold text-[oklch(0.25_0.10_65)] mb-2">
                    {title}
                  </h2>
                  <p className="text-sm md:text-[15px] leading-relaxed text-[oklch(0.38_0.08_60)]">
                    {body}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div
          className="mt-10 rounded-2xl p-6 border flex flex-col sm:flex-row items-start sm:items-center gap-4"
          style={{
            background: "rgba(182,121,76,0.08)",
            borderColor: "rgba(182,121,76,0.2)",
          }}
        >
          <div className="flex-1">
            <p className="text-sm font-semibold text-[oklch(0.25_0.10_65)]">{t.ctaTitle}</p>
            <p className="text-xs text-[oklch(0.50_0.08_60)] mt-1">{t.ctaDesc}</p>
          </div>
          <Link
            href="/security"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-white px-4 py-2.5 rounded-full transition-transform hover:scale-105 shrink-0"
            style={{
              background: "linear-gradient(135deg, #B6794C 0%, #E0A020 100%)",
              boxShadow: "0 4px 12px -2px rgba(182,121,76,0.4)",
            }}
          >
            <ShieldCheck className="w-4 h-4" />
            {t.ctaButton}
          </Link>
        </div>
      </div>

      <Footer />
    </main>
  );
}

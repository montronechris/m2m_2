// src/app/termini/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import SiteHeader from "@/components/layout/SiteHeader";
import Footer from "@/components/homepage/Footer";
import { useSiteLanguage } from "@/hooks/use-site-language";
import type { Language } from "@/components/layout/SiteHeader";
import { ArrowLeft, FileText, UserCheck, Settings, CreditCard, AlertCircle, RefreshCw, Mail } from "lucide-react";

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
    title: "Termini di Servizio",
    updated: "Ultimo aggiornamento: Giugno 2026",
    intro:
      "I presenti termini definiscono le condizioni di utilizzo della piattaforma TavolaRapida. Leggili con attenzione: regolano il rapporto contrattuale tra te (gestore del ristorante o membro dello staff) e TavolaRapida, e stabiliscono i reciproci diritti e obblighi.",
    sections: [
      {
        icon: FileText,
        title: "1. Oggetto",
        body: "I presenti Termini di Servizio regolano l'utilizzo della piattaforma TavolaRapida, un sistema di gestione ordini, tavoli e staff per attività di ristorazione. La piattaforma è fornita in modalità Software-as-a-Service (SaaS) e comprende menu digitali accessibili via QR code, dashboard di amministrazione, gestione del personale e strumenti di analisi. L'utilizzo del servizio implica l'accettazione integrale dei presenti termini.",
      },
      {
        icon: UserCheck,
        title: "2. Account e accesso",
        body: "L'accesso alla piattaforma richiede la creazione di un account individuale. Ogni utente è responsabile della riservatezza delle proprie credenziali e del codice turno personale assegnato, che non deve essere condiviso con altri membri dello staff. Il titolare del ristorante è responsabile della gestione dei ruoli e dei permessi assegnati a ciascun account. La registrazione di account con dati falsi o di terzi senza autorizzazione comporta l'immediata sospensione del servizio.",
      },
      {
        icon: Settings,
        title: "3. Utilizzo del servizio",
        body: "Il servizio deve essere utilizzato esclusivamente per finalità lecite legate alla gestione dell'attività di ristorazione. È vietato qualsiasi utilizzo che possa compromettere la sicurezza, la disponibilità o l'integrità della piattaforma, inclusi tentativi di accesso non autorizzato, reverse engineering, invio di contenuti dannosi o uso del servizio per attività fraudolente. TavolaRapida si riserva il diritto di sospendere account che violino queste condizioni.",
      },
      {
        icon: CreditCard,
        title: "4. Abbonamento",
        body: "L'accesso alle funzionalità della piattaforma è regolato dal piano di abbonamento attivo associato al ristorante. I piani disponibili sono Starter, Professional ed Enterprise, ciascuno con limiti di utilizzo e funzionalità differenti. Allo scadere dell'abbonamento, l'accesso alle funzionalità amministrative potrà essere limitato fino al rinnovo. I dati del ristorante restano conservati per 90 giorni dallo scadere, dopodiché vengono cancellati in modo irreversibile.",
      },
      {
        icon: AlertCircle,
        title: "5. Responsabilità",
        body: "TavolaRapida fornisce la piattaforma \"così com'è\" e non garantisce l'assenza di interruzioni o errori. Il gestore del ristorante è responsabile dei contenuti inseriti (menu, prezzi, dati staff) e della loro conformità normativa, inclusa la corretta applicazione dell'IVA e delle normative locali. TavolaRapida non è responsabile di eventuali perdite economiche derivanti da interruzioni del servizio, salvo casi di dolo o colpa grave.",
      },
      {
        icon: RefreshCw,
        title: "6. Modifiche ai termini",
        body: "I presenti termini possono essere aggiornati periodicamente per riflettere evoluzioni normative, nuove funzionalità del servizio o feedback degli utenti. Le modifiche sostanziali saranno comunicate tramite la piattaforma con almeno 30 giorni di preavviso. L'utilizzo continuato del servizio dopo l'entrata in vigore delle modifiche costituisce accettazione dei nuovi termini.",
      },
      {
        icon: Mail,
        title: "7. Contatti",
        body: "Per domande relative ai presenti Termini di Servizio, scrivi a supporto@tavolarapida.it. Per questioni legali o contrattuali, utilizza l'indirizzo legal@tavolarapida.it. Il team di supporto è disponibile dal lunedì al venerdì, 9:00-18:00 CET, con tempi di risposta medi inferiori a 24 ore per richieste ordinarie.",
      },
    ],
    ctaTitle: "Domande sui termini?",
    ctaDesc: "Scrivici a supporto@tavolarapida.it — risposta entro 24 ore.",
    ctaButton: "Privacy Policy",
  },
  EN: {
    title: "Terms of Service",
    updated: "Last updated: June 2026",
    intro:
      "These terms define the conditions for using the TavolaRapida platform. Read them carefully: they regulate the contractual relationship between you (restaurant operator or staff member) and TavolaRapida, and establish mutual rights and obligations.",
    sections: [
      {
        icon: FileText,
        title: "1. Subject",
        body: "These Terms of Service govern the use of the TavolaRapida platform, an order, table, and staff management system for restaurant businesses. The platform is provided as Software-as-a-Service (SaaS) and includes digital menus accessible via QR code, administration dashboard, staff management, and analytics tools. Using the service implies full acceptance of these terms.",
      },
      {
        icon: UserCheck,
        title: "2. Account and access",
        body: "Accessing the platform requires creating an individual account. Each user is responsible for the confidentiality of their credentials and personal shift code, which must not be shared with other staff members. The restaurant operator is responsible for managing roles and permissions assigned to each account. Registering accounts with false or third-party data without authorization results in immediate service suspension.",
      },
      {
        icon: Settings,
        title: "3. Service usage",
        body: "The service must be used exclusively for lawful purposes related to restaurant business management. Any use that may compromise the platform's security, availability, or integrity is prohibited, including unauthorized access attempts, reverse engineering, sending malicious content, or using the service for fraudulent activities. TavolaRapida reserves the right to suspend accounts that violate these conditions.",
      },
      {
        icon: CreditCard,
        title: "4. Subscription",
        body: "Access to platform features is governed by the active subscription plan associated with the restaurant. Available plans are Starter, Professional, and Enterprise, each with different usage limits and features. Upon subscription expiration, access to administrative features may be limited until renewal. Restaurant data is retained for 90 days after expiration, then permanently deleted.",
      },
      {
        icon: AlertCircle,
        title: "5. Responsibility",
        body: "TavolaRapida provides the platform \"as is\" and does not guarantee the absence of interruptions or errors. The restaurant operator is responsible for the content entered (menus, prices, staff data) and its regulatory compliance, including correct VAT application and local regulations. TavolaRapida is not liable for any economic losses resulting from service interruptions, except in cases of fraud or gross negligence.",
      },
      {
        icon: RefreshCw,
        title: "6. Changes to terms",
        body: "These terms may be updated periodically to reflect regulatory developments, new service features, or user feedback. Substantial changes will be communicated through the platform with at least 30 days' notice. Continued use of the service after changes take effect constitutes acceptance of the new terms.",
      },
      {
        icon: Mail,
        title: "7. Contacts",
        body: "For questions regarding these Terms of Service, write to support@tavolarapida.it. For legal or contractual matters, use legal@tavolarapida.it. The support team is available Monday to Friday, 9:00 AM - 6:00 PM CET, with average response times under 24 hours for standard requests.",
      },
    ],
    ctaTitle: "Questions about the terms?",
    ctaDesc: "Write to support@tavolarapida.it — response within 24 hours.",
    ctaButton: "Privacy Policy",
  },
};

export default function TerminiPage() {
  const [language, setLanguage] = useSiteLanguage();
  const t = TRANSLATIONS[language];

  return (
    <main
      className="relative min-h-screen overflow-hidden"
      style={{
        background: `
          radial-gradient(circle at 0% 0%, rgba(126,148,114,0.12) 0%, transparent 45%),
          radial-gradient(circle at 100% 0%, rgba(182,121,76,0.10) 0%, transparent 45%),
          radial-gradient(circle at 50% 100%, rgba(224,160,32,0.08) 0%, transparent 55%),
          linear-gradient(135deg, #FBF8F1 0%, #F1E8D8 100%)`,
      }}
    >
      <div
        aria-hidden
        className="absolute top-20 -right-32 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: "rgba(126,148,114,0.16)", filter: "blur(100px)" }}
      />
      <div
        aria-hidden
        className="absolute bottom-20 -left-32 w-[28rem] h-[28rem] rounded-full pointer-events-none"
        style={{ background: "rgba(182,121,76,0.14)", filter: "blur(120px)" }}
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
                background: "linear-gradient(135deg, #7E9472 0%, #5E7355 100%)",
                boxShadow: "0 8px 24px -4px rgba(94,115,85,0.45), inset 0 1px 0 rgba(255,255,255,0.3)",
              }}
            >
              <FileText className="w-6 h-6 text-white" />
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
                    background: "rgba(126,148,114,0.15)",
                    color: "#5E7355",
                    border: "1px solid rgba(126,148,114,0.25)",
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
            background: "rgba(126,148,114,0.08)",
            borderColor: "rgba(126,148,114,0.25)",
          }}
        >
          <div className="flex-1">
            <p className="text-sm font-semibold text-[oklch(0.25_0.10_65)]">{t.ctaTitle}</p>
            <p className="text-xs text-[oklch(0.50_0.08_60)] mt-1">{t.ctaDesc}</p>
          </div>
          <Link
            href="/privacy"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-white px-4 py-2.5 rounded-full transition-transform hover:scale-105 shrink-0"
            style={{
              background: "linear-gradient(135deg, #7E9472 0%, #5E7355 100%)",
              boxShadow: "0 4px 12px -2px rgba(94,115,85,0.4)",
            }}
          >
            <FileText className="w-4 h-4" />
            {t.ctaButton}
          </Link>
        </div>
      </div>

      <Footer />
    </main>
  );
}

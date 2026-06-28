"use client";
import { useSiteLanguage } from "@/hooks/use-site-language";
import type { Language } from "@/components/layout/SiteHeader";

type T = {
  tagline: string;
  navTitle: string;
  navLinks: string[];
  legalTitle: string;
  legalLinks: string[];
  copyright: string;
  madeWith: string;
};

const TRANSLATIONS: Record<Language, T> = {
  IT: {
    tagline:
      "La soluzione completa per la gestione degli ordini nella ristorazione moderna. Semplifichiamo la comanda, ottimizziamo il servizio e proteggiamo i tuoi dati.",
    navTitle: "Navigazione",
    navLinks: ["Home", "Funzioni", "Sicurezza", "Demo", "Contatti"],
    legalTitle: "Legale",
    legalLinks: ["Privacy Policy", "Termini di Servizio", "Cookie Policy", "GDPR"],
    copyright: "© 2026 TavolaRapida S.r.l. — Tutti i diritti riservati.",
    madeWith: "Fatto con ❤️ in Italia",
  },
  EN: {
    tagline:
      "The complete solution for order management in modern dining. We simplify ordering, optimize service, and protect your data.",
    navTitle: "Navigation",
    navLinks: ["Home", "Features", "Security", "Demo", "Contact"],
    legalTitle: "Legal",
    legalLinks: ["Privacy Policy", "Terms of Service", "Cookie Policy", "GDPR"],
    copyright: "© 2026 TavolaRapida Ltd. — All rights reserved.",
    madeWith: "Made with ❤️ in Italy",
  },
};

export default function Footer() {
  const [language] = useSiteLanguage();
  const t = TRANSLATIONS[language];
  const cols = [
    { h: t.navTitle, links: t.navLinks },
    { h: t.legalTitle, links: t.legalLinks },
  ];
  return (
    <footer className="relative z-10 border-t border-ink/10 px-6 py-16 bg-cream">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2 font-display text-lg font-bold text-ink">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 14a4 4 0 1 1 1.2-7.8 4 4 0 0 1 9.6 0A4 4 0 1 1 18 14M6 14v4h12v-4M6 14h12" />
            </svg>
            Tavola<span className="text-gold">Rapida</span>
          </div>
          <p className="mt-4 max-w-sm text-sm text-ink/50">{t.tagline}</p>
        </div>
        {cols.map((c) => (
          <div key={c.h}>
            <h4 className="font-display text-sm font-semibold text-ink/80">{c.h}</h4>
            <ul className="mt-4 space-y-2 text-sm text-ink/50">
              {c.links.map((l) => <li key={l}><a href="#" className="transition hover:text-gold">{l}</a></li>)}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto mt-12 flex max-w-6xl flex-col items-center justify-between gap-3 border-t border-ink/10 pt-8 text-xs text-ink/40 sm:flex-row">
        <span>{t.copyright}</span>
        <span>{t.madeWith}</span>
      </div>
    </footer>
  );
}

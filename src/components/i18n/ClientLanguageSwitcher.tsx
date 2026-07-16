"use client";

// src/components/i18n/ClientLanguageSwitcher.tsx
//
// Selettore lingua per le pagine (client): a differenza del LanguageSwitcher
// it/en della landing, offre molte lingue e usa useClientLocale() → la UI viene
// tradotta a runtime (vedi ClientLocaleProvider). La lingua di default è già
// quella del browser; questo controllo serve al cliente per cambiarla a mano.

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Globe, Loader2 } from "lucide-react";
import { useClientLocale } from "./ClientLocaleProvider";

interface LangOption {
  code: string;
  flag: string;
  label: string;
}

// Lista curata (native + principali per il turismo). L'app comunque prova a
// tradurre in qualsiasi lingua passata a setLocale().
const LANGS: LangOption[] = [
  { code: "it", flag: "🇮🇹", label: "Italiano" },
  { code: "en", flag: "🇬🇧", label: "English" },
  { code: "fr", flag: "🇫🇷", label: "Français" },
  { code: "es", flag: "🇪🇸", label: "Español" },
  { code: "de", flag: "🇩🇪", label: "Deutsch" },
  { code: "pt", flag: "🇵🇹", label: "Português" },
  { code: "nl", flag: "🇳🇱", label: "Nederlands" },
  { code: "pl", flag: "🇵🇱", label: "Polski" },
  { code: "ro", flag: "🇷🇴", label: "Română" },
  { code: "ru", flag: "🇷🇺", label: "Русский" },
  { code: "zh", flag: "🇨🇳", label: "中文" },
  { code: "ja", flag: "🇯🇵", label: "日本語" },
  { code: "ar", flag: "🇸🇦", label: "العربية" },
];

interface Props {
  /** Colore d'accento del brand del ristorante. */
  accentColor?: string;
}

export function ClientLanguageSwitcher({ accentColor = "#f97316" }: Props) {
  const { locale, setLocale, loading } = useClientLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(null);

  const primary = locale.toLowerCase().split("-")[0];
  const current =
    LANGS.find((l) => l.code === primary) ?? { code: primary, flag: "🌐", label: primary.toUpperCase() };

  // Il menu è renderizzato in un portal su <body>: calcoliamo la posizione dal
  // bottone così resta ancorato anche durante scroll/resize, ma senza ereditare
  // il contesto di impilamento (z-index) della navbar.
  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setCoords({ top: r.bottom + 6, right: window.innerWidth - r.right });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white/70 px-3 py-1.5 text-[12px] font-semibold text-gray-700 backdrop-blur-xl transition hover:bg-white"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: accentColor }} />
        ) : (
          <Globe className="h-3.5 w-3.5" style={{ color: accentColor }} />
        )}
        <span className="leading-none">{current.flag}</span>
        <span className="uppercase tracking-wide">{current.code}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && coords && typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            className="fixed z-[9999] max-h-72 w-44 overflow-auto rounded-xl border border-black/10 bg-white p-1 shadow-xl"
            style={{ top: coords.top, right: coords.right }}
          >
          {LANGS.map((l) => {
            const active = l.code === primary;
            return (
              <button
                key={l.code}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  setLocale(l.code);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition ${
                  active ? "font-bold" : "text-gray-700 hover:bg-gray-100"
                }`}
                style={active ? { backgroundColor: `${accentColor}1a`, color: accentColor } : undefined}
              >
                <span className="text-base leading-none">{l.flag}</span>
                <span className="flex-1 truncate">{l.label}</span>
                {active && <Check className="h-3.5 w-3.5" />}
              </button>
            );
          })}
          </div>,
          document.body,
        )}
    </div>
  );
}

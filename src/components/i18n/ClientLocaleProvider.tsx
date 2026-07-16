"use client";

// src/components/i18n/ClientLocaleProvider.tsx
//
// Layer i18n SOLO per le pagine (client). Avvolge il sottoalbero e ri-fornisce
// lo stesso context di useI18n() con `tr.client` tradotto nella lingua scelta
// dal cliente — così TUTTE le pagine client (che usano già useI18n().tr.client)
// ottengono la traduzione senza alcuna modifica.
//
// Lingua:
//  - it / en → dizionario nativo, istantaneo.
//  - qualsiasi altra → si scarica una volta la mappa tradotta da
//    /api/i18n/client (con cache lato server) e si applica sulla base italiana.
//  - default: rilevata da navigator.language (o dall'ultima scelta salvata).

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { I18nContext, type I18nCtx } from "./I18nProvider";
import { dictionary } from "@/lib/i18n/dictionary";
import {
  applyClientTranslations,
  type TranslationMap,
} from "@/lib/i18n/client-translations";

const LS_KEY = "m2m-client-locale";

interface ClientLocaleCtx {
  /** Locale corrente (es. "it", "en", "fr", "pt-BR"). */
  locale: string;
  setLocale: (l: string) => void;
  /** true mentre si scarica la traduzione di una lingua non nativa. */
  loading: boolean;
}

const LocaleCtx = createContext<ClientLocaleCtx | null>(null);

export function useClientLocale(): ClientLocaleCtx {
  const ctx = useContext(LocaleCtx);
  if (!ctx) throw new Error("useClientLocale must be used within ClientLocaleProvider");
  return ctx;
}

// Cache in memoria per non riscaricare la stessa lingua durante la sessione.
const mapCache = new Map<string, TranslationMap>();

function primaryOf(locale: string): string {
  return locale.toLowerCase().split("-")[0];
}

export function ClientLocaleProvider({ children }: { children: React.ReactNode }) {
  const base = useContext(I18nContext);
  const [locale, setLocaleState] = useState<string>("it");
  const [map, setMap] = useState<TranslationMap | null>(null);
  const [loading, setLoading] = useState(false);

  // Inizializzazione: ultima scelta salvata, altrimenti lingua del browser.
  useEffect(() => {
    let initial = "";
    try {
      initial = window.localStorage.getItem(LS_KEY) ?? "";
    } catch {
      /* noop */
    }
    if (!initial && typeof navigator !== "undefined") {
      initial = navigator.language || "";
    }
    if (initial) setLocaleState(initial);
  }, []);

  const setLocale = useCallback((l: string) => {
    setLocaleState(l);
    try {
      window.localStorage.setItem(LS_KEY, l);
    } catch {
      /* noop */
    }
  }, []);

  const primary = primaryOf(locale);
  const isNative = primary === "it" || primary === "en";

  // Tiene <html lang> allineato al locale mostrato.
  useEffect(() => {
    if (typeof document !== "undefined") document.documentElement.lang = primary || "it";
  }, [primary]);

  // Scarica la mappa tradotta per le lingue non native.
  useEffect(() => {
    if (isNative) {
      setMap(null);
      setLoading(false);
      return;
    }
    const cached = mapCache.get(locale);
    if (cached) {
      setMap(cached);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    fetch(`/api/i18n/client?lang=${encodeURIComponent(locale)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { map?: TranslationMap }) => {
        if (!active) return;
        const m = d.map ?? {};
        mapCache.set(locale, m);
        setMap(m);
      })
      .catch(() => {
        if (active) setMap(null); // fallback alla base
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [locale, isNative]);

  // Valore di context aumentato per le pagine client.
  const value = useMemo<I18nCtx | null>(() => {
    if (!base) return null;
    if (primary === "it") return { ...base, lang: "it", tr: dictionary.it };
    if (primary === "en") return { ...base, lang: "en", tr: dictionary.en };
    // Lingua esotica: base inglese per il resto della UI, `client` tradotto.
    const translatedClient = map
      ? applyClientTranslations(dictionary.it.client, map)
      : dictionary.en.client;
    return {
      ...base,
      lang: "en",
      tr: { ...dictionary.en, client: translatedClient },
    } as I18nCtx;
  }, [base, primary, map]);

  const localeValue = useMemo<ClientLocaleCtx>(
    () => ({ locale, setLocale, loading }),
    [locale, setLocale, loading],
  );

  if (!value) return <>{children}</>;

  return (
    <I18nContext.Provider value={value}>
      <LocaleCtx.Provider value={localeValue}>{children}</LocaleCtx.Provider>
    </I18nContext.Provider>
  );
}

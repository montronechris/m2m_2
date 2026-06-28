"use client";

import { useState, useEffect, useCallback } from "react";
import type { Language } from "@/components/layout/SiteHeader";

/**
 * useSiteLanguage — Hook condiviso per gestire la lingua del sito.
 * - Default IT
 * - Persistito in localStorage (chiave: "site_lang")
 * - Sincronizzato tra tutti i componenti via storage event + custom event
 */
export function useSiteLanguage(): [Language, (lang: Language) => void] {
  const [language, setLanguage] = useState<Language>("IT");

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("site_lang") : null;
    if (saved === "IT" || saved === "EN") {
      setLanguage(saved);
    } else if (typeof window !== "undefined") {
      localStorage.setItem("site_lang", "IT");
    }

    // Listen for language changes from other components
    const onStorageChange = (e: StorageEvent) => {
      if (e.key === "site_lang" && (e.newValue === "IT" || e.newValue === "EN")) {
        setLanguage(e.newValue);
      }
    };
    const onCustomChange = (e: Event) => {
      const lang = (e as CustomEvent<Language>).detail;
      if (lang === "IT" || lang === "EN") setLanguage(lang);
    };
    window.addEventListener("storage", onStorageChange);
    window.addEventListener("site-language-change", onCustomChange as EventListener);
    return () => {
      window.removeEventListener("storage", onStorageChange);
      window.removeEventListener("site-language-change", onCustomChange as EventListener);
    };
  }, []);

  const setLang = useCallback((lang: Language) => {
    setLanguage(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem("site_lang", lang);
      // Dispatch custom event so other components on the same page update immediately
      window.dispatchEvent(new CustomEvent("site-language-change", { detail: lang }));
    }
  }, []);

  return [language, setLang];
}

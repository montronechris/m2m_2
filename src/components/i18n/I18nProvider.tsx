'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { DEFAULT_LANG, dictionary, type Lang } from '@/lib/i18n/dictionary'

type I18nCtx = {
  lang: Lang
  setLang: (l: Lang) => void
  tr: (typeof dictionary)[Lang]
}

const Ctx = createContext<I18nCtx | null>(null)

const STORAGE_KEY = 'm2m-lang'

function readStoredLang(): Lang {
  if (typeof window === 'undefined') return DEFAULT_LANG
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY) as Lang | null
    if (stored === 'it' || stored === 'en') return stored
  } catch {
    /* noop */
  }
  return DEFAULT_LANG
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // Lazy initializer reads localStorage once on client mount — no cascading effect.
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG)

  // hydrate from localStorage on mount (single pass)
  useEffect(() => {
    const stored = readStoredLang()
    if (stored !== lang) setLangState(stored)
    // keep <html lang> in sync
    document.documentElement.lang = stored
    // we intentionally read once
  }, [lang])

  // keep <html lang> in sync when switching language
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang
    }
  }, [lang])

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    try {
      window.localStorage.setItem(STORAGE_KEY, l)
    } catch {
      /* noop */
    }
  }, [])

  const value = useMemo<I18nCtx>(() => ({ lang, setLang, tr: dictionary[lang] }), [lang, setLang])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useI18n() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}


// Esposto per il layer i18n delle pagine client: permette di ri-fornire lo stesso
// context con `tr.client` tradotto a runtime (vedi ClientLocaleProvider), senza
// toccare le singole pagine né questo provider di base.
export { Ctx as I18nContext }
export type { I18nCtx }

'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Cookie,
  ShieldCheck,
  BarChart3,
  Megaphone,
  ChevronDown,
  ChevronUp,
  Check,
} from 'lucide-react'

/**
 * CookieConsent — GDPR cookie consent banner.
 *
 * - Shows a bottom banner on first visit (checks localStorage `m2m-cookie-consent`).
 * - Once a choice is made (accept all / reject all / save preferences), the banner
 *   is never shown again.
 * - Glass background (.glass) + .noise-overlay, rounded-t-3xl, shadow-2xl, z-[55].
 * - Three actions: Rifiuta tutti (outline), Personalizza (expandable toggles),
 *   Accetta tutti (gradient amber→terra with .sheen).
 * - Slide-up entrance with spring + slide-down exit on close.
 * - Responsive: actions stack on mobile, row on desktop.
 */
const STORAGE_KEY = 'm2m-cookie-consent'

type ConsentValue = {
  version: 1
  choice: 'all' | 'essential'
  analytics: boolean
  marketing: boolean
  ts: number
}

function readStored(): ConsentValue | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ConsentValue
    if (parsed && (parsed.choice === 'all' || parsed.choice === 'essential')) {
      return parsed
    }
  } catch {
    /* noop */
  }
  return null
}

function writeStored(value: ConsentValue) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch {
    /* noop */
  }
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false)
  const [showPrefs, setShowPrefs] = useState(false)
  const [analytics, setAnalytics] = useState(false)
  const [marketing, setMarketing] = useState(false)

  // On first client mount: if no prior consent, show banner after a short delay
  // (small delay so it doesn't fight with hero entrance animations).
  useEffect(() => {
    const stored = readStored()
    if (!stored) {
      const id = window.setTimeout(() => setVisible(true), 900)
      return () => window.clearTimeout(id)
    }
  }, [])

  function closeWith(value: ConsentValue) {
    writeStored(value)
    setVisible(false)
    // Reset preferences panel after exit animation finishes.
    window.setTimeout(() => {
      setShowPrefs(false)
      setAnalytics(false)
      setMarketing(false)
    }, 450)
  }

  // When the user opens "Personalizza", pre-select ALL cookie categories
  // (essential is always on; analytics + marketing default to ON) so the
  // panel reflects an "accept all" starting point the user can opt-out from.
  function togglePrefs() {
    setShowPrefs((v) => {
      if (!v) {
        setAnalytics(true)
        setMarketing(true)
      }
      return !v
    })
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="cookie-consent"
          role="dialog"
          aria-modal="false"
          aria-label="Consenso cookie"
          initial={{ y: 360, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 360, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 180, damping: 26 }}
          className="fixed inset-x-0 bottom-0 z-[55] px-3 pb-3 sm:px-6 sm:pb-6"
        >
          <div className="glass noise-overlay relative mx-auto w-full max-w-5xl overflow-hidden rounded-t-3xl rounded-b-2xl border border-ink/10 shadow-2xl">
            {/* Top accent stripe */}
            <div className="h-1 w-full bg-gradient-to-r from-brand-amber via-brand-terra to-brand-rose" />

            <div className="relative p-5 sm:p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-6">
                {/* Left: icon + copy */}
                <div className="flex flex-1 items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-amber to-brand-terra text-white shadow-glow-amber">
                    <Cookie className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-base font-bold text-ink sm:text-lg">
                      Usiamo i cookie
                    </h2>
                    <p className="mt-1 text-xs leading-relaxed text-ink/70 sm:text-sm">
                      I cookie essenziali sono necessari per il funzionamento del
                      sito. Quelli analitici ci aiutano a migliorare
                      l&apos;esperienza, quelli marketing (opzionali)
                      personalizzano i contenuti.
                    </p>
                  </div>
                </div>

                {/* Right: actions */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      closeWith({
                        version: 1,
                        choice: 'essential',
                        analytics: false,
                        marketing: false,
                        ts: Date.now(),
                      })
                    }
                    className="rounded-full border border-ink/15 bg-white/50 px-4 py-2 text-xs font-semibold text-ink/70 transition hover:bg-ink/5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber/40 sm:text-sm"
                  >
                    Rifiuta tutti
                  </button>
                  <button
                    type="button"
                    onClick={togglePrefs}
                    aria-expanded={showPrefs}
                    className="rounded-full border border-ink/15 bg-white/50 px-4 py-2 text-xs font-semibold text-ink/70 transition hover:bg-ink/5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber/40 sm:text-sm"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      Personalizza
                      {showPrefs ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      closeWith({
                        version: 1,
                        choice: 'all',
                        analytics: true,
                        marketing: true,
                        ts: Date.now(),
                      })
                    }
                    className="sheen relative overflow-hidden rounded-full bg-gradient-to-r from-brand-amber to-brand-terra px-5 py-2 text-xs font-bold text-white shadow-glow-amber transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber/50 sm:text-sm"
                  >
                    Accetta tutti
                  </button>
                </div>
              </div>

              {/* Preferences panel */}
              <AnimatePresence initial={false}>
                {showPrefs && (
                  <motion.div
                    key="prefs"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="mt-5 grid gap-3 border-t border-ink/10 pt-5 sm:grid-cols-2">
                      <PrefRow
                        icon={<ShieldCheck className="h-4 w-4 text-brand-emerald" />}
                        title="Essenziali"
                        desc="Sempre attivi. Necessari per login, carrello e sicurezza."
                        value
                        disabled
                      />
                      <PrefRow
                        icon={<BarChart3 className="h-4 w-4 text-brand-violet" />}
                        title="Analitici"
                        desc="Statistiche aggregate anonime per migliorare il sito."
                        value={analytics}
                        onToggle={() => setAnalytics((v) => !v)}
                      />
                      <PrefRow
                        icon={<Megaphone className="h-4 w-4 text-brand-rose" />}
                        title="Marketing"
                        desc="Personalizzazione e misurazione delle campagne."
                        value={marketing}
                        onToggle={() => setMarketing((v) => !v)}
                      />
                    </div>
                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          closeWith({
                            version: 1,
                            choice: analytics || marketing ? 'all' : 'essential',
                            analytics,
                            marketing,
                            ts: Date.now(),
                          })
                        }
                        className="sheen relative overflow-hidden rounded-full bg-gradient-to-r from-brand-amber to-brand-terra px-5 py-2 text-xs font-bold text-white shadow-glow-amber transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber/50 sm:text-sm"
                      >
                        Salva preferenze
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Footer link */}
              <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-ink/10 pt-3 text-[11px] text-ink/55">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-brand-emerald/70" />
                <span>Conformi al GDPR. Maggiori info nella</span>
                <a
                  href="/security"
                  className="link-underline font-medium text-brand-amber transition hover:text-brand-terra"
                >
                  nostra policy sulla privacy
                </a>
                <span>.</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function PrefRow({
  icon,
  title,
  desc,
  value,
  onToggle,
  disabled,
}: {
  icon: React.ReactNode
  title: string
  desc: string
  value: boolean
  onToggle?: () => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-ink/10 bg-white/40 p-3">
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white/70 shadow-sm">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-ink sm:text-sm">{title}</p>
        <p className="mt-0.5 text-[11px] leading-snug text-ink/60">{desc}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-label={title}
        disabled={disabled}
        onClick={onToggle}
        className={`relative h-5 w-9 shrink-0 rounded-full transition ${
          value ? 'bg-brand-emerald' : 'bg-ink/20'
        } ${disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
      >
        <span
          className={`absolute top-0.5 grid h-4 w-4 place-items-center rounded-full bg-white shadow transition-all ${
            value ? 'left-[1.125rem]' : 'left-0.5'
          }`}
        >
          {disabled && value ? (
            <Check className="h-2.5 w-2.5 text-brand-emerald" strokeWidth={3} />
          ) : null}
        </span>
      </button>
    </div>
  )
}

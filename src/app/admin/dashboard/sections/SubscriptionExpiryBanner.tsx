'use client'

// ─── BANNER SCADENZA ABBONAMENTO ───────────────────────────────────────────────
//
// Notifica in-page mostrata nella Home quando mancano meno di 10 giorni alla
// scadenza dell'abbonamento. Il tasto "Rinnova ora" NON reindirizza: invia una
// richiesta di rinnovo al site owner (subscription_requests, type='renew') e la
// card si trasforma in uno stato di conferma "Richiesta inviata all'admin".
// La X chiude il banner; non si chiude da solo (nessun timer).
// La chiusura è ricordata per il giorno corrente (per numero di giorni rimasti),
// così ricompare il giorno dopo con il conteggio aggiornato, sempre più urgente.
// ──────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import { AlertTriangle, ArrowRight, CheckCircle2, Loader2, X } from 'lucide-react'
import { useI18n } from '@/components/i18n/I18nProvider'
import { createSubscriptionRequest } from '@/lib/admin-service'

const MS_PER_DAY = 1000 * 60 * 60 * 24
const THRESHOLD_DAYS = 10

type SendState = 'idle' | 'sending' | 'sent' | 'error'

interface Props {
  accessExpiresAt: string | null
  restaurantId: string
}

export function SubscriptionExpiryBanner({ accessExpiresAt, restaurantId }: Props) {
  const { tr } = useI18n()
  const t = tr.admin.home.expiryBanner
  const [visible, setVisible] = useState(false)
  const [daysLeft, setDaysLeft] = useState(0)
  const [send, setSend] = useState<SendState>('idle')

  useEffect(() => {
    if (!accessExpiresAt) return
    const diff = new Date(accessExpiresAt).getTime() - Date.now()
    const days = Math.ceil(diff / MS_PER_DAY)
    // Fuori soglia o già scaduto (in tal caso è il gate a reindirizzare): niente banner.
    if (days < 0 || days >= THRESHOLD_DAYS) return
    setDaysLeft(days)
    const dismissed = safeGet(`tt-sub-expiry-dismissed-${restaurantId}`)
    if (dismissed !== null && Number(dismissed) === days) return
    setVisible(true)
  }, [accessExpiresAt, restaurantId])

  if (!visible) return null

  const dismiss = () => {
    setVisible(false)
    safeSet(`tt-sub-expiry-dismissed-${restaurantId}`, String(daysLeft))
  }

  const requestRenewal = async () => {
    if (send === 'sending' || send === 'sent') return
    setSend('sending')
    try {
      await createSubscriptionRequest({ restaurantId, type: 'renew', currentPlan: null })
      setSend('sent')
    } catch (err) {
      // Una richiesta già in attesa non è un errore: il rinnovo è comunque in coda.
      if (err instanceof Error && err.message === 'ALREADY_PENDING') {
        setSend('sent')
      } else {
        setSend('error')
      }
    }
  }

  // ── Stato di conferma: richiesta inviata ────────────────────────────────────
  if (send === 'sent') {
    return (
      <div className="relative flex items-start gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 p-4 text-white shadow-tt">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/20 text-white ring-1 ring-white/30">
          <CheckCircle2 className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1 pr-6">
          <p className="text-sm font-extrabold text-white">{t.sentTitle}</p>
          <p className="mt-0.5 text-xs font-medium text-white/90">{t.sent}</p>
        </div>
        <button
          onClick={dismiss}
          aria-label={t.close}
          className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full text-white/80 transition hover:bg-white/20 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    )
  }

  // ── Stato normale: avviso scadenza ──────────────────────────────────────────
  const message = daysLeft <= 0 ? t.today : daysLeft === 1 ? t.oneDay : t.days(daysLeft)

  return (
    <div className="relative flex items-start gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-brand-amber to-brand-terra p-4 text-white shadow-glow-amber">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/20 text-white ring-1 ring-white/30">
        <AlertTriangle className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1 pr-6">
        <p className="text-sm font-extrabold text-white">{t.title}</p>
        <p className="mt-0.5 text-xs font-medium text-white/90">{message}</p>
        <button
          onClick={requestRenewal}
          disabled={send === 'sending'}
          className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-xs font-bold text-brand-terra shadow-sm transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {send === 'sending' ? (
            <>
              {t.sending} <Loader2 className="h-3.5 w-3.5 animate-spin" />
            </>
          ) : (
            <>
              {t.renew} <ArrowRight className="h-3.5 w-3.5" />
            </>
          )}
        </button>
        {send === 'error' && (
          <p className="mt-1.5 text-[11px] font-semibold text-white">{t.error}</p>
        )}
      </div>
      <button
        onClick={dismiss}
        aria-label={t.close}
        className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full text-white/80 transition hover:bg-white/20 hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

function safeGet(key: string): string | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null
  } catch {
    return null
  }
}

function safeSet(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    /* localStorage non disponibile: ignora */
  }
}

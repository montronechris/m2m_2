'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CalendarCheck, Check, X, Loader2, KeyRound } from 'lucide-react'
import type { RestaurantCtx } from '../types'
import { redeemShiftCode, isPresentToday, type RedeemResult } from '@/lib/admin-service'
import { useI18n } from '@/components/i18n/I18nProvider'

// Ruoli "timbrabili": solo camerieri e cucina usano il codice presenza. Manager
// e admin generano i codici dalla sezione Calendario, quindi non vedono il tasto.
export function isClockInRole(role: string | null | undefined): boolean {
  const r = (role ?? '').toLowerCase()
  return r === 'cameriere' || r === 'cucina' || r === 'staff'
}

interface Props { ctx: RestaurantCtx }

// Esito → messaggio + tono (verde = ok, rosso = problema). Mappa 1:1 gli stati
// della RPC di riscatto.
function toFeedback(res: RedeemResult, T: any): { msg: string; ok: boolean } {
  switch (res) {
    case 'ok': return { msg: T.ok, ok: true }
    case 'already_present': return { msg: T.alreadyPresent, ok: true }
    case 'already_used': return { msg: T.alreadyUsed, ok: false }
    case 'expired': return { msg: T.expired, ok: false }
    case 'not_found':
    case 'wrong_user':
    case 'not_authenticated':
    default: return { msg: T.invalid, ok: false }
  }
}

export function AttendanceButton({ ctx }: Props) {
  const { tr } = useI18n()
  const T = tr.admin.attendance

  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [present, setPresent] = useState(false)          // già presente oggi?
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // All'avvio verifica se il membro ha già timbrato oggi (badge "Presente"
  // persistente). Un errore qui non è bloccante: nel dubbio mostriamo il tasto.
  useEffect(() => {
    let active = true
    isPresentToday(ctx.userId)
      .then((p) => { if (active) setPresent(p) })
      .catch(() => { /* ignora: stato di default = non presente */ })
    return () => { active = false }
  }, [ctx.userId])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 60)
    else { setCode(''); setFeedback(null); setSubmitting(false) }
  }, [open])

  async function submit() {
    const clean = code.trim().toUpperCase()
    if (clean.length < 4 || submitting) return
    setSubmitting(true)
    setFeedback(null)
    try {
      const res = await redeemShiftCode(clean)
      const fb = toFeedback(res, T)
      setFeedback(fb)
      if (fb.ok) {
        setPresent(true)
        setCode('')
        // Chiudi la modale poco dopo l'esito positivo.
        setTimeout(() => setOpen(false), 1400)
      }
    } catch {
      setFeedback({ msg: T.genericError, ok: false })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title={T.button}
        className={`flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-bold transition hover:scale-105 ${
          present
            ? 'bg-tt-success/15 text-tt-success'
            : 'bg-gradient-to-r from-brand-amber to-brand-terra text-white shadow-glow-amber'
        }`}
      >
        {present ? <Check className="h-4 w-4" /> : <CalendarCheck className="h-4 w-4" />}
        <span className="hidden sm:inline">{present ? T.present : T.button}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] grid place-items-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={() => !submitting && setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-serif text-lg font-extrabold text-tt-ink">{T.title}</h3>
                <button
                  onClick={() => setOpen(false)}
                  className="grid h-8 w-8 place-items-center rounded-full bg-tt-surfaceAlt2 text-tt-muted transition hover:text-tt-ink"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="mb-4 text-sm text-tt-muted">{T.hint}</p>

              <div className="relative mb-3">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tt-muted" />
                <input
                  ref={inputRef}
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
                  placeholder={T.placeholder}
                  maxLength={8}
                  className="w-full rounded-xl border-2 border-tt-line bg-white py-3 pl-9 pr-3 text-center font-mono text-lg font-black tracking-[0.3em] text-tt-ink outline-none transition focus:border-tt-pink"
                />
              </div>

              {/* Messaggio di stato (verde = presenza ok, rosso = problema) */}
              {feedback && (
                <div className={`mb-3 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold ${
                  feedback.ok ? 'bg-tt-success/10 text-tt-success' : 'bg-tt-danger/10 text-tt-danger'
                }`}>
                  {feedback.ok ? <Check className="h-4 w-4 shrink-0" /> : <X className="h-4 w-4 shrink-0" />}
                  <span>{feedback.msg}</span>
                </div>
              )}

              <button
                onClick={submit}
                disabled={submitting || code.trim().length < 4}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-amber to-brand-terra py-3 text-sm font-bold text-white shadow-glow-amber transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarCheck className="h-4 w-4" />}
                {submitting ? T.submitting : T.submit}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

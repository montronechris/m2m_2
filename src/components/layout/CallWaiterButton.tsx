'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useI18n } from '@/components/i18n/I18nProvider'

type CallStatus = 'idle' | 'pending' | 'acknowledged'

interface CallWaiterButtonProps {
  sessionId?: string | null
  tableNumber?: string | null
  hideFloatingButton?: boolean
  externalTrigger?: number
  inlineStyle?: boolean
  onStatusChange?: (status: 'idle' | 'pending' | 'acknowledged') => void
}

export function CallWaiterButton({ sessionId, tableNumber, hideFloatingButton, externalTrigger, inlineStyle, onStatusChange }: CallWaiterButtonProps) {
  const { tr } = useI18n()
  const c = tr.callWaiter
  const [showModal, setShowModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [status, setStatus] = useState<CallStatus>('idle')

  useEffect(() => { onStatusChange?.(status) }, [status])
  const [callId, setCallId] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const callIdRef = useRef<string | null>(null)

  // Aggiorna stato e ref insieme — il ref è subito disponibile nei callback realtime
  const applyCallId = (id: string | null) => {
    callIdRef.current = id
    setCallId(id)
  }

  // Subscription unica dal mount: risolve table_id, controlla chiamate esistenti, ascolta realtime.
  useEffect(() => {
    if (!sessionId) return

    let cancelled = false
    let channel: ReturnType<typeof supabase.channel> | null = null
    let pollInterval: ReturnType<typeof setInterval> | null = null

    const init = async () => {
      // 1. Risolvi table_id dalla sessione
      const { data: session } = await supabase
        .from('qr_sessions')
        .select('table_id')
        .eq('id', sessionId)
        .maybeSingle()

      if (cancelled) return
      const tableId = session?.table_id
      if (!tableId) return

      // 2. Controlla se esiste già una chiamata pending (sincronizza altri dispositivi)
      const syncFromServer = async () => {
        // Se già tracciamo una chiamata, verifica SOLO quella (per id) — evita
        // falsi negativi dovuti al filtro generico che chiuderebbero la chiamata
        // appena creata prima che si propaghi.
        if (callIdRef.current) {
          const { data: current } = await supabase
            .from('waiter_calls')
            .select('id, status')
            .eq('id', callIdRef.current)
            .maybeSingle()

          if (cancelled) return
          if (!current || current.status === 'closed') {
            applyCallId(null)
            setStatus('idle')
          } else if (current.status === 'acknowledged') {
            setStatus('acknowledged')
          }
          return
        }

        const { data: existing } = await supabase
          .from('waiter_calls')
          .select('id, status')
          .eq('table_id', tableId)
          .in('status', ['pending', 'acknowledged'])
          .eq('type', 'call')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (cancelled) return
        if (existing) {
          applyCallId(existing.id)
          setStatus(existing.status === 'acknowledged' ? 'acknowledged' : 'pending')
        }
      }

      await syncFromServer()

      // Polling di fallback: garantisce la sincronizzazione anche se il realtime
      // non consegna l'evento (es. connessione instabile su mobile)
      pollInterval = setInterval(syncFromServer, 4000)

      // 3. Subscription client-side — nessun filtro server per evitare problemi con REPLICA IDENTITY
      channel = supabase
        .channel(`waiter_calls_client_${sessionId}`)
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'waiter_calls' },
          (payload) => {
            const row = payload.new as { id: string; status: string; type?: string | null; table_id?: string; session_id?: string }
            // Appartiene a questo tavolo?
            const isOurs = row.session_id === sessionId || row.table_id === tableId
            if (!isOurs) return
            if (row.type !== 'call') return   // ignora chiamate di pagamento
            applyCallId(row.id)
            setStatus('pending')
          }
        )
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'waiter_calls' },
          (payload) => {
            const row = payload.new as { id: string; status: string; type?: string | null }
            if (row.type !== 'call') return
            if (row.id !== callIdRef.current) return
            if (row.status === 'acknowledged') setStatus('acknowledged')
            if (row.status === 'closed') { setStatus('idle'); applyCallId(null) }
          }
        )
        .on('postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'waiter_calls' },
          (payload) => {
            const deletedId = (payload.old as { id?: string })?.id
            if (deletedId && deletedId === callIdRef.current) {
              setStatus('idle')
              applyCallId(null)
            }
          }
        )
        .subscribe()
    }

    init()

    return () => {
      cancelled = true
      if (channel) supabase.removeChannel(channel)
      if (pollInterval) clearInterval(pollInterval)
    }
  }, [sessionId])

  useEffect(() => {
    if (!externalTrigger || externalTrigger <= 0) return
    if (isBusy) setShowCancelModal(true)
    else setShowModal(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalTrigger])

  // Nessun sessionId nell'URL → non mostrare il tasto (non sappiamo da quale tavolo arriva)
  if (!sessionId) return null

  async function confirmCall() {
    setSending(true)
    try {
      const res = await fetch('/api/waiter-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'fail')
      applyCallId(data.id)
      setStatus('pending')
    } catch (err) {
      console.error('Errore invio chiamata cameriere:', err)
    } finally {
      setSending(false)
      setShowModal(false)
    }
  }

  async function cancelCall() {
    if (!callId) return
    setCancelling(true)
    try {
      const { error } = await supabase.from('waiter_calls').update({ status: 'closed' }).eq('id', callId)
      if (error) throw error
      setStatus('idle')
      applyCallId(null)
    } catch (err) {
      console.error('Errore annullamento chiamata:', err)
    } finally {
      setCancelling(false)
      setShowCancelModal(false)
    }
  }

  const isBusy = status !== 'idle'

  return (
    <>
      {/* Tasto fisso, posizionato sopra il tasto chat assistente (bottom-5 right-5, h-14) */}
      {!hideFloatingButton && !inlineStyle && <>
        <style>{`
          @keyframes bellRing {
            0%,100% { transform: rotate(0deg); }
            10%      { transform: rotate(18deg); }
            20%      { transform: rotate(-16deg); }
            30%      { transform: rotate(14deg); }
            40%      { transform: rotate(-10deg); }
            50%      { transform: rotate(6deg); }
            60%      { transform: rotate(-4deg); }
            70%      { transform: rotate(2deg); }
            80%      { transform: rotate(0deg); }
          }
          .bell-ring { animation: bellRing 1s ease-in-out infinite; transform-origin: top center; }
        `}</style>
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4, type: 'spring', stiffness: 200, damping: 18 }}
          whileHover={{ scale: isBusy ? 1 : 1.06 }}
          whileTap={{ scale: isBusy ? 1 : 0.94 }}
          onClick={() => isBusy ? setShowCancelModal(true) : setShowModal(true)}
          disabled={false}
          aria-label={isBusy ? c.ariaBusy : c.ariaIdle}
          className="fixed bottom-24 right-5 z-[111] rounded-full shadow-lg transition-all disabled:cursor-not-allowed"
          style={{
            background: isBusy ? '#2e7d32' : '#3a2f26',
            color: '#fff',
            width: isBusy ? 'auto' : '3.5rem',
            height: '3.5rem',
            display: 'grid',
            placeItems: 'center',
            padding: isBusy ? '0 1.25rem' : '0',
          }}
        >
          {isBusy ? (
            <span className="flex items-center gap-2 text-xs font-semibold whitespace-nowrap">
              <Bell className="h-5 w-5 shrink-0 bell-ring" />
              {c.arriving}
            </span>
          ) : (
            <Bell className="h-5 w-5" />
          )}
        </motion.button>
      </>}

      {/* Modal di conferma */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 px-5"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.96 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"
            >
              <button
                onClick={() => setShowModal(false)}
                aria-label="Chiudi"
                className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg text-ink/40 hover:bg-ink/5"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-brand-amber/10">
                <Bell className="h-6 w-6 text-brand-amber" />
              </div>

              <h3 className="mb-1 text-lg font-bold text-ink">{c.confirmTitle}</h3>
              <p className="mb-5 text-sm text-ink/60">
                {c.confirmBody.replace('{table}', tableNumber ? c.confirmBodyTable.replace('{table}', tableNumber) : '')}
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-full border-2 border-gray-300 bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200 hover:border-gray-400"
                >
                  {c.cancel}
                </button>
                <button
                  onClick={confirmCall}
                  disabled={sending}
                  className="flex-1 rounded-full bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {sending ? c.sending : c.confirm}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal annullamento */}
      <AnimatePresence>
        {showCancelModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 px-5"
            onClick={() => setShowCancelModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.96 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"
            >
              <button
                onClick={() => setShowCancelModal(false)}
                aria-label="Chiudi"
                className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg text-ink/40 hover:bg-ink/5"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-red-50">
                <Bell className="h-6 w-6 text-red-500" />
              </div>

              <h3 className="mb-1 text-lg font-bold text-ink">{c.cancelTitle}</h3>
              <p className="mb-5 text-sm text-ink/60">
                {c.cancelBody}
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 rounded-full border-2 border-gray-300 bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200"
                >
                  {c.keep}
                </button>
                <button
                  onClick={cancelCall}
                  disabled={cancelling}
                  className="flex-1 rounded-full bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {cancelling ? c.cancelling : c.cancelConfirm}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
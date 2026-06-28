'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'

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
  const [showModal, setShowModal] = useState(false)
  const [status, setStatus] = useState<CallStatus>('idle')

  useEffect(() => { onStatusChange?.(status) }, [status])
  const [callId, setCallId] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  // Sottoscrizione realtime alla riga creata, per sapere quando il cameriere
  // la prende in carico ('acknowledged') o chiude il ticket ('closed').
  useEffect(() => {
    if (!callId) return

    const channel = supabase
      .channel(`waiter_call_${callId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'waiter_calls' },
        (payload) => {
          if ((payload.new as { id: string }).id !== callId) return
          const newStatus = (payload.new as { status: string }).status
          if (newStatus === 'acknowledged') setStatus('acknowledged')
          if (newStatus === 'closed') {
            setStatus('idle')
            setCallId(null)
          }
        }
      )
      .subscribe()

    channelRef.current = channel
    return () => {
      supabase.removeChannel(channel)
    }
  }, [callId])

  useEffect(() => {
    if (externalTrigger && externalTrigger > 0 && !isBusy) setShowModal(true)
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
      setCallId(data.id)
      setStatus('pending')
    } catch (err) {
      console.error('Errore invio chiamata cameriere:', err)
    } finally {
      setSending(false)
      setShowModal(false)
    }
  }

  const isBusy = status !== 'idle'

  return (
    <>
      {/* Tasto fisso, posizionato sopra il tasto chat assistente (bottom-5 right-5, h-14) */}
      {!hideFloatingButton && !inlineStyle && <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.4, type: 'spring', stiffness: 200, damping: 18 }}
        whileHover={{ scale: isBusy ? 1 : 1.06 }}
        whileTap={{ scale: isBusy ? 1 : 0.94 }}
        onClick={() => !isBusy && setShowModal(true)}
        disabled={isBusy}
        aria-label={
          status === 'pending'
            ? 'Richiesta inviata, in arrivo'
            : status === 'acknowledged'
            ? 'Il cameriere sta arrivando'
            : 'Chiama cameriere'
        }
        className="fixed bottom-24 right-5 z-[111] rounded-full shadow-lg transition-all disabled:cursor-not-allowed"
        style={{
          background: isBusy
            ? status === 'acknowledged'
              ? '#2e7d32'
              : '#b6794c'
            : '#3a2f26',
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
            <Bell className="h-5 w-5 shrink-0" />
            {status === 'pending' ? 'In arrivo...' : 'Cameriere in arrivo'}
          </span>
        ) : (
          <Bell className="h-5 w-5" />
        )}
      </motion.button>}

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

              <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-[#3a2f26]/10">
                <Bell className="h-6 w-6 text-[#3a2f26]" />
              </div>

              <h3 className="mb-1 text-lg font-bold text-ink">Chiamare il cameriere?</h3>
              <p className="mb-5 text-sm text-ink/60">
                Riceveremo subito la tua richiesta{tableNumber ? ` dal tavolo ${tableNumber}` : ''}.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-full border-2 border-gray-300 bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200 hover:border-gray-400"
                >
                  Annulla
                </button>
                <button
                  onClick={confirmCall}
                  disabled={sending}
                  className="flex-1 rounded-full bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {sending ? 'Invio...' : 'Conferma'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
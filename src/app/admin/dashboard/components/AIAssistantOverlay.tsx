'use client'

import { useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Sparkles, Send, X, Bot, User } from 'lucide-react'
import type { RestaurantCtx, ThemeMode } from '../types'

interface Props {
  ctx: RestaurantCtx
  theme: ThemeMode
}

type Msg = { role: 'user' | 'assistant'; content: string }

// Quick canned replies (no external API needed for the demo dashboard).
function reply(question: string, ctx: RestaurantCtx): string {
  const q = question.toLowerCase()
  if (q.includes('incass') || q.includes('fatturat') || q.includes('soldi'))
    return `Oggi ${ctx.restaurantName} ha incassato €1.284, +24% rispetto alla media settimanale. Sabato è il giorno più forte (€2.240).`
  if (q.includes('ordin'))
    return `Ci sono 7 ordini attivi: 2 in preparazione, 1 in cottura, 2 pronti da servire. Il piatto top di oggi è la Tagliata di Manzo.`
  if (q.includes('tavol') || q.includes('tavol'))
    return `12 tavoli su 18 occupati. Tavolo 7 da più tempo (dalle 15:42). Ti consiglio di liberare i tavoli pronti per nuovi arrivi.`
  if (q.includes('menu') || q.includes('piatt'))
    return `Il piatto più venduto è la Tagliata di Manzo (38 ordini). Il Branzino al Sale è attualmente esaurito — vuoi rimetterlo disponibile?`
  if (q.includes('staff') || q.includes('camerier') || q.includes('cuoc'))
    return `Hai 5 membri staff, 4 attivi. Per il servizio serale ti consiglio 2 camerieri + 1 cuoco. Anna e Luca sono di turno oggi.`
  if (q.includes('ciao') || q.includes('salve') || q.includes('buongiorno'))
    return `Ciao ${ctx.userFirstName}! 👋 Sono l'assistente AI di ${ctx.restaurantName}. Posso aiutarti con ordini, incassi, tavoli, menu o staff. Cosa ti serve?`
  if (q.includes('grazie'))
    return `Figurati! Sono qui se hai altre domande. 🙌`
  return `Capisco. Per "${question.slice(0, 60)}" — posso darti dati su incassi, ordini, tavoli, menu e staff. Prova a chiedermi "come vanno gli incassi oggi?" o "quanti tavoli sono occupati?".`
}

export function AIAssistantOverlay({ ctx }: Props) {
  const [open, setOpen] = useState(false)
  const [hint, setHint] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: 'assistant',
      content: `Ciao ${ctx.userFirstName}! 👋 Sono l'assistente AI di ${ctx.restaurantName}. Chiedimi di ordini, incassi, tavoli o menu.`,
    },
  ])
  const scrollRef = useRef<HTMLDivElement>(null)

  // Hint after 15s of inactivity
  useEffect(() => {
    if (open) return
    const t = setTimeout(() => setHint(true), 15000)
    return () => clearTimeout(t)
  }, [open])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  function send() {
    const text = input.trim()
    if (!text || loading) return
    setMessages((m) => [...m, { role: 'user', content: text }])
    setInput('')
    setLoading(true)
    setTimeout(() => {
      setMessages((m) => [...m, { role: 'assistant', content: reply(text, ctx) }])
      setLoading(false)
    }, 700)
  }

  return (
    <>
      {/* Hint bubble */}
      <AnimatePresence>
        {hint && !open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-16 right-2 z-50 hidden max-w-xs rounded-2xl bg-white p-3 shadow-xl ring-1 ring-tt-line sm:block lg:bottom-24 lg:right-5"
          >
            <button onClick={() => { setHint(false); setOpen(true) }} className="flex items-start gap-2 text-left">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-amber to-brand-terra text-white">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-bold text-tt-ink">Hai bisogno di aiuto? 💬</p>
                <p className="text-[11px] text-tt-muted">Chiedimi come vanno gli incassi o gli ordini.</p>
              </div>
            </button>
            <button onClick={() => setHint(false)} className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full text-tt-muted hover:bg-tt-surfaceAlt2">
              <X className="h-3 w-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.4, type: 'spring', stiffness: 200, damping: 18 }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => { setOpen((v) => !v); setHint(false) }}
        className="fixed bottom-16 right-2 z-50 grid h-13 w-13 place-items-center rounded-full bg-gradient-to-br from-brand-amber to-brand-terra text-white shadow-glow-amber lg:bottom-5 lg:right-5"
        style={{ height: 52, width: 52 }}
        aria-label="Assistente AI"
      >
        {!open && <span className="absolute inset-0 rounded-full bg-brand-amber/40 [animation:pulse-ring_2s_ease-out_infinite]" />}
        <AnimatePresence mode="wait">
          {open ? (
            <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X className="h-6 w-6" />
            </motion.span>
          ) : (
            <motion.span key="ai" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <Sparkles className="h-6 w-6" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.25 }}
            className="fixed bottom-20 right-2 z-50 flex h-[26rem] w-[calc(100vw-2.5rem)] max-w-sm flex-col overflow-hidden rounded-3xl border border-tt-line bg-white shadow-2xl lg:bottom-24 lg:right-5"
          >
            {/* Header */}
            <div className="flex items-center gap-3 bg-gradient-to-r from-brand-amber to-brand-terra p-4 text-white">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/20">
                <Bot className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <p className="text-sm font-bold">Assistente AI</p>
                <p className="text-[11px] text-white/70">{ctx.restaurantName}</p>
              </div>
              <button onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-lg text-white/70 transition hover:bg-white/15 hover:text-white" title="Chiudi">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="tt-scroll flex-1 space-y-3 overflow-y-auto bg-tt-surfaceAlt p-4">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex max-w-[85%] items-start gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${m.role === 'user' ? 'bg-gradient-to-br from-brand-amber to-brand-terra text-white' : 'bg-white text-tt-pink ring-1 ring-tt-line'}`}>
                      {m.role === 'user' ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                    </span>
                    <div className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${m.role === 'user' ? 'rounded-tr-md bg-gradient-to-br from-brand-amber to-brand-terra text-white' : 'rounded-tl-md border border-tt-line bg-white text-tt-ink'}`}>
                      {m.content}
                    </div>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="flex gap-1 rounded-2xl rounded-tl-md border border-tt-line bg-white px-4 py-3">
                    {[0, 1, 2].map((d) => (
                      <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-tt-pink/60" style={{ animationDelay: `${d * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="flex items-center gap-2 border-t border-tt-line bg-white p-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); send() } }}
                placeholder="Chiedi di ordini, incassi…"
                className="flex-1 rounded-full bg-tt-surfaceAlt px-4 py-2.5 text-sm text-tt-ink outline-none placeholder:text-tt-muted focus:ring-2 focus:ring-tt-pink/30"
              />
              <button
                onClick={send}
                disabled={loading || !input.trim()}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-amber to-brand-terra text-white shadow-glow-amber transition hover:scale-105 disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

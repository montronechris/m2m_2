'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { MessageCircle, X, Send, Sparkles, Trash2 } from 'lucide-react'
import { useI18n } from '@/components/i18n/I18nProvider'
import { cn } from '@/lib/utils'
import { getTableSession } from '@/lib/table-session'

type Msg = { role: 'user' | 'assistant'; content: string }

export function ChatWidget({ brandColor, externalOpen, hideFloatingButton }: { brandColor?: string; externalOpen?: boolean; hideFloatingButton?: boolean } = {}) {
  const { tr, lang } = useI18n()
  const c = tr.chatbot
  const pathname = usePathname()
  const hidden = pathname?.startsWith('/admin') || pathname === '/login'
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', content: c.greeting },
  ])
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // fallback arancione quando non viene passato brandColor
  const btnBg = 'linear-gradient(135deg, #6366f1, #8b5cf6)'
  const pulseBg = 'rgba(99,102,241,0.4)'

  // refresh greeting when language changes & no user messages yet
  useEffect(() => {
    setMessages((prev) => {
      const hasUser = prev.some((m) => m.role === 'user')
      if (hasUser) return prev
      return [{ role: 'assistant', content: c.greeting }]
    })
  }, [c.greeting])

  // autoscroll
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages, loading])

  // focus input on open
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 250)
  }, [open])

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    const userMsg: Msg = { role: 'user', content: text }
    const history = messages
    setMessages((m) => [...m, userMsg])
    setInput('')
    setLoading(true)
    setError(null)
    try {
      const restaurantId = getTableSession()?.restaurantId
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          lang,
          sessionId: sessionId ?? undefined,
          restaurantId: restaurantId ?? undefined,
          history: history
            .filter((m) => m.role !== 'assistant' || m.content !== c.greeting)
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'fail')
      if (data.sessionId) setSessionId(data.sessionId)
      setMessages((m) => [...m, { role: 'assistant', content: data.reply }])
    } catch {
      setError(c.error)
    } finally {
      setLoading(false)
    }
  }

  function clearChat() {
    setMessages([{ role: 'assistant', content: c.greeting }])
    setSessionId(null)
    setError(null)
    setInput('')
  }

  // sync external open trigger
  useEffect(() => {
    if (externalOpen) setOpen(true)
  }, [externalOpen])

  if (hidden) return null

  return (
    <>
      {/* Floating button */}
      {!hideFloatingButton && <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.6, type: 'spring', stiffness: 200, damping: 18 }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? c.close : c.open}
        className="fixed bottom-5 right-5 z-[110] grid h-14 w-14 place-items-center rounded-full text-white shadow-lg"
        style={{ background: btnBg }}
      >
        {/* pulse ring */}
        {!open && (
          <span
            className="absolute inset-0 rounded-full [animation:pulse-ring_2s_ease-out_infinite]"
            style={{ background: pulseBg }}
          />
        )}
        <AnimatePresence mode="wait">
          {open ? (
            <motion.span
              key="x"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
            >
              <X className="h-6 w-6" />
            </motion.span>
          ) : (
            <motion.span
              key="msg"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
            >
              <MessageCircle className="h-6 w-6" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>}

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className={cn(
              'fixed right-5 z-[110] flex h-[28rem] w-[calc(100vw-2.5rem)] max-w-sm flex-col overflow-hidden rounded-3xl border border-ink/10 bg-white shadow-2xl',
              pathname?.startsWith('/order') ? 'bottom-32' : 'bottom-24'
            )}
          >
            {/* Header */}
            <div
              className="flex items-center gap-3 p-4 text-white"
              style={{ background: btnBg }}
            >
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/20">
                <Sparkles className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <p className="text-sm font-bold">{c.title}</p>
                <p className="text-[11px] text-white/70">{c.subtitle}</p>
              </div>
              <button
                onClick={clearChat}
                aria-label={c.clear}
                className="grid h-8 w-8 place-items-center rounded-lg text-white/70 transition hover:bg-white/15 hover:text-white"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setOpen(false)}
                aria-label="Chiudi"
                className="grid h-8 w-8 place-items-center rounded-lg text-white/70 transition hover:bg-white/15 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4"
            >
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex',
                    m.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed',
                      m.role === 'user'
                        ? 'rounded-br-md text-white'
                        : 'rounded-bl-md border border-ink/5 bg-white text-ink/80'
                    )}
                    style={
                      m.role === 'user'
                        ? { background: btnBg }
                        : undefined
                    }
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="flex gap-1 rounded-2xl rounded-bl-md border border-ink/5 bg-white px-4 py-3">
                    {[0, 1, 2].map((d) => (
                      <span
                        key={d}
                        className="h-2 w-2 animate-bounce rounded-full bg-ink/30"
                        style={{ animationDelay: `${d * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              )}
              {error && (
                <p className="text-center text-xs text-red-500">{error}</p>
              )}
            </div>

            {/* Input */}
            <div className="flex items-center gap-2 border-t border-ink/5 bg-white p-3">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    send()
                  }
                }}
                placeholder={c.placeholder}
                className="flex-1 rounded-full bg-slate-100 px-4 py-2.5 text-sm text-ink outline-none placeholder:text-ink/40"
                style={{ fontSize: 16 }}
              />
              <button
                onClick={send}
                disabled={loading || !input.trim()}
                aria-label={c.send}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-white shadow-sm transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40"
                style={{ background: btnBg }}
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
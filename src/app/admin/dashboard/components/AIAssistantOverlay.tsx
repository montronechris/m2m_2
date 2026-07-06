'use client'

import { useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Sparkles, Send, X, Bot, User } from 'lucide-react'
import type { RestaurantCtx, ThemeMode } from '../types'
import { supabase } from '@/lib/supabase'

interface Props {
  ctx: RestaurantCtx
  theme: ThemeMode
}

type Msg = { role: 'user' | 'assistant'; content: string }

type LiveStats = {
  revenueTodayCents: number
  ordersActive: number
  ordersPreparing: number
  ordersCooking: number
  ordersReady: number
  tablesTotal: number
  tablesOccupied: number
  staffCount: number
  topDish: { name: string; count: number } | null
}

const euro = (cents: number) => `€${(cents / 100).toFixed(2).replace('.', ',')}`

// Risposte guidate da dati REALI presi da Supabase (vedi loadStats in basso), non più inventate.
// otherRestaurantNames: nomi di TUTTI gli altri ristoranti sulla piattaforma, usati per
// rilevare quando l'utente chiede dati su un ristorante che non è il proprio — l'assistente
// ha accesso solo ai dati di ctx.restaurantName e non deve mai rispondere per gli altri.
function reply(question: string, ctx: RestaurantCtx, otherRestaurantNames: string[], stats: LiveStats | null): string {
  const q = question.toLowerCase()

  const mentionedOther = otherRestaurantNames.find((name) => {
    const n = name.trim().toLowerCase()
    return n.length > 0 && q.includes(n)
  })
  if (mentionedOther) {
    return `Posso darti informazioni solo sul ristorante ${ctx.restaurantName}. Non ho accesso ai dati di "${mentionedOther}" o di altri ristoranti sulla piattaforma.`
  }

  if (q.includes('quali ristorant') || q.includes('altri ristorant'))
    return `Ho accesso solo ai dati di ${ctx.restaurantName}, il ristorante collegato al tuo account. Non posso vedere né condividere dati di altri ristoranti.`

  if (!stats)
    return `Sto ancora caricando i dati di ${ctx.restaurantName}, riprova tra un istante.`

  if (q.includes('incass') || q.includes('fatturat') || q.includes('soldi'))
    return `Oggi ${ctx.restaurantName} ha incassato ${euro(stats.revenueTodayCents)}.`
  if (q.includes('ordin'))
    return stats.ordersActive === 0
      ? `Al momento non ci sono ordini attivi.`
      : `Ci sono ${stats.ordersActive} ordini attivi: ${stats.ordersPreparing} in preparazione, ${stats.ordersCooking} in cottura, ${stats.ordersReady} pronti da servire.${stats.topDish ? ` Il piatto più venduto di recente è ${stats.topDish.name}.` : ''}`
  if (q.includes('tavol'))
    return `${stats.tablesOccupied} tavoli su ${stats.tablesTotal} risultano occupati (con almeno un ordine attivo).`
  if (q.includes('menu') || q.includes('piatt'))
    return stats.topDish
      ? `Il piatto più venduto di recente è ${stats.topDish.name} (${stats.topDish.count} ordini).`
      : `Non ho ancora abbastanza dati sugli ordini per calcolare il piatto più venduto.`
  if (q.includes('staff') || q.includes('camerier') || q.includes('cuoc'))
    return `Hai ${stats.staffCount} membri dello staff registrati. Non ho dati sui turni di oggi.`
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
  const [otherRestaurantNames, setOtherRestaurantNames] = useState<string[]>([])
  const [stats, setStats] = useState<LiveStats | null>(null)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('restaurants')
      .select('name')
      .neq('name', ctx.restaurantName)
      .then(({ data }) => {
        if (!cancelled && data) setOtherRestaurantNames(data.map((r) => r.name).filter(Boolean))
      })
    return () => { cancelled = true }
  }, [ctx.restaurantName])

  useEffect(() => {
    let cancelled = false
    async function loadStats() {
      const startToday = new Date()
      startToday.setHours(0, 0, 0, 0)

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

      const [todayOrders, activeOrders, tables, staffCountRes, recentOrderIds] = await Promise.all([
        supabase
          .from('orders')
          .select('total_cents')
          .eq('restaurant_id', ctx.restaurantId)
          .gte('created_at', startToday.toISOString())
          .not('status', 'eq', 'cancelled'),
        supabase
          .from('orders')
          .select('id, status, table_id')
          .eq('restaurant_id', ctx.restaurantId)
          .in('status', ['confirmed', 'cooking', 'ready', 'served'])
          .is('paid_at', null),
        supabase
          .from('tables')
          .select('id', { count: 'exact', head: true })
          .eq('restaurant_id', ctx.restaurantId)
          .eq('is_active', true),
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('restaurant_id', ctx.restaurantId)
          .in('role', ['staff', 'manager', 'cameriere', 'cucina']),
        supabase
          .from('orders')
          .select('id')
          .eq('restaurant_id', ctx.restaurantId)
          .gte('created_at', sevenDaysAgo)
          .not('status', 'eq', 'cancelled')
          .limit(200),
      ])

      if (cancelled) return

      const active = activeOrders.data ?? []
      const dishCounts = new Map<string, number>()
      const recentOrderIdList = (recentOrderIds.data ?? []).map((o) => o.id)
      if (recentOrderIdList.length > 0) {
        const { data: recentItems } = await supabase
          .from('order_items')
          .select('name_snapshot, name, quantity')
          .in('order_id', recentOrderIdList)
          .limit(1000)
        if (!cancelled) {
          for (const it of (recentItems as any[]) ?? []) {
            const name = it.name_snapshot || it.name
            if (!name) continue
            dishCounts.set(name, (dishCounts.get(name) ?? 0) + (it.quantity ?? 1))
          }
        }
      }
      let topDish: LiveStats['topDish'] = null
      for (const [name, count] of dishCounts) {
        if (!topDish || count > topDish.count) topDish = { name, count }
      }

      setStats({
        revenueTodayCents: (todayOrders.data ?? []).reduce((s: number, o: any) => s + (o.total_cents ?? 0), 0),
        ordersActive: active.length,
        ordersPreparing: active.filter((o) => o.status === 'confirmed').length,
        ordersCooking: active.filter((o) => o.status === 'cooking').length,
        ordersReady: active.filter((o) => o.status === 'ready').length,
        tablesTotal: tables.count ?? 0,
        tablesOccupied: new Set(active.map((o) => o.table_id).filter(Boolean)).size,
        staffCount: staffCountRes.count ?? 0,
        topDish,
      })
    }
    loadStats()
    return () => { cancelled = true }
  }, [ctx.restaurantId])

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
      setMessages((m) => [...m, { role: 'assistant', content: reply(text, ctx, otherRestaurantNames, stats) }])
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
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-violet to-brand-rose text-white">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-bold text-tt-ink">Serve una mano?</p>
                <p className="text-[11px] text-tt-muted">Chiedimi come vanno incassi, ordini o tavoli.</p>
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
        className="fixed bottom-16 right-2 z-50 grid h-13 w-13 place-items-center rounded-full bg-gradient-to-br from-brand-violet to-brand-rose text-white shadow-glow-violet lg:bottom-5 lg:right-5"
        style={{ height: 52, width: 52 }}
        aria-label="Assistente AI"
      >
        {!open && <span className="absolute inset-0 rounded-full bg-brand-violet/40 [animation:pulse-ring_2s_ease-out_infinite]" />}
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
            className="fixed bottom-[7.75rem] left-1/2 z-50 flex h-[26rem] w-[calc(100vw-2.5rem)] max-w-sm -translate-x-1/2 flex-col overflow-hidden rounded-3xl border border-tt-line bg-white shadow-2xl lg:bottom-24 lg:left-auto lg:right-5 lg:translate-x-0"
          >
            {/* Header */}
            <div className="flex items-center gap-3 bg-gradient-to-r from-brand-violet to-brand-rose p-4 text-white">
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
                    <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${m.role === 'user' ? 'bg-gradient-to-br from-brand-violet to-brand-rose text-white' : 'bg-white text-tt-pink ring-1 ring-tt-line'}`}>
                      {m.role === 'user' ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                    </span>
                    <div className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${m.role === 'user' ? 'rounded-tr-md bg-gradient-to-br from-brand-violet to-brand-rose text-white' : 'rounded-tl-md border border-tt-line bg-white text-tt-ink'}`}>
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
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-violet to-brand-rose text-white shadow-glow-violet transition hover:scale-105 disabled:opacity-40"
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

'use client'

import { useEffect, useRef, useState } from 'react'
import { CreditCard, Bell, CheckCircle2, AlertCircle, Clock } from 'lucide-react'
import type { RestaurantCtx, ThemeMode } from '../types'
import { supabase } from '@/lib/supabase'
import { playNotificationSound } from '@/lib/notificationSound'

interface Props {
  ctx: RestaurantCtx
  theme: ThemeMode
}

type PaymentRequest = {
  id: string
  table_id: string | null
  order_id: string | null
  status: string
  created_at: string
  table_label?: string | null
  order_total?: number | null
}

export function PaymentSection({ ctx }: Props) {
  const [requests, setRequests] = useState<PaymentRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const seenIdsRef = useRef<Set<string> | null>(null)

  const load = async () => {
    try {
      const { data, error: err } = await supabase
        .from('waiter_calls')
        .select('id, table_id, order_id, status, created_at')
        .eq('restaurant_id', ctx.restaurantId)
        .eq('type', 'payment')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })

      if (err) throw err

      const items: PaymentRequest[] = data ?? []

      // Arricchisci con label tavolo e totale ordine
      const enriched = await Promise.all(
        items.map(async (r) => {
          let table_label: string | null = null
          let order_total: number | null = null
          if (r.table_id) {
            const { data: t } = await supabase.from('tables').select('label').eq('id', r.table_id).maybeSingle()
            table_label = t?.label ?? null
          }
          if (r.order_id) {
            const { data: o } = await supabase.from('orders').select('total_cents').eq('id', r.order_id).maybeSingle()
            order_total = o?.total_cents ?? null
          }
          return { ...r, table_label, order_total }
        })
      )

      const newIds = new Set(enriched.map((r) => r.id))
      if (seenIdsRef.current) {
        const hasNew = [...newIds].some((id) => !seenIdsRef.current!.has(id))
        if (hasNew) playNotificationSound()
      }
      seenIdsRef.current = newIds
      setRequests(enriched)
    } catch (e: any) {
      setError(e.message ?? 'Errore')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()

    const channel = supabase
      .channel(`payment-section-${ctx.restaurantId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'waiter_calls', filter: `restaurant_id=eq.${ctx.restaurantId}` },
        () => load()
      )
      .subscribe()

    const poll = setInterval(load, 5000)
    return () => {
      clearInterval(poll)
      supabase.removeChannel(channel)
    }
  }, [ctx.restaurantId])

  async function markDone(id: string) {
    if (busyId) return
    setBusyId(id)
    setRequests((prev) => prev.filter((r) => r.id !== id))
    try {
      await supabase.from('waiter_calls').update({ status: 'done' }).eq('id', id)
    } catch {
      load()
    } finally {
      setBusyId(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-7 w-48 tt-skeleton rounded-full" />
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="tt-card h-24 rounded-2xl border border-tt-line shadow-tt" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="grid place-items-center py-16 text-center">
        <AlertCircle className="mb-3 h-10 w-10 text-tt-danger" />
        <p className="text-sm font-bold text-tt-ink">Errore</p>
        <p className="mt-1 max-w-xs text-xs text-tt-muted">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-serif text-xl font-extrabold text-tt-ink">Richieste Pagamento</h2>
        <p className="text-xs text-tt-muted">
          {requests.length} {requests.length === 1 ? 'richiesta in attesa' : 'richieste in attesa'}
        </p>
      </div>

      {requests.length === 0 ? (
        <div className="tt-card rounded-2xl border border-tt-line p-12 text-center shadow-tt">
          <CreditCard className="mx-auto mb-3 h-9 w-9 text-tt-muted opacity-40" />
          <p className="text-sm text-tt-muted">Nessuna richiesta di pagamento in attesa.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {requests.map((r) => {
            const time = new Date(r.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
            const total = r.order_total != null ? (r.order_total / 100).toFixed(2) : null
            return (
              <div key={r.id} className="tt-card overflow-hidden rounded-2xl border-2 border-tt-warning/40 bg-tt-warning/5 shadow-tt">
                <div className="flex items-center gap-3 border-b border-tt-line/60 bg-tt-surfaceAlt/60 px-4 py-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-tt-warning/15 text-tt-warning">
                    <CreditCard className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-tt-ink">
                      {r.table_label ? `Tavolo ${r.table_label}` : 'Tavolo —'}
                    </p>
                    {total && (
                      <p className="text-xs text-tt-muted">Totale: €{total}</p>
                    )}
                  </div>
                  <span className="ml-auto flex items-center gap-1 text-xs text-tt-muted">
                    <Clock className="h-3 w-3" /> {time}
                  </span>
                </div>
                <div className="px-4 py-3">
                  <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-tt-warning">
                    <Bell className="h-3 w-3 animate-pulse" />
                    Il cliente è pronto per pagare
                  </p>
                  <button
                    onClick={() => markDone(r.id)}
                    disabled={busyId === r.id}
                    className="flex w-full items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-brand-emerald to-brand-sky py-1.5 text-xs font-bold text-white shadow-glow-emerald transition hover:scale-105 disabled:opacity-60"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Pagamento gestito
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

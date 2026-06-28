'use client'

import { useEffect, useState } from 'react'
import {
  TrendingUp,
  ShoppingCart,
  Users,
  Star,
  ArrowRight,
  Clock,
  CheckCircle2,
  Utensils,
  QrCode,
  Sparkles,
  AlertCircle,
} from 'lucide-react'
import type { RestaurantCtx, SectionId, ThemeMode } from '../types'
import { supabase } from '@/lib/supabase'
import { getOrders, type Order } from '@/lib/admin-service'

interface Props {
  ctx: RestaurantCtx
  theme: ThemeMode
  onSectionChange: (s: SectionId) => void
}

const statusMeta: Record<string, { label: string; cls: string }> = {
  pending: { label: 'In attesa', cls: 'bg-tt-muted/15 text-tt-muted' },
  confirmed: { label: 'Confermato', cls: 'bg-tt-warning/15 text-tt-warning' },
  preparing: { label: 'In preparazione', cls: 'bg-tt-warning/15 text-tt-warning' },
  ready: { label: 'Pronto', cls: 'bg-tt-success/15 text-tt-success' },
  served: { label: 'Servito', cls: 'bg-tt-muted/15 text-tt-muted' },
  delivered: { label: 'Servito', cls: 'bg-tt-muted/15 text-tt-muted' },
  cancelled: { label: 'Annullato', cls: 'bg-tt-danger/15 text-tt-danger' },
}

export function DashboardSection({ ctx, onSectionChange }: Props) {
  const [orders, setOrders] = useState<Order[]>([])
  const [ordersToday, setOrdersToday] = useState(0)
  const [revenueToday, setRevenueToday] = useState(0)
  const [tablesActive, setTablesActive] = useState(0)
  const [avgRating, setAvgRating] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load KPIs + recent orders from DATABASE
  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const startToday = new Date()
        startToday.setHours(0, 0, 0, 0)

        const [recentOrders, { count: todayCount }, todayOrders, { count: occTables }, reviews] = await Promise.all([
          getOrders(ctx.restaurantId),
          supabase
            .from('orders')
            .select('id', { count: 'exact', head: true })
            .eq('restaurant_id', ctx.restaurantId)
            .gte('created_at', startToday.toISOString())
            .not('status', 'eq', 'cancelled'),
          supabase
            .from('orders')
            .select('total_cents')
            .eq('restaurant_id', ctx.restaurantId)
            .gte('created_at', startToday.toISOString())
            .not('status', 'eq', 'cancelled'),
          supabase
            .from('tables')
            .select('id', { count: 'exact', head: true })
            .eq('restaurant_id', ctx.restaurantId)
            .eq('is_active', true),
          supabase
            .from('reviews')
            .select('stars')
            .eq('restaurant_id', ctx.restaurantId),
        ])

        if (!active) return

        setOrders(
          recentOrders
            .filter((o) => o.status !== 'pending' && o.status !== 'cancelled')
            .slice(-5)
            .reverse()
        )
        setOrdersToday(todayCount ?? 0)
        setRevenueToday((todayOrders.data ?? []).reduce((s: number, o: any) => s + (o.total_cents ?? 0), 0))
        setTablesActive(occTables ?? 0)
        if (reviews.data && reviews.data.length > 0) {
          const avg = reviews.data.reduce((s: number, r: any) => s + (r.stars ?? 0), 0) / reviews.data.length
          setAvgRating(Math.round(avg * 10) / 10)
        }
      } catch (e: any) {
        if (active) setError(e.message ?? 'Errore nel caricamento')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [ctx.restaurantId])

  const kpis = [
    { icon: ShoppingCart, label: 'Ordini oggi', value: String(ordersToday), trend: '', color: 'bg-tt-pink/15 text-tt-pink' },
    { icon: TrendingUp, label: 'Incasso oggi', value: `€${(revenueToday / 100).toLocaleString('it-IT', { maximumFractionDigits: 0 })}`, trend: '', color: 'bg-tt-success/15 text-tt-success' },
    { icon: Users, label: 'Tavoli occupati', value: String(tablesActive), trend: '', color: 'bg-tt-pinkSoft/15 text-tt-pinkSoft' },
    { icon: Star, label: 'Rating', value: avgRating !== null ? avgRating.toFixed(1) : '—', trend: '', color: 'bg-tt-warning/15 text-tt-warning' },
  ]

  const quickActions = [
    { id: 'orders' as SectionId, label: 'Gestisci ordini', desc: 'Vedi tutti', icon: ShoppingCart, color: 'from-brand-amber to-brand-terra' },
    { id: 'menu' as SectionId, label: 'Modifica menu', desc: 'I tuoi piatti', icon: Utensils, color: 'from-brand-emerald to-brand-sky' },
    { id: 'tables' as SectionId, label: 'Tavoli & QR', desc: 'Gestione tavoli', icon: QrCode, color: 'from-brand-rose to-brand-violet' },
    { id: 'analytics' as SectionId, label: 'Analytics', desc: 'Statistiche', icon: TrendingUp, color: 'from-brand-violet to-brand-sky' },
  ]

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="tt-card-pink flex items-center gap-4 rounded-3xl p-5 shadow-tt">
          <div className="h-14 w-14 tt-skeleton rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-40 tt-skeleton rounded-full" />
            <div className="h-3 w-56 tt-skeleton rounded-full" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="tt-card rounded-3xl border border-tt-line p-4 shadow-tt">
              <div className="mb-3 flex justify-between">
                <div className="h-9 w-9 tt-skeleton rounded-xl" />
              </div>
              <div className="h-6 w-16 tt-skeleton rounded-full" />
            </div>
          ))}
        </div>
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
      {/* Welcome card */}
      <div className="tt-card-pink flex items-center gap-4 rounded-3xl p-5 shadow-tt">
        <span className="tt-avatar h-14 w-14 text-lg shadow-tt">
          {ctx.userFirstName[0]}
          {ctx.userLastName[0]}
        </span>
        <div className="flex-1">
          <p className="text-sm text-tt-muted">Bentornata,</p>
          <h2 className="font-serif text-xl font-extrabold text-tt-ink">
            {ctx.userFirstName} {ctx.userLastName}
          </h2>
          <p className="text-xs text-tt-muted">{ctx.restaurantName}</p>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => {
          const Icon = k.icon
          return (
            <div key={k.label} className="tt-card rounded-3xl border border-tt-line p-4 shadow-tt transition hover:-translate-y-0.5 hover:shadow-ttHover">
              <div className="mb-3 flex items-start justify-between">
                <div className={`grid h-9 w-9 place-items-center rounded-xl ${k.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <p className="mb-0.5 text-xl font-extrabold text-tt-ink lg:text-2xl">{k.value}</p>
              <p className="text-xs font-bold uppercase tracking-wide text-tt-muted">{k.label}</p>
            </div>
          )
        })}
      </div>

      {/* Quick actions */}
      <div>
        <p className="tt-section-title">Azioni rapide</p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {quickActions.map((a) => {
            const Icon = a.icon
            return (
              <button
                key={a.id}
                onClick={() => onSectionChange(a.id)}
                className={`group flex flex-col items-start gap-2 rounded-2xl bg-gradient-to-br ${a.color} p-4 text-left text-white shadow-tt transition hover:-translate-y-0.5 hover:shadow-ttHover`}
              >
                <Icon className="h-6 w-6" />
                <span className="text-sm font-bold">{a.label}</span>
                <span className="text-[11px] text-white/80">{a.desc}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Recent orders */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="tt-section-title mb-0">Ordini recenti</p>
          <button onClick={() => onSectionChange('orders')} className="flex items-center gap-1 text-xs font-bold text-tt-pink hover:underline">
            Vedi tutti <ArrowRight className="h-3 w-3" />
          </button>
        </div>
        {orders.length === 0 ? (
          <div className="tt-card rounded-2xl border border-tt-line p-8 text-center shadow-tt">
            <ShoppingCart className="mx-auto mb-2 h-8 w-8 text-tt-muted opacity-50" />
            <p className="text-sm text-tt-muted">Nessun ordine nel database.</p>
          </div>
        ) : (
          <div className="tt-card overflow-hidden rounded-2xl border border-tt-line shadow-tt">
            {orders.map((o, i) => {
              const st = statusMeta[o.status] ?? statusMeta['pending']
              const total = (o.total_cents / 100).toFixed(2)
              const time = new Date(o.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
              const items = o.order_items?.length ?? 0
              return (
                <div
                  key={o.id}
                  className={`flex items-center gap-3 p-3.5 transition-colors hover:bg-tt-surfaceAlt2 ${i > 0 ? 'border-t border-tt-line' : ''}`}
                >
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-tt-surfaceAlt2 text-tt-ink">
                    <ShoppingCart className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-tt-ink">{o.table_code ?? `#${o.id.slice(-6)}`}</p>
                    </div>
                    <p className="text-xs text-tt-muted">{items} articoli</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-tt-ink">€{total}</p>
                    <span className={`tt-pill ${st.cls}`}>{st.label}</span>
                  </div>
                  <div className="hidden items-center gap-1 text-[11px] text-tt-muted sm:flex">
                    <Clock className="h-3.5 w-3.5" />
                    {time}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* AI insight banner */}
      <div className="flex items-center gap-3 rounded-2xl border border-tt-pink/20 bg-gradient-to-r from-tt-pink/10 to-tt-pinkSoft/10 p-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-amber to-brand-terra text-white shadow-glow-amber">
          <Sparkles className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <p className="text-sm font-bold text-tt-ink">Insight AI</p>
          <p className="text-xs text-tt-muted">
            {ordersToday > 0
              ? `Hai ${ordersToday} ordini oggi per un totale di €${(revenueToday / 100).toFixed(0)}. Continua così!`
              : 'Nessun ordine ancora oggi. Il menu e i tavoli sono pronti per accogliere i clienti.'}
          </p>
        </div>
        <button
          onClick={() => onSectionChange('analytics')}
          className="shrink-0 rounded-full bg-gradient-to-r from-brand-amber to-brand-terra px-3 py-1.5 text-xs font-bold text-white shadow-glow-amber"
        >
          Vedi
        </button>
      </div>
    </div>
  )
}

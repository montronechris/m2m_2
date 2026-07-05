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
import { guessGender } from '@/lib/guessGender'
import { useI18n } from '@/components/i18n/I18nProvider'

interface Props {
  ctx: RestaurantCtx
  theme: ThemeMode
  onSectionChange: (s: SectionId) => void
}

const statusCls: Record<string, string> = {
  pending: 'bg-tt-muted/15 text-tt-muted',
  confirmed: 'bg-tt-warning/15 text-tt-warning',
  preparing: 'bg-tt-warning/15 text-tt-warning',
  ready: 'bg-tt-success/15 text-tt-success',
  served: 'bg-tt-success/15 text-tt-success',
  delivered: 'bg-tt-muted/15 text-tt-muted',
  cancelled: 'bg-tt-danger/15 text-tt-danger',
}

export function DashboardSection({ ctx, onSectionChange }: Props) {
  const { tr } = useI18n()
  const t = tr.admin.home
  const roleLabel = (role: string) => (t.roles as Record<string, string>)[role] ?? role
  const welcomeLabel = () => {
    const g = guessGender(ctx.userFirstName)
    return g === 'F' ? t.welcomeF : g === 'M' ? t.welcomeM : t.welcomeNeutral
  }
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

        const [recentOrders, { count: todayCount }, todayOrders, { data: activeSess }, reviews] = await Promise.all([
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
            .from('qr_sessions')
            .select('table_id')
            .eq('restaurant_id', ctx.restaurantId)
            .eq('is_active', true)
            .gte('last_activity', new Date(Date.now() - 30 * 60 * 1000).toISOString()),
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
        setTablesActive(new Set((activeSess ?? []).map((s: { table_id: string | null }) => s.table_id).filter(Boolean)).size)
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
    { icon: ShoppingCart, label: t.kpi.ordersToday, value: String(ordersToday), trend: '', color: 'bg-tt-pink/15 text-tt-pink' },
    { icon: TrendingUp, label: t.kpi.revenueToday, value: `€${(revenueToday / 100).toLocaleString('it-IT', { maximumFractionDigits: 0 })}`, trend: '', color: 'bg-tt-success/15 text-tt-success' },
    { icon: Users, label: t.kpi.tablesOccupied, value: String(tablesActive), trend: '', color: 'bg-tt-pinkSoft/15 text-tt-pinkSoft' },
    { icon: Star, label: t.kpi.rating, value: avgRating !== null ? avgRating.toFixed(1) : '—', trend: '', color: 'bg-tt-warning/15 text-tt-warning' },
  ]

  const quickActions = [
    { id: 'orders' as SectionId, label: t.quickActions.manageOrders, desc: t.quickActions.manageOrdersDesc, icon: ShoppingCart, color: 'from-brand-amber to-brand-terra' },
    { id: 'menu' as SectionId, label: t.quickActions.editMenu, desc: t.quickActions.editMenuDesc, icon: Utensils, color: 'from-brand-emerald to-brand-sky' },
    { id: 'tables' as SectionId, label: t.quickActions.tablesQr, desc: t.quickActions.tablesQrDesc, icon: QrCode, color: 'from-brand-rose to-brand-violet' },
    { id: 'analytics' as SectionId, label: t.quickActions.analytics, desc: t.quickActions.analyticsDesc, icon: TrendingUp, color: 'from-brand-violet to-brand-sky' },
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
        <div>
          <div className="tt-section-title mb-2 h-3 w-24 tt-skeleton rounded-full" />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col items-start gap-2 rounded-2xl border border-tt-line p-4 shadow-tt">
                <div className="h-6 w-6 tt-skeleton rounded-lg" />
                <div className="h-4 w-16 tt-skeleton rounded-full" />
                <div className="h-3 w-20 tt-skeleton rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="grid place-items-center py-16 text-center">
        <AlertCircle className="mb-3 h-10 w-10 text-tt-danger" />
        <p className="text-sm font-bold text-tt-ink">{t.error}</p>
        <p className="mt-1 max-w-xs text-xs text-tt-muted">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Welcome card */}
      <div className="tt-card-pink flex items-center gap-4 rounded-3xl p-5 shadow-tt">
        {ctx.userAvatarUrl ? (
          <img
            src={ctx.userAvatarUrl}
            alt={`${ctx.userFirstName} ${ctx.userLastName}`}
            className="h-14 w-14 shrink-0 rounded-full border-2 border-tt-pink object-cover shadow-tt"
          />
        ) : (
          <span className="tt-avatar h-14 w-14 text-lg shadow-tt">
            {ctx.userFirstName[0]}
            {ctx.userLastName[0]}
          </span>
        )}
        <div className="flex-1">
          <p className="text-sm text-tt-muted">{welcomeLabel()},</p>
          <h2 className="font-serif text-xl font-extrabold text-tt-ink">
            {ctx.userFirstName} {ctx.userLastName}
          </h2>
          <p className="text-xs text-tt-muted">{roleLabel(ctx.role)} {t.roleOf} {ctx.restaurantName}</p>
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
        <p className="tt-section-title">{t.quickActions.title}</p>
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
          <p className="tt-section-title mb-0">{t.recentOrders.title}</p>
          <button onClick={() => onSectionChange('orders')} className="flex items-center gap-1 text-xs font-bold text-tt-pink hover:underline">
            {t.recentOrders.seeAll} <ArrowRight className="h-3 w-3" />
          </button>
        </div>
        {orders.length === 0 ? (
          <div className="tt-card rounded-2xl border border-tt-line p-8 text-center shadow-tt">
            <ShoppingCart className="mx-auto mb-2 h-8 w-8 text-tt-muted opacity-50" />
            <p className="text-sm text-tt-muted">{t.recentOrders.empty}</p>
          </div>
        ) : (
          <div className="tt-card overflow-hidden rounded-2xl border border-tt-line shadow-tt">
            {orders.map((o, i) => {
              const stLabel = (t.status as Record<string, string>)[o.status] ?? t.status.pending
              const stCls = statusCls[o.status] ?? statusCls['pending']
              const total = (o.total_cents / 100).toFixed(2)
              const time = new Date(o.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
              const items = o.order_items?.length ?? 0
              return (
                <div
                  key={o.id}
                  className={`flex items-center gap-3 p-3.5 transition-colors hover:bg-tt-surfaceAlt2 ${i > 0 ? 'border-t border-tt-line' : ''}`}
                >
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-tt-pink/15 text-tt-pink">
                    <ShoppingCart className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-tt-ink">{o.table_code ?? `#${o.id.slice(-6)}`}</p>
                    </div>
                    <p className="text-xs text-tt-muted">{items} {t.recentOrders.items}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-tt-ink">€{total}</p>
                    <span className={`tt-pill ${stCls}`}>{stLabel}</span>
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
          <p className="text-sm font-bold text-tt-ink">{t.insight.title}</p>
          <p className="text-xs text-tt-muted">
            {ordersToday > 0
              ? t.insight.withOrders(ordersToday, (revenueToday / 100).toFixed(0))
              : t.insight.noOrders}
          </p>
        </div>
        <button
          onClick={() => onSectionChange('analytics')}
          className="shrink-0 rounded-full bg-gradient-to-r from-brand-amber to-brand-terra px-3 py-1.5 text-xs font-bold text-white shadow-glow-amber"
        >
          {t.insight.cta}
        </button>
      </div>
    </div>
  )
}

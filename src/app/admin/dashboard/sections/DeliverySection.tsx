'use client'

// ─── SEZIONE: DELIVERY (ordini piattaforme esterne) ─────────────────────────
//
// Gestisce gli ordini in arrivo da Glovo, Deliveroo, Uber Eats, Just Eat...
// Gli ordini arrivano al webhook `/api/integrations/[platform]/webhook`,
// vengono normalizzati e salvati in `external_orders`. Qui li mostriamo in
// tempo reale (realtime + polling di sicurezza), con suono di notifica,
// filtri per piattaforma/stato e un flusso di avanzamento stato.
// Il pulsante "Simula ordine" invia un ordine finto al webhook reale così
// da esercitare l'intera pipeline senza un account partner.
// ────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Send,
  RefreshCw,
  Volume2,
  VolumeX,
  Play,
  Check,
  X,
  Clock,
  MapPin,
  Phone,
  User,
  Settings2,
  Loader2,
  ChevronDown,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import {
  listExternalOrders,
  updateExternalOrderStatus,
  getPlatformIntegrations,
  type ExternalOrder,
  type ExternalOrderStatus,
  type DeliveryPlatformId,
  type PlatformIntegration,
} from '@/lib/admin-service'
import {
  playNotificationSound,
  isAdminNotifMuted,
  setAdminNotifMuted,
} from '@/lib/notificationSound'
import { buildSamplePayload, DELIVERY_PLATFORMS } from '@/lib/delivery/normalize'
import { useI18n } from '@/components/i18n/I18nProvider'
import type { RestaurantCtx, ThemeMode } from '../types'

interface Props {
  ctx: RestaurantCtx
  theme: ThemeMode
}

const COPY = {
  it: {
    title: 'Delivery',
    subtitle: 'Ordini dalle piattaforme esterne',
    refresh: 'Aggiorna',
    simulate: 'Simula ordine',
    simulating: 'Invio…',
    allPlatforms: 'Tutte le piattaforme',
    allStatuses: 'Tutti gli stati',
    empty: 'Nessun ordine',
    emptyHint: 'Gli ordini dalle piattaforme delivery appariranno qui.',
    noIntegration:
      'Nessuna integrazione attiva. Configura le piattaforme nelle Impostazioni per ricevere ordini.',
    goSettings: 'Vai alle Impostazioni',
    simNeedsIntegration:
      'Abilita almeno una piattaforma nelle Impostazioni per usare il simulatore.',
    simSent: 'Ordine di test inviato',
    simError: 'Invio del test non riuscito',
    updateError: 'Aggiornamento stato non riuscito',
    items: 'articoli',
    total: 'Totale',
    delivery: 'Consegna',
    pickup: 'Ritiro',
    notes: 'Note',
    accept: 'Accetta',
    reject: 'Rifiuta',
    prepare: 'In preparazione',
    ready: 'Pronto',
    complete: 'Completa',
    cancel: 'Annulla',
    st_new: 'Nuovo',
    st_accepted: 'Accettato',
    st_preparing: 'In preparazione',
    st_ready: 'Pronto',
    st_completed: 'Completato',
    st_rejected: 'Rifiutato',
    st_cancelled: 'Annullato',
    justNow: 'adesso',
    minAgo: 'min fa',
    hAgo: 'h fa',
  },
  en: {
    title: 'Delivery',
    subtitle: 'Orders from external platforms',
    refresh: 'Refresh',
    simulate: 'Simulate order',
    simulating: 'Sending…',
    allPlatforms: 'All platforms',
    allStatuses: 'All statuses',
    empty: 'No orders',
    emptyHint: 'Orders from delivery platforms will show up here.',
    noIntegration:
      'No active integration. Configure platforms in Settings to receive orders.',
    goSettings: 'Go to Settings',
    simNeedsIntegration:
      'Enable at least one platform in Settings to use the simulator.',
    simSent: 'Test order sent',
    simError: 'Failed to send test',
    updateError: 'Failed to update status',
    items: 'items',
    total: 'Total',
    delivery: 'Delivery',
    pickup: 'Pickup',
    notes: 'Notes',
    accept: 'Accept',
    reject: 'Reject',
    prepare: 'Preparing',
    ready: 'Ready',
    complete: 'Complete',
    cancel: 'Cancel',
    st_new: 'New',
    st_accepted: 'Accepted',
    st_preparing: 'Preparing',
    st_ready: 'Ready',
    st_completed: 'Completed',
    st_rejected: 'Rejected',
    st_cancelled: 'Cancelled',
    justNow: 'just now',
    minAgo: 'min ago',
    hAgo: 'h ago',
  },
}

const PLATFORM_META: Record<DeliveryPlatformId, { label: string; color: string }> = {
  glovo: { label: 'Glovo', color: '#FFC244' },
  deliveroo: { label: 'Deliveroo', color: '#00CCBC' },
  ubereats: { label: 'Uber Eats', color: '#06C167' },
  justeat: { label: 'Just Eat', color: '#FF8000' },
  other: { label: 'Altro', color: '#9B8C79' },
}

const STATUS_META: Record<
  ExternalOrderStatus,
  { key: keyof typeof COPY.it; bg: string; text: string }
> = {
  new: { key: 'st_new', bg: 'bg-amber-100', text: 'text-amber-700' },
  accepted: { key: 'st_accepted', bg: 'bg-blue-100', text: 'text-blue-700' },
  preparing: { key: 'st_preparing', bg: 'bg-indigo-100', text: 'text-indigo-700' },
  ready: { key: 'st_ready', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  completed: { key: 'st_completed', bg: 'bg-neutral-200', text: 'text-neutral-600' },
  rejected: { key: 'st_rejected', bg: 'bg-red-100', text: 'text-red-700' },
  cancelled: { key: 'st_cancelled', bg: 'bg-red-100', text: 'text-red-700' },
}

// Stato successivo "positivo" nel flusso, per il pulsante principale.
const NEXT_STATUS: Partial<
  Record<ExternalOrderStatus, { next: ExternalOrderStatus; label: keyof typeof COPY.it }>
> = {
  new: { next: 'accepted', label: 'accept' },
  accepted: { next: 'preparing', label: 'prepare' },
  preparing: { next: 'ready', label: 'ready' },
  ready: { next: 'completed', label: 'complete' },
}

function fmtMoney(v: number | null, currency: string): string {
  if (v === null || v === undefined) return '—'
  try {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency }).format(v)
  } catch {
    return `${v.toFixed(2)} ${currency}`
  }
}

// ── Dropdown filtro personalizzato (stile design system) ─────────────────────

interface DropdownOption {
  value: string
  label: string
  dot?: string // pallino colorato (piattaforma)
  swatch?: { bg: string; text: string } // pill colorata (stato)
}

function FilterDropdown({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: DropdownOption[]
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = options.find((o) => o.value === value) ?? options[0]

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 rounded-full border bg-white px-3.5 py-2 text-xs font-bold transition ${
          open
            ? 'border-brand-terra text-tt-ink shadow-glow-amber'
            : 'border-tt-line text-tt-ink hover:border-brand-terra/60'
        }`}
      >
        {selected.dot && (
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: selected.dot }}
          />
        )}
        {selected.swatch && (
          <span
            className={`h-2.5 w-2.5 rounded-full ${selected.swatch.text}`}
            style={{ backgroundColor: 'currentColor' }}
          />
        )}
        <span className="whitespace-nowrap">{selected.label}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-tt-muted transition ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-30 min-w-[190px] overflow-hidden rounded-2xl border border-tt-line bg-white p-1 shadow-xl animate-in fade-in slide-in-from-top-1 duration-150">
          {options.map((o) => {
            const active = o.value === value
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  onChange(o.value)
                  setOpen(false)
                }}
                className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-semibold transition ${
                  active
                    ? 'bg-tt-surfaceAlt text-tt-ink'
                    : 'text-tt-muted hover:bg-tt-surfaceAlt/60 hover:text-tt-ink'
                }`}
              >
                {o.dot && (
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: o.dot }}
                  />
                )}
                {o.swatch && (
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${o.swatch.text}`}
                    style={{ backgroundColor: 'currentColor' }}
                  />
                )}
                <span className="flex-1 truncate">{o.label}</span>
                {active && (
                  <Check className="h-3.5 w-3.5 shrink-0 text-brand-terra" />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function DeliverySection({ ctx }: Props) {
  const { lang } = useI18n()
  const t = COPY[lang === 'en' ? 'en' : 'it']

  const [orders, setOrders] = useState<ExternalOrder[]>([])
  const [integrations, setIntegrations] = useState<PlatformIntegration[]>([])
  const [loading, setLoading] = useState(true)
  const [muted, setMuted] = useState(false)
  const [simBusy, setSimBusy] = useState(false)
  const [platformFilter, setPlatformFilter] = useState<'all' | DeliveryPlatformId>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | ExternalOrderStatus>('all')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const seenIdsRef = useRef<Set<string>>(new Set())
  const firstLoadRef = useRef(true)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flash = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ msg, type })
    toastTimer.current = setTimeout(() => setToast(null), 3200)
  }, [])

  useEffect(() => {
    setMuted(isAdminNotifMuted())
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
  }, [])

  const load = useCallback(
    async (withSound: boolean) => {
      try {
        const rows = await listExternalOrders(ctx.restaurantId)
        // Rileva ordini nuovi per il suono di notifica.
        if (withSound && !firstLoadRef.current && !isAdminNotifMuted()) {
          const hasNew = rows.some(
            (o) => !seenIdsRef.current.has(o.id) && o.status === 'new',
          )
          if (hasNew) playNotificationSound()
        }
        rows.forEach((o) => seenIdsRef.current.add(o.id))
        firstLoadRef.current = false
        setOrders(rows)
      } catch {
        /* silenzioso: il polling riproverà */
      } finally {
        setLoading(false)
      }
    },
    [ctx.restaurantId],
  )

  const loadIntegrations = useCallback(async () => {
    try {
      setIntegrations(await getPlatformIntegrations(ctx.restaurantId))
    } catch {
      /* ignore */
    }
  }, [ctx.restaurantId])

  // Caricamento iniziale + realtime + polling di sicurezza.
  useEffect(() => {
    load(false)
    loadIntegrations()

    const channel = supabase
      .channel(`external_orders_${ctx.restaurantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'external_orders',
          filter: `restaurant_id=eq.${ctx.restaurantId}`,
        },
        () => load(true),
      )
      .subscribe()

    const poll = setInterval(() => load(true), 20000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(poll)
    }
  }, [ctx.restaurantId, load, loadIntegrations])

  const toggleMute = () => {
    const next = !muted
    setMuted(next)
    setAdminNotifMuted(next)
  }

  const changeStatus = async (id: string, status: ExternalOrderStatus) => {
    // Aggiornamento ottimistico.
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)))
    try {
      await updateExternalOrderStatus(id, status)
    } catch {
      flash(t.updateError, 'error')
      load(false)
    }
  }

  const enabledPlatforms = useMemo(
    () => integrations.filter((i) => i.enabled).map((i) => i.platform),
    [integrations],
  )

  const runSimulator = async () => {
    const enabled = integrations.filter((i) => i.enabled)
    if (enabled.length === 0) {
      flash(t.simNeedsIntegration, 'error')
      return
    }
    setSimBusy(true)
    try {
      // Se c'è un filtro piattaforma attivo e quella piattaforma è abilitata,
      // usala; altrimenti scegli la prima abilitata.
      const target =
        (platformFilter !== 'all' &&
          enabled.find((i) => i.platform === platformFilter)) ||
        enabled[0]
      const payload = buildSamplePayload(target.platform)
      const res = await fetch(`/api/integrations/${target.platform}/webhook`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-webhook-token': target.webhookToken,
        },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('webhook failed')
      flash(t.simSent, 'success')
      // Il realtime aggiorna la lista; forziamo comunque un refresh rapido.
      setTimeout(() => load(true), 400)
    } catch {
      flash(t.simError, 'error')
    } finally {
      setSimBusy(false)
    }
  }

  const filtered = useMemo(
    () =>
      orders.filter(
        (o) =>
          (platformFilter === 'all' || o.platform === platformFilter) &&
          (statusFilter === 'all' || o.status === statusFilter),
      ),
    [orders, platformFilter, statusFilter],
  )

  const relTime = (iso: string): string => {
    const diff = Date.now() - new Date(iso).getTime()
    const min = Math.floor(diff / 60000)
    if (min < 1) return t.justNow
    if (min < 60) return `${min} ${t.minAgo}`
    return `${Math.floor(min / 60)} ${t.hAgo}`
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-brand-amber to-brand-terra text-white shadow-glow-amber">
            <Send className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-serif text-xl font-extrabold text-tt-ink">{t.title}</h2>
            <p className="text-xs text-tt-muted">{t.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleMute}
            className="grid h-9 w-9 place-items-center rounded-full border border-tt-line bg-white text-tt-muted transition hover:text-tt-ink"
            title={muted ? 'Suono off' : 'Suono on'}
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <button
            onClick={() => load(false)}
            className="grid h-9 w-9 place-items-center rounded-full border border-tt-line bg-white text-tt-muted transition hover:text-tt-ink"
            title={t.refresh}
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={runSimulator}
            disabled={simBusy}
            className="flex items-center gap-1.5 rounded-full bg-gradient-to-br from-brand-amber to-brand-terra px-3.5 py-2 text-xs font-bold text-white shadow-glow-amber transition hover:opacity-90 disabled:opacity-60"
          >
            {simBusy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            {simBusy ? t.simulating : t.simulate}
          </button>
        </div>
      </div>

      {/* Avviso: nessuna integrazione attiva */}
      {integrations.length > 0 && enabledPlatforms.length === 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <Settings2 className="h-4 w-4 shrink-0" />
          <span>{t.noIntegration}</span>
        </div>
      )}

      {/* Filtri */}
      <div className="flex flex-wrap items-center gap-2">
        <FilterDropdown
          value={platformFilter}
          onChange={(v) => setPlatformFilter(v as 'all' | DeliveryPlatformId)}
          options={[
            { value: 'all', label: t.allPlatforms },
            ...DELIVERY_PLATFORMS.map((p) => ({
              value: p,
              label: PLATFORM_META[p].label,
              dot: PLATFORM_META[p].color,
            })),
          ]}
        />
        <FilterDropdown
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as 'all' | ExternalOrderStatus)}
          options={[
            { value: 'all', label: t.allStatuses },
            ...(Object.keys(STATUS_META) as ExternalOrderStatus[]).map((s) => ({
              value: s,
              label: t[STATUS_META[s].key],
              swatch: STATUS_META[s],
            })),
          ]}
        />
      </div>

      {/* Lista ordini */}
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-2xl border border-tt-line bg-tt-surfaceAlt"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="tt-card grid place-items-center gap-1 rounded-2xl border border-tt-line p-10 text-center shadow-tt">
          <Send className="mb-1 h-8 w-8 text-tt-muted/50" />
          <p className="text-sm font-bold text-tt-ink">{t.empty}</p>
          <p className="text-xs text-tt-muted">{t.emptyHint}</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((o) => {
            const pm = PLATFORM_META[o.platform] ?? PLATFORM_META.other
            const sm = STATUS_META[o.status]
            const next = NEXT_STATUS[o.status]
            const canReject = o.status === 'new' || o.status === 'accepted'
            return (
              <div
                key={o.id}
                className="tt-card flex flex-col gap-3 rounded-2xl border border-tt-line p-4 shadow-tt"
              >
                {/* Riga alto: piattaforma + stato + tempo */}
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="rounded-full px-2.5 py-1 text-[11px] font-extrabold text-white"
                    style={{ backgroundColor: pm.color }}
                  >
                    {pm.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${sm.bg} ${sm.text}`}
                    >
                      {t[sm.key]}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-tt-muted">
                      <Clock className="h-3 w-3" />
                      {relTime(o.placedAt)}
                    </span>
                  </div>
                </div>

                {/* Cliente */}
                <div className="space-y-0.5 text-xs text-tt-muted">
                  <p className="flex items-center gap-1.5 font-semibold text-tt-ink">
                    <User className="h-3.5 w-3.5" />
                    {o.customerName || '—'}
                    <span className="ml-1 rounded bg-tt-surfaceAlt px-1.5 py-0.5 text-[10px] font-bold uppercase text-tt-muted">
                      {o.orderType === 'pickup' ? t.pickup : t.delivery}
                    </span>
                  </p>
                  {o.customerPhone && (
                    <p className="flex items-center gap-1.5">
                      <Phone className="h-3 w-3" />
                      {o.customerPhone}
                    </p>
                  )}
                  {o.deliveryAddress && (
                    <p className="flex items-center gap-1.5">
                      <MapPin className="h-3 w-3" />
                      {o.deliveryAddress}
                    </p>
                  )}
                </div>

                {/* Articoli */}
                <ul className="space-y-1 border-y border-tt-line py-2 text-xs">
                  {o.items.map((it, idx) => (
                    <li key={idx} className="flex items-start justify-between gap-2">
                      <span className="text-tt-ink">
                        <span className="font-bold">{it.quantity}×</span> {it.name}
                        {it.notes && (
                          <span className="block text-[11px] text-tt-muted">
                            {it.notes}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 text-tt-muted">
                        {fmtMoney(
                          it.price !== null ? it.price * it.quantity : null,
                          o.currency,
                        )}
                      </span>
                    </li>
                  ))}
                </ul>

                {o.notes && (
                  <p className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-800">
                    <span className="font-bold">{t.notes}: </span>
                    {o.notes}
                  </p>
                )}

                {/* Totale */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-xs text-tt-muted">
                    {o.items.reduce((s, it) => s + it.quantity, 0)} {t.items}
                  </span>
                  <span className="font-extrabold text-tt-ink">
                    {t.total}: {fmtMoney(o.total, o.currency)}
                  </span>
                </div>

                {/* Azioni */}
                {(next || canReject) && (
                  <div className="flex items-center gap-2">
                    {next && (
                      <button
                        onClick={() => changeStatus(o.id, next.next)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-tt-ink px-3 py-2 text-xs font-bold text-white transition hover:opacity-90"
                      >
                        <Check className="h-3.5 w-3.5" />
                        {t[next.label]}
                      </button>
                    )}
                    {canReject && (
                      <button
                        onClick={() => changeStatus(o.id, 'rejected')}
                        className="flex items-center justify-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-100"
                      >
                        <X className="h-3.5 w-3.5" />
                        {t.reject}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold text-white shadow-lg ${
            toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
          }`}
        >
          {toast.type === 'success' ? (
            <Check className="h-4 w-4" />
          ) : (
            <X className="h-4 w-4" />
          )}
          {toast.msg}
        </div>
      )}
    </div>
  )
}

'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CalendarCheck,
  Users,
  Phone,
  Mail,
  Clock,
  Plus,
  Check,
  X,
  Trash2,
  Pencil,
  Calendar,
  CheckCircle2,
  XCircle,
  TrendingDown,
  TrendingUp,
  CalendarClock,
  StickyNote,
} from 'lucide-react'
import type { RestaurantCtx, ThemeMode } from '../types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'

interface Props {
  ctx: RestaurantCtx
  theme: ThemeMode
}

type ReservationStatus = 'confirmed' | 'pending' | 'cancelled' | 'completed'

interface Reservation {
  id: string
  guestName: string
  phone: string
  email: string
  date: string // ISO date (yyyy-mm-dd)
  time: string // HH:mm
  partySize: number
  tableLabel: string
  notes: string
  status: ReservationStatus
}

type FilterKey = 'all' | ReservationStatus

// ─── Mock data ────────────────────────────────────────────────────────────────

const todayISO = () => {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const MOCK_TABLES = [
  'Tavolo 1',
  'Tavolo 2',
  'Tavolo 3',
  'Tavolo 4',
  'Tavolo 5',
  'Tavolo 8',
  'Tavolo 10',
  'Esterno A',
  'Esterno B',
  'Sala Privata',
]

const TOTAL_TABLES = 18

function buildMockReservations(): Reservation[] {
  const t = todayISO()
  return [
    {
      id: 'res-001',
      guestName: 'Marco Rossi',
      phone: '+39 333 1234567',
      email: 'marco.rossi@email.it',
      date: t,
      time: '12:30',
      partySize: 4,
      tableLabel: 'Tavolo 3',
      notes: 'Tavolo vicino alla finestra, bambino nel gruppo.',
      status: 'confirmed',
    },
    {
      id: 'res-002',
      guestName: 'Giulia Bianchi',
      phone: '+39 347 9876543',
      email: 'giulia.bianchi@email.it',
      date: t,
      time: '13:00',
      partySize: 2,
      tableLabel: 'Tavolo 8',
      notes: 'Anniversario, dessert offerto dalla casa.',
      status: 'confirmed',
    },
    {
      id: 'res-003',
      guestName: 'Luca Ferrari',
      phone: '+39 320 5557788',
      email: 'l.ferrari@email.it',
      date: t,
      time: '13:30',
      partySize: 6,
      tableLabel: 'Sala Privata',
      notes: 'Riunionione di lavoro, conto separato.',
      status: 'pending',
    },
    {
      id: 'res-004',
      guestName: 'Sofia Romano',
      phone: '+39 339 2244668',
      email: 'sofia.romano@email.it',
      date: t,
      time: '14:00',
      partySize: 3,
      tableLabel: 'Tavolo 5',
      notes: 'Vegetariani, preferiscono menu degustazione.',
      status: 'confirmed',
    },
    {
      id: 'res-005',
      guestName: 'Alessandro Conti',
      phone: '+39 366 1100223',
      email: 'alessandro.conti@email.it',
      date: t,
      time: '19:30',
      partySize: 5,
      tableLabel: 'Tavolo 10',
      notes: 'Compleanno — torta alle 21:00.',
      status: 'confirmed',
    },
    {
      id: 'res-006',
      guestName: 'Elena Marino',
      phone: '+39 348 7766554',
      email: 'elena.marino@email.it',
      date: t,
      time: '20:00',
      partySize: 2,
      tableLabel: 'Esterno A',
      notes: 'Allergie: crostacei.',
      status: 'pending',
    },
    {
      id: 'res-007',
      guestName: 'Francesco Esposito',
      phone: '+39 327 9988776',
      email: 'f.esposito@email.it',
      date: t,
      time: '21:00',
      partySize: 4,
      tableLabel: 'Tavolo 4',
      notes: '',
      status: 'cancelled',
    },
    {
      id: 'res-008',
      guestName: 'Chiara Greco',
      phone: '+39 340 4455667',
      email: 'chiara.greco@email.it',
      date: t,
      time: '12:00',
      partySize: 2,
      tableLabel: 'Tavolo 1',
      notes: 'Pranzo veloce, max 45 minuti.',
      status: 'completed',
    },
    {
      id: 'res-009',
      guestName: 'Davide Rinaldi',
      phone: '+39 351 2233445',
      email: 'davide.rinaldi@email.it',
      date: t,
      time: '20:30',
      partySize: 6,
      tableLabel: 'Tavolo 2',
      notes: 'Prenotazione ricorrente del martedì.',
      status: 'confirmed',
    },
    {
      id: 'res-010',
      guestName: 'Martina Galli',
      phone: '+39 388 6655443',
      email: 'martina.galli@email.it',
      date: t,
      time: '22:00',
      partySize: 3,
      tableLabel: 'Esterno B',
      notes: 'Cena post-teatro.',
      status: 'pending',
    },
  ]
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

const STATUS_META: Record<
  ReservationStatus,
  { label: string; pill: string; dot: string }
> = {
  confirmed: {
    label: 'Confermata',
    pill: 'tt-pill-success',
    dot: 'bg-tt-success',
  },
  pending: {
    label: 'In attesa',
    pill: 'tt-pill-warning',
    dot: 'bg-tt-warning',
  },
  cancelled: {
    label: 'Cancellata',
    pill: 'tt-pill-danger',
    dot: 'bg-tt-danger',
  },
  completed: {
    label: 'Completata',
    pill: 'tt-pill-info',
    dot: 'bg-tt-cyan',
  },
}

const FILTERS: { key: FilterKey; label: string; pill: string }[] = [
  { key: 'all', label: 'Tutte', pill: 'tt-pill' },
  { key: 'confirmed', label: 'Confermate', pill: 'tt-pill-success' },
  { key: 'pending', label: 'In attesa', pill: 'tt-pill-warning' },
  { key: 'cancelled', label: 'Cancellate', pill: 'tt-pill-danger' },
  { key: 'completed', label: 'Completate', pill: 'tt-pill-info' },
]

const TIMELINE_SLOTS = ['12:00', '13:00', '14:00', '19:00', '20:00', '21:00', '22:00']

function formatPrettyDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('it-IT', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  })
}

function isPastTime(date: string, time: string): boolean {
  const now = new Date()
  const [h, m] = time.split(':').map(Number)
  const target = new Date(date + 'T00:00:00')
  target.setHours(h, m, 0, 0)
  return target.getTime() < now.getTime()
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonView() {
  return (
    <div className="space-y-6">
      <div className="h-9 w-56 tt-skeleton rounded-full" />
      <div className="h-5 w-72 tt-skeleton rounded-full" />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="tt-card h-28 rounded-2xl border border-tt-line shadow-tt"
          />
        ))}
      </div>
      <div className="tt-card h-20 rounded-2xl border border-tt-line shadow-tt" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="tt-card h-24 rounded-2xl border border-tt-line shadow-tt"
          />
        ))}
      </div>
    </div>
  )
}

// ─── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ filterLabel }: { filterLabel: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="tt-card flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-tt-line p-12 text-center shadow-tt"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand-amber/15 to-brand-terra/15 ring-1 ring-tt-line">
        <CalendarCheck className="h-8 w-8 text-brand-terra" />
      </div>
      <p className="tt-section-title">Nessuna prenotazione</p>
      <p className="max-w-sm text-sm text-tt-muted">
        Non ci sono prenotazioni {filterLabel !== 'Tutte' ? `nello stato &ldquo;${filterLabel}&rdquo;` : 'per oggi'}.
        Crea una nuova prenotazione per riempire la sala.
      </p>
    </motion.div>
  )
}

// ─── KPI card ──────────────────────────────────────────────────────────────────

function KpiCard({
  icon,
  label,
  value,
  trend,
  trendUp,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  trend?: string
  trendUp?: boolean
  accent: string
}) {
  return (
    <div className="tt-card lift-hover tt-kpi rounded-2xl border border-tt-line p-4 shadow-tt sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-wide text-tt-muted">
            {label}
          </p>
          <p className="tabular mt-2 text-2xl font-extrabold text-tt-ink sm:text-3xl">
            {value}
          </p>
        </div>
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${accent} text-white shadow-sm`}
        >
          {icon}
        </div>
      </div>
      {trend && (
        <div className="mt-2 flex items-center gap-1 text-xs font-semibold">
          {trendUp ? (
            <TrendingUp className="h-3.5 w-3.5 text-tt-success" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5 text-tt-danger" />
          )}
          <span className={trendUp ? 'text-tt-success' : 'text-tt-danger'}>
            {trend}
          </span>
          <span className="text-tt-muted">vs ieri</span>
        </div>
      )}
    </div>
  )
}

// ─── Timeline ──────────────────────────────────────────────────────────────────

function Timeline({ reservations }: { reservations: Reservation[] }) {
  const today = todayISO()
  const todays = reservations.filter((r) => r.date === today && r.status !== 'cancelled')
  const maxParty = Math.max(2, ...todays.map((r) => r.partySize))

  return (
    <div className="tt-card tt-chart-card rounded-2xl border border-tt-line p-5 shadow-tt">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-brand-terra" />
          <p className="tt-section-title">Timeline di oggi</p>
        </div>
        <span className="tt-pill tabular text-xs">
          {todays.length} prenotazioni
        </span>
      </div>
      <div className="relative">
        <div className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-gradient-to-r from-brand-amber/30 via-brand-terra/30 to-brand-violet/30" />
        <div className="relative flex items-start justify-between">
          {TIMELINE_SLOTS.map((slot, idx) => {
            const atSlot = todays.filter((r) => r.time.startsWith(slot.split(':')[0]))
            const slotParty = atSlot.reduce((s, r) => s + r.partySize, 0)
            const size = slotParty === 0 ? 10 : 16 + (slotParty / maxParty) * 28
            return (
              <div
                key={slot}
                className="flex flex-1 flex-col items-center gap-2"
              >
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.05 * idx, type: 'spring', stiffness: 220, damping: 18 }}
                  className="relative flex items-center justify-center rounded-full ring-4 ring-white/70"
                  style={{
                    width: size,
                    height: size,
                    background:
                      slotParty === 0
                        ? 'linear-gradient(135deg,#d4d4d8,#a1a1aa)'
                        : 'linear-gradient(135deg,var(--brand-amber),var(--brand-terra))',
                  }}
                  title={`${slot} — ${atSlot.length} prenotazioni, ${slotParty} coperti`}
                >
                  {atSlot.length > 0 && (
                    <span className="tabular text-[10px] font-bold text-white">
                      {atSlot.length}
                    </span>
                  )}
                </motion.div>
                <span className="tabular text-[11px] font-semibold text-tt-muted">
                  {slot}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Reservation card ─────────────────────────────────────────────────────────

function ReservationCard({
  r,
  onConfirm,
  onCancel,
  onComplete,
  onEdit,
  onDelete,
}: {
  r: Reservation
  onConfirm: () => void
  onCancel: () => void
  onComplete: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const meta = STATUS_META[r.status]
  const past = isPastTime(r.date, r.time)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.22 }}
      className="tt-card lift-hover rounded-2xl border border-tt-line p-4 shadow-tt sm:p-5"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Left: guest */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="tt-avatar flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-amber to-brand-terra text-sm font-bold text-white shadow-sm">
            {initials(r.guestName)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-tt-ink">{r.guestName}</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-tt-muted">
              <span className="inline-flex items-center gap-1">
                <Phone className="h-3 w-3" /> {r.phone}
              </span>
              <span className="inline-flex items-center gap-1">
                <Mail className="h-3 w-3" /> {r.email}
              </span>
            </div>
          </div>
        </div>

        {/* Middle: details */}
        <div className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-1.5 text-xs sm:text-sm">
          <span className="inline-flex items-center gap-1.5 font-semibold text-tt-ink">
            <Calendar className="h-4 w-4 text-brand-terra" />
            <span className="tabular">{formatPrettyDate(r.date)}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 font-semibold text-tt-ink">
            <Clock className="h-4 w-4 text-brand-terra" />
            <span className="tabular">{r.time}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 font-semibold text-tt-ink">
            <Users className="h-4 w-4 text-brand-terra" />
            <span className="tabular">{r.partySize}</span>
            <span className="text-tt-muted">coperti</span>
          </span>
          <span className="inline-flex items-center gap-1.5 font-semibold text-tt-ink">
            <span className={`status-dot ${meta.dot}`} />
            {r.tableLabel}
          </span>
        </div>

        {/* Right: status + actions */}
        <div className="flex flex-col items-stretch gap-2 lg:items-end">
          <span className={`${meta.pill} tt-pill inline-flex w-fit items-center gap-1 self-start text-xs font-bold lg:self-end`}>
            {meta.label}
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {r.status === 'pending' && (
              <button
                onClick={onConfirm}
                className="tt-btn-sheen inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-brand-emerald to-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:scale-105"
              >
                <Check className="h-3.5 w-3.5" /> Conferma
              </button>
            )}
            {r.status === 'confirmed' && past && (
              <button
                onClick={onComplete}
                className="tt-btn-sheen inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-brand-sky to-sky-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:scale-105"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Completa
              </button>
            )}
            {(r.status === 'confirmed' || r.status === 'pending') && (
              <button
                onClick={onCancel}
                className="tt-btn-sheen inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-brand-rose to-rose-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:scale-105"
              >
                <X className="h-3.5 w-3.5" /> Cancella
              </button>
            )}
            <button
              onClick={onEdit}
              className="inline-flex items-center gap-1 rounded-full border border-tt-line bg-white/60 px-3 py-1.5 text-xs font-bold text-tt-ink transition hover:scale-105 hover:border-tt-pink/40 hover:bg-tt-pinkSoft"
              title="Modifica"
            >
              <Pencil className="h-3.5 w-3.5" /> Modifica
            </button>
            <button
              onClick={onDelete}
              className="inline-flex items-center gap-1 rounded-full border border-tt-line bg-white/60 px-3 py-1.5 text-xs font-bold text-tt-danger transition hover:scale-105 hover:bg-tt-danger/10"
              title="Elimina"
            >
              <Trash2 className="h-3.5 w-3.5" /> Elimina
            </button>
          </div>
        </div>
      </div>

      {r.notes && (
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-tt-surfaceAlt px-3 py-2 text-xs text-tt-muted">
          <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-terra" />
          <span>{r.notes}</span>
        </div>
      )}
    </motion.div>
  )
}

// ─── New/Edit modal form ───────────────────────────────────────────────────────

interface FormState {
  guestName: string
  phone: string
  email: string
  date: string
  time: string
  partySize: number
  tableLabel: string
  notes: string
}

const EMPTY_FORM: FormState = {
  guestName: '',
  phone: '',
  email: '',
  date: todayISO(),
  time: '19:30',
  partySize: 2,
  tableLabel: MOCK_TABLES[0],
  notes: '',
}

function ReservationFormDialog({
  open,
  onClose,
  onSubmit,
  initial,
  mode,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (data: Omit<Reservation, 'id' | 'status'> & { status?: ReservationStatus }) => void
  initial: Reservation | null
  mode: 'create' | 'edit'
}) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})

  useEffect(() => {
    if (open) {
      if (initial) {
        setForm({
          guestName: initial.guestName,
          phone: initial.phone,
          email: initial.email,
          date: initial.date,
          time: initial.time,
          partySize: initial.partySize,
          tableLabel: initial.tableLabel,
          notes: initial.notes,
        })
      } else {
        setForm(EMPTY_FORM)
      }
      setErrors({})
    }
  }, [open, initial])

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((p) => ({ ...p, [k]: v }))
  }

  function validate(): boolean {
    const e: Partial<Record<keyof FormState, string>> = {}
    if (!form.guestName.trim()) e.guestName = 'Nome obbligatorio'
    if (!form.phone.trim()) e.phone = 'Telefono obbligatorio'
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Email non valida'
    if (!form.date) e.date = 'Data obbligatoria'
    if (!form.time) e.time = 'Ora obbligatoria'
    if (!form.partySize || form.partySize < 1) e.partySize = 'Minimo 1'
    if (form.partySize > 30) e.partySize = 'Massimo 30'
    if (!form.tableLabel) e.tableLabel = 'Tavolo obbligatorio'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit() {
    if (!validate()) return
    onSubmit({
      guestName: form.guestName.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      date: form.date,
      time: form.time,
      partySize: Number(form.partySize),
      tableLabel: form.tableLabel,
      notes: form.notes.trim(),
    })
  }

  const inputCls =
    'w-full rounded-xl border border-tt-line bg-white/70 px-3 py-2 text-sm text-tt-ink outline-none transition focus:border-brand-terra/50 focus:ring-2 focus:ring-brand-terra/20'
  const labelCls = 'mb-1 block text-xs font-bold uppercase tracking-wide text-tt-muted'

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-3xl border-tt-line bg-background p-0 sm:max-w-lg">
        <div className="noise-overlay pointer-events-none absolute inset-0 rounded-3xl opacity-40" />
        <DialogHeader className="relative border-b border-tt-line px-6 pb-4 pt-6">
          <DialogTitle className="flex items-center gap-2 text-xl font-extrabold text-tt-ink">
            <CalendarCheck className="h-5 w-5 text-brand-terra" />
            {mode === 'create' ? 'Nuova prenotazione' : 'Modifica prenotazione'}
          </DialogTitle>
          <DialogDescription className="text-tt-muted">
            {mode === 'create'
              ? 'Inserisci i dettagli della prenotazione.'
              : 'Aggiorna i dettagli della prenotazione.'}
          </DialogDescription>
        </DialogHeader>

        <div className="relative space-y-4 px-6 py-5">
          <div>
            <label className={labelCls}>Nome ospite *</label>
            <input
              className={inputCls}
              value={form.guestName}
              onChange={(e) => set('guestName', e.target.value)}
              placeholder="Mario Rossi"
            />
            {errors.guestName && (
              <p className="mt-1 text-xs font-semibold text-tt-danger">{errors.guestName}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Telefono *</label>
              <input
                className={inputCls}
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="+39 333 1234567"
              />
              {errors.phone && (
                <p className="mt-1 text-xs font-semibold text-tt-danger">{errors.phone}</p>
              )}
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input
                className={inputCls}
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="mario@email.it"
              />
              {errors.email && (
                <p className="mt-1 text-xs font-semibold text-tt-danger">{errors.email}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className={labelCls}>Data *</label>
              <input
                type="date"
                className={`${inputCls} tabular`}
                value={form.date}
                onChange={(e) => set('date', e.target.value)}
              />
              {errors.date && (
                <p className="mt-1 text-xs font-semibold text-tt-danger">{errors.date}</p>
              )}
            </div>
            <div>
              <label className={labelCls}>Ora *</label>
              <input
                type="time"
                className={`${inputCls} tabular`}
                value={form.time}
                onChange={(e) => set('time', e.target.value)}
              />
              {errors.time && (
                <p className="mt-1 text-xs font-semibold text-tt-danger">{errors.time}</p>
              )}
            </div>
            <div>
              <label className={labelCls}>Coperti *</label>
              <input
                type="number"
                min={1}
                max={30}
                className={`${inputCls} tabular`}
                value={form.partySize}
                onChange={(e) => set('partySize', Number(e.target.value))}
              />
              {errors.partySize && (
                <p className="mt-1 text-xs font-semibold text-tt-danger">{errors.partySize}</p>
              )}
            </div>
          </div>

          <div>
            <label className={labelCls}>Tavolo *</label>
            <select
              className={inputCls}
              value={form.tableLabel}
              onChange={(e) => set('tableLabel', e.target.value)}
            >
              {MOCK_TABLES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            {errors.tableLabel && (
              <p className="mt-1 text-xs font-semibold text-tt-danger">{errors.tableLabel}</p>
            )}
          </div>

          <div>
            <label className={labelCls}>Note</label>
            <textarea
              className={`${inputCls} min-h-[80px] resize-y`}
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Allergie, occasioni speciali, richieste..."
            />
          </div>
        </div>

        <DialogFooter className="relative flex-row items-center justify-end gap-2 border-t border-tt-line px-6 pb-6 pt-4">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1 rounded-full border border-tt-line bg-white/60 px-4 py-2 text-sm font-bold text-tt-ink transition hover:bg-tt-surfaceAlt"
          >
            <X className="h-4 w-4" /> Annulla
          </button>
          <button
            onClick={handleSubmit}
            className="tt-btn-sheen inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-brand-amber to-brand-terra px-5 py-2 text-sm font-bold text-white shadow-tt transition hover:scale-105"
          >
            {mode === 'create' ? (
              <>
                <Plus className="h-4 w-4" /> Crea prenotazione
              </>
            ) : (
              <>
                <Check className="h-4 w-4" /> Salva modifiche
              </>
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main section ──────────────────────────────────────────────────────────────

export function ReservationsSection({ ctx: _ctx }: Props) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [filter, setFilter] = useState<FilterKey>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Reservation | null>(null)
  const [deleting, setDeleting] = useState<Reservation | null>(null)

  // Simulate initial load
  useEffect(() => {
    const t = setTimeout(() => {
      setReservations(buildMockReservations())
      setLoading(false)
    }, 800)
    return () => clearTimeout(t)
  }, [])

  const todays = useMemo(
    () => reservations.filter((r) => r.date === todayISO()),
    [reservations],
  )

  const kpis = useMemo(() => {
    const activeToday = todays.filter((r) => r.status !== 'cancelled')
    const guestsToday = activeToday.reduce((s, r) => s + r.partySize, 0)
    const occupiedTableLabels = new Set(
      activeToday.map((r) => r.tableLabel),
    )
    const availableTables = Math.max(0, TOTAL_TABLES - occupiedTableLabels.size)
    const allHistorical = reservations.length
    const noShows = reservations.filter((r) => r.status === 'cancelled').length
    const noShowRate = allHistorical > 0 ? (noShows / allHistorical) * 100 : 0
    return {
      todayCount: activeToday.length,
      guestsToday,
      availableTables,
      noShowRate,
    }
  }, [todays, reservations])

  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = {
      all: reservations.length,
      confirmed: 0,
      pending: 0,
      cancelled: 0,
      completed: 0,
    }
    for (const r of reservations) c[r.status] += 1
    return c
  }, [reservations])

  const filtered = useMemo(() => {
    const list = filter === 'all' ? reservations : reservations.filter((r) => r.status === filter)
    return [...list].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      return a.time.localeCompare(b.time)
    })
  }, [reservations, filter])

  function updateStatus(id: string, status: ReservationStatus) {
    setReservations((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)))
    const labels: Record<ReservationStatus, string> = {
      confirmed: 'confermata',
      pending: 'in attesa',
      cancelled: 'cancellata',
      completed: 'completata',
    }
    toast({
      title: 'Prenotazione aggiornata',
      description: `Stato impostato su "${labels[status]}".`,
    })
  }

  function handleCreate(data: Omit<Reservation, 'id' | 'status'>) {
    const id = `res-${String(Date.now()).slice(-6)}`
    setReservations((prev) => [{ ...data, id, status: 'pending' }, ...prev])
    setDialogOpen(false)
    setEditing(null)
    toast({
      title: 'Prenotazione creata',
      description: `${data.guestName} — ${data.partySize} coperti alle ${data.time}.`,
    })
  }

  function handleEditSubmit(data: Omit<Reservation, 'id' | 'status'> & { status?: ReservationStatus }) {
    if (!editing) return
    setReservations((prev) =>
      prev.map((r) =>
        r.id === editing.id ? { ...r, ...data } : r,
      ),
    )
    setDialogOpen(false)
    setEditing(null)
    toast({
      title: 'Prenotazione aggiornata',
      description: `Modifiche salvate per ${data.guestName}.`,
    })
  }

  function handleEditClick(r: Reservation) {
    setEditing(r)
    setDialogOpen(true)
  }

  function handleNewClick() {
    setEditing(null)
    setDialogOpen(true)
  }

  function handleDeleteConfirm() {
    if (!deleting) return
    setReservations((prev) => prev.filter((r) => r.id !== deleting.id))
    toast({
      title: 'Prenotazione eliminata',
      description: `${deleting.guestName} rimosso dalla lista.`,
    })
    setDeleting(null)
  }

  if (loading) {
    return (
      <div className="animate-ttFadeUp">
        <SkeletonView />
      </div>
    )
  }

  const activeFilterLabel = FILTERS.find((f) => f.key === filter)?.label ?? 'Tutte'

  return (
    <div className="animate-ttFadeUp space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow text-xs font-bold uppercase tracking-widest text-brand-terra">
            Gestione sala
          </p>
          <h2 className="tt-section-title text-2xl font-extrabold text-tt-ink sm:text-3xl">
            Prenotazioni
          </h2>
          <p className="mt-1 text-sm text-tt-muted">
            Gestisci le prenotazioni dei tavoli
          </p>
        </div>
        <button
          onClick={handleNewClick}
          className="tt-btn-sheen inline-flex items-center gap-2 self-start rounded-full bg-gradient-to-r from-brand-amber to-brand-terra px-5 py-2.5 text-sm font-bold text-white shadow-tt transition hover:scale-105"
        >
          <Plus className="h-4 w-4" /> Nuova prenotazione
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <KpiCard
          icon={<CalendarCheck className="h-5 w-5" />}
          label="Prenotazioni oggi"
          value={kpis.todayCount}
          trend="+12%"
          trendUp
          accent="from-brand-amber to-brand-terra"
        />
        <KpiCard
          icon={<Users className="h-5 w-5" />}
          label="Coperti oggi"
          value={kpis.guestsToday}
          trend="+8%"
          trendUp
          accent="from-brand-emerald to-emerald-600"
        />
        <KpiCard
          icon={<CalendarClock className="h-5 w-5" />}
          label="Tavoli disponibili"
          value={kpis.availableTables}
          trend={`${kpis.availableTables}/${TOTAL_TABLES}`}
          trendUp
          accent="from-brand-violet to-violet-600"
        />
        <KpiCard
          icon={<XCircle className="h-5 w-5" />}
          label="No-show rate"
          value={`${kpis.noShowRate.toFixed(1)}%`}
          trend="-2.4%"
          trendUp
          accent="from-brand-rose to-rose-600"
        />
      </div>

      {/* Timeline */}
      <Timeline reservations={reservations} />

      {/* Filter tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.key
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`tt-pill inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                active
                  ? 'tt-nav-active bg-gradient-to-r from-brand-amber to-brand-terra text-white shadow-tt'
                  : 'border border-tt-line bg-white/60 text-tt-ink hover:border-tt-pink/40 hover:bg-tt-pinkSoft'
              }`}
            >
              {f.label}
              <span
                className={`tabular inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                  active ? 'bg-white/25 text-white' : 'bg-tt-surfaceAlt text-tt-muted'
                }`}
              >
                {counts[f.key]}
              </span>
            </button>
          )
        })}
      </div>

      {/* Reservations list */}
      {filtered.length === 0 ? (
        <EmptyState filterLabel={activeFilterLabel} />
      ) : (
        <div className="tt-scroll max-h-[640px] space-y-3 overflow-y-auto pr-1">
          <AnimatePresence initial={false}>
            {filtered.map((r) => (
              <ReservationCard
                key={r.id}
                r={r}
                onConfirm={() => updateStatus(r.id, 'confirmed')}
                onCancel={() => updateStatus(r.id, 'cancelled')}
                onComplete={() => updateStatus(r.id, 'completed')}
                onEdit={() => handleEditClick(r)}
                onDelete={() => setDeleting(r)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* New / Edit dialog */}
      <ReservationFormDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false)
          setEditing(null)
        }}
        initial={editing}
        mode={editing ? 'edit' : 'create'}
        onSubmit={editing ? handleEditSubmit : handleCreate}
      />

      {/* Delete confirm */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent className="rounded-3xl border-tt-line bg-background">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-lg font-extrabold text-tt-ink">
              <Trash2 className="h-5 w-5 text-tt-danger" />
              Elimina prenotazione
            </AlertDialogTitle>
            <AlertDialogDescription className="text-tt-muted">
              {deleting
                ? `Sei sicuro di voler eliminare la prenotazione di "${deleting.guestName}" (${deleting.date} alle ${deleting.time})? L'operazione non è reversibile.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-full border-tt-line bg-white/60 px-5 py-2 text-sm font-bold text-tt-ink hover:bg-tt-surfaceAlt">
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="rounded-full bg-gradient-to-r from-brand-rose to-rose-600 px-5 py-2 text-sm font-bold text-white shadow-tt hover:scale-105"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

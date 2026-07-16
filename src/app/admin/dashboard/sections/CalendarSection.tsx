'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronLeft, ChevronRight, CalendarDays, Users, Clock, Copy, Check,
  KeyRound, Loader2, AlertCircle, UtensilsCrossed, ChefHat, Download,
} from 'lucide-react'
import type { RestaurantCtx, ThemeMode } from '../types'
import { supabase } from '@/lib/supabase'
import {
  getEmployees, getActiveShiftCodes, getAttendance, generateShiftCode,
  type Employee, type ShiftCode, type AttendanceRow,
} from '@/lib/admin-service'
import { useI18n } from '@/components/i18n/I18nProvider'

interface Props { ctx: RestaurantCtx; theme: ThemeMode }

// Data "locale" in formato YYYY-MM-DD (stesso formato di attendance.work_date).
// NB: il DB calcola il giorno su fuso Europe/Rome; qui usiamo il fuso del
// browser, che per l'utente italiano coincide.
function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Griglia del mese con settimana che parte da lunedì (convenzione IT). Ritorna
// sempre 42 celle (6 righe) includendo i giorni "spillover" del mese prima/dopo.
function buildMonthGrid(cursor: Date): Date[] {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  // getDay(): 0=domenica … 6=sabato → converti a 0=lunedì … 6=domenica.
  const leading = (first.getDay() + 6) % 7
  const start = new Date(first)
  start.setDate(first.getDate() - leading)
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

export function CalendarSection({ ctx }: Props) {
  const { tr, lang } = useI18n()
  const T = tr.admin.calendar
  const locale = lang === 'en' ? 'en-US' : 'it-IT'

  const todayISO = toISODate(new Date())

  // ── Stato vista ────────────────────────────────────────────────────────────
  // monthCursor: primo giorno del mese visualizzato. selectedISO: giorno scelto
  // di cui mostriamo l'elenco presenti (default: oggi).
  const [monthCursor, setMonthCursor] = useState(() => {
    const n = new Date()
    return new Date(n.getFullYear(), n.getMonth(), 1)
  })
  const [selectedISO, setSelectedISO] = useState(todayISO)

  // ── Stato dati ─────────────────────────────────────────────────────────────
  const [employees, setEmployees] = useState<Employee[]>([])
  const [codes, setCodes] = useState<ShiftCode[]>([])
  const [attendance, setAttendance] = useState<AttendanceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ── Stato interazioni ──────────────────────────────────────────────────────
  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Range di date del mese visualizzato (per interrogare le presenze una volta sola).
  const monthRange = useMemo(() => {
    const from = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1)
    const to = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0)
    return { from: toISODate(from), to: toISODate(to) }
  }, [monthCursor])

  // Carica presenze del mese + codici attivi + membri. I membri/codici non
  // dipendono dal mese, ma li ricarichiamo insieme per semplicità.
  const load = async () => {
    try {
      const [emp, cds, att] = await Promise.all([
        getEmployees(ctx.restaurantId),
        getActiveShiftCodes(ctx.restaurantId),
        getAttendance(ctx.restaurantId, monthRange.from, monthRange.to),
      ])
      setEmployees(emp)
      setCodes(cds)
      setAttendance(att)
    } catch (e: any) {
      setError(e.message ?? T.errorLoad)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    load()
    // Aggiornamento realtime: quando un membro timbra, la lista presenti del
    // giorno si aggiorna da sola senza ricaricare la pagina.
    const channel = supabase
      .channel(`calendar-${ctx.restaurantId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance', filter: `restaurant_id=eq.${ctx.restaurantId}` }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff_shift_codes', filter: `restaurant_id=eq.${ctx.restaurantId}` }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.restaurantId, monthRange.from, monthRange.to])

  useEffect(() => () => { if (copyTimer.current) clearTimeout(copyTimer.current) }, [])

  // ── Derivati ───────────────────────────────────────────────────────────────
  // Mappa profile_id → nome, per etichettare le presenze (che portano solo l'id).
  const nameById = useMemo(() => {
    const m = new Map<string, { name: string; role: string }>()
    for (const e of employees) {
      const name = [e.first_name, e.last_name].filter(Boolean).join(' ').trim()
      m.set(e.id, { name: name || '—', role: e.role })
    }
    return m
  }, [employees])

  // Presenze raggruppate per giorno + insieme dei giorni con almeno una presenza
  // (per il pallino sotto le celle del calendario).
  const { byDate, presentDays } = useMemo(() => {
    const byDate = new Map<string, AttendanceRow[]>()
    for (const r of attendance) {
      if (!byDate.has(r.work_date)) byDate.set(r.work_date, [])
      byDate.get(r.work_date)!.push(r)
    }
    return { byDate, presentDays: new Set(byDate.keys()) }
  }, [attendance])

  // Codice attivo per membro (ce n'è al massimo uno per volta).
  const codeByProfile = useMemo(() => {
    const m = new Map<string, ShiftCode>()
    for (const c of codes) if (!m.has(c.profile_id)) m.set(c.profile_id, c)
    return m
  }, [codes])

  const selectedRows = byDate.get(selectedISO) ?? []
  const grid = useMemo(() => buildMonthGrid(monthCursor), [monthCursor])
  const weekDays = useMemo(() => {
    // Etichette giorni (lun…dom) localizzate.
    const base = new Date(2024, 0, 1) // 1 gen 2024 = lunedì
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base); d.setDate(base.getDate() + i)
      return d.toLocaleDateString(locale, { weekday: 'short' })
    })
  }, [locale])

  // ── Azioni ─────────────────────────────────────────────────────────────────
  async function handleGenerate(emp: Employee) {
    setGeneratingId(emp.id)
    setError(null)
    try {
      const code = await generateShiftCode(ctx.restaurantId, emp.id)
      // Aggiorna localmente il codice attivo del membro (ottimistico).
      setCodes((prev) => [
        {
          id: `tmp-${emp.id}`, restaurant_id: ctx.restaurantId, profile_id: emp.id,
          code, created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 16 * 3600e3).toISOString(),
          is_active: true, last_used_at: null,
        },
        ...prev.filter((c) => c.profile_id !== emp.id),
      ])
    } catch (e: any) {
      setError(e.message ?? T.errorGenerate)
    } finally {
      setGeneratingId(null)
    }
  }

  async function handleCopy(code: string) {
    try { await navigator.clipboard.writeText(code) } catch { /* clipboard non disponibile */ }
    setCopiedCode(code)
    if (copyTimer.current) clearTimeout(copyTimer.current)
    copyTimer.current = setTimeout(() => setCopiedCode(null), 2000)
  }

  // Esporta le presenze del mese visualizzato in un CSV scaricato lato client.
  // Separatore ";" + BOM UTF-8 così Excel lo apre correttamente (accenti inclusi).
  function handleExportCsv() {
    const header = [T.csvDate, T.csvName, T.csvRole, T.csvTime]
    const rows = [...attendance]
      .sort((a, b) =>
        a.work_date.localeCompare(b.work_date) || a.clock_in_at.localeCompare(b.clock_in_at),
      )
      .map((r) => {
        const info = nameById.get(r.profile_id)
        const role = info ? (T.roles as Record<string, string>)[info.role] ?? info.role : ''
        const time = new Date(r.clock_in_at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
        return [r.work_date, info?.name ?? '—', role, time]
      })
    const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`
    const csv = [header, ...rows].map((row) => row.map(esc).join(';')).join('\r\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `presenze-${monthRange.from}_${monthRange.to}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const monthLabel = monthCursor.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
  const selectedLabel = new Date(selectedISO + 'T00:00:00').toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })

  // ── Loading skeleton ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="h-6 w-28 tt-skeleton rounded-full" />
          <div className="h-3 w-48 tt-skeleton rounded-full" />
        </div>
        <div className="tt-card h-72 rounded-2xl border border-tt-line shadow-tt" />
        <div className="tt-card h-40 rounded-2xl border border-tt-line shadow-tt" />
      </div>
    )
  }

  if (error && employees.length === 0 && attendance.length === 0) {
    return (
      <div className="grid place-items-center py-16 text-center">
        <AlertCircle className="mb-3 h-10 w-10 text-tt-danger" />
        <p className="text-sm font-bold text-tt-ink">{T.error}</p>
        <p className="mt-1 max-w-xs text-xs text-tt-muted">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Intestazione + azione di esportazione */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl font-extrabold text-tt-ink">{T.title}</h2>
          <p className="text-xs text-tt-muted">{T.subtitle}</p>
        </div>
        {/* Export CSV del mese corrente: disabilitato se non ci sono presenze. */}
        <button
          onClick={handleExportCsv}
          disabled={attendance.length === 0}
          title={T.exportCsv}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-tt-line px-3 py-1.5 text-xs font-semibold text-tt-ink transition hover:bg-tt-surfaceAlt2 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Download className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{T.exportCsv}</span>
        </button>
      </div>

      {/* Toast errore non bloccante (es. generazione fallita) */}
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-tt-danger/30 bg-tt-danger/5 px-3 py-2 text-xs text-tt-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* ── Calendario ──────────────────────────────────────────────────── */}
        <div className="tt-card rounded-2xl border border-tt-line p-4 shadow-tt">
          <div className="mb-3 flex items-center justify-between">
            <button
              onClick={() => setMonthCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))}
              className="grid h-8 w-8 place-items-center rounded-lg text-tt-muted transition hover:bg-tt-surfaceAlt2 hover:text-tt-ink"
              aria-label="prev"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="text-sm font-bold capitalize text-tt-ink">{monthLabel}</p>
            <button
              onClick={() => setMonthCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))}
              className="grid h-8 w-8 place-items-center rounded-lg text-tt-muted transition hover:bg-tt-surfaceAlt2 hover:text-tt-ink"
              aria-label="next"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Intestazioni giorni */}
          <div className="mb-1 grid grid-cols-7 gap-1">
            {weekDays.map((w, i) => (
              <div key={i} className="py-1 text-center text-[10px] font-bold uppercase text-tt-muted">{w}</div>
            ))}
          </div>

          {/* Celle giorni */}
          <div className="grid grid-cols-7 gap-1">
            {grid.map((d, i) => {
              const iso = toISODate(d)
              const inMonth = d.getMonth() === monthCursor.getMonth()
              const isToday = iso === todayISO
              const isSelected = iso === selectedISO
              const hasPresence = presentDays.has(iso)
              const count = byDate.get(iso)?.length ?? 0
              return (
                <button
                  key={i}
                  onClick={() => setSelectedISO(iso)}
                  className={`relative flex aspect-square flex-col items-center justify-center rounded-xl text-sm font-semibold transition ${
                    isSelected
                      ? 'bg-gradient-to-br from-brand-amber to-brand-terra text-white shadow-glow-amber'
                      : inMonth
                        ? 'text-tt-ink hover:bg-tt-surfaceAlt2'
                        : 'text-tt-muted/40'
                  } ${isToday && !isSelected ? 'ring-1 ring-tt-pink' : ''}`}
                >
                  <span>{d.getDate()}</span>
                  {/* Indicatore presenze: pallino + conteggio */}
                  {hasPresence && (
                    <span className={`mt-0.5 flex items-center gap-0.5 text-[9px] font-bold ${isSelected ? 'text-white' : 'text-tt-success'}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-tt-success'}`} />
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Presenti nel giorno selezionato ─────────────────────────────── */}
        <div className="tt-card rounded-2xl border border-tt-line p-4 shadow-tt">
          <div className="mb-3 flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-tt-success/15 text-tt-success">
              <Users className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold capitalize text-tt-ink">
                {selectedISO === todayISO ? `${T.today} · ` : ''}{selectedLabel}
              </p>
              <p className="text-xs text-tt-muted">{T.presentTitle}: {selectedRows.length}</p>
            </div>
          </div>

          {selectedRows.length === 0 ? (
            <div className="grid place-items-center rounded-xl border border-dashed border-tt-line py-10 text-center">
              <CalendarDays className="mb-2 h-8 w-8 text-tt-muted opacity-40" />
              <p className="text-xs text-tt-muted">{T.noneToday}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedRows.map((r) => {
                const info = nameById.get(r.profile_id)
                const time = new Date(r.clock_in_at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
                const RoleIcon = info?.role === 'cucina' ? ChefHat : UtensilsCrossed
                return (
                  <div key={r.id} className="flex items-center gap-3 rounded-xl border border-tt-line bg-tt-surfaceAlt/40 px-3 py-2.5">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-amber to-brand-terra text-white">
                      <RoleIcon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-tt-ink">{info?.name ?? '—'}</p>
                      <p className="truncate text-[11px] text-tt-muted">
                        {info ? (T.roles as Record<string, string>)[info.role] ?? info.role : ''}
                      </p>
                    </div>
                    <span className="flex items-center gap-1 text-xs font-semibold text-tt-muted">
                      <Clock className="h-3 w-3" /> {time}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Codici presenza (generazione) ─────────────────────────────────── */}
      <div className="tt-card rounded-2xl border border-tt-line p-4 shadow-tt">
        <div className="mb-1 flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-tt-pink/15 text-tt-pink">
            <KeyRound className="h-4 w-4" />
          </span>
          <h3 className="text-sm font-bold text-tt-ink">{T.codesTitle}</h3>
        </div>
        <p className="mb-3 text-xs text-tt-muted">{T.codesHint}</p>

        {employees.length === 0 ? (
          <div className="grid place-items-center rounded-xl border border-dashed border-tt-line py-8 text-center">
            <Users className="mb-2 h-8 w-8 text-tt-muted opacity-40" />
            <p className="text-sm font-bold text-tt-ink">{T.noEmployees}</p>
            <p className="mt-1 text-xs text-tt-muted">{T.noEmployeesHint}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {employees.map((e) => {
              const name = [e.first_name, e.last_name].filter(Boolean).join(' ').trim() || '—'
              const code = codeByProfile.get(e.id)
              const busy = generatingId === e.id
              // Presente oggi? Se sì, mostriamo un badge verde accanto al nome.
              const presentToday = (byDate.get(todayISO) ?? []).some((r) => r.profile_id === e.id)
              const RoleIcon = e.role === 'cucina' ? ChefHat : UtensilsCrossed
              return (
                <div key={e.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-tt-line px-3 py-2.5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-tt-surfaceAlt2 text-tt-muted">
                    <RoleIcon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-bold text-tt-ink">{name}</p>
                      {presentToday && (
                        <span className="tt-pill bg-tt-success/15 text-tt-success">
                          <Check className="h-3 w-3" /> {T.present}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-[11px] text-tt-muted">
                      {(T.roles as Record<string, string>)[e.role] ?? e.role}
                    </p>
                  </div>

                  {/* Se esiste un codice attivo lo mostriamo (chip monospazio + copia);
                      il pulsante diventa "Rigenera". Altrimenti solo "Genera codice". */}
                  {code ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopy(code.code)}
                        title={T.copy}
                        className="flex items-center gap-1.5 rounded-lg border border-tt-line bg-tt-surfaceAlt/60 px-2.5 py-1.5 font-mono text-sm font-black tracking-widest text-tt-ink transition hover:bg-tt-surfaceAlt2"
                      >
                        {code.code}
                        {copiedCode === code.code ? <Check className="h-3.5 w-3.5 text-tt-success" /> : <Copy className="h-3.5 w-3.5 text-tt-muted" />}
                      </button>
                      <button
                        // Rigenerare invalida il codice già consegnato: chiediamo conferma.
                        onClick={() => { if (window.confirm(T.regenerateConfirm)) handleGenerate(e) }}
                        disabled={busy}
                        className="rounded-full border border-tt-line px-3 py-1.5 text-xs font-bold text-tt-muted transition hover:text-tt-ink disabled:opacity-60"
                      >
                        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : T.regenerate}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleGenerate(e)}
                      disabled={busy}
                      className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-brand-amber to-brand-terra px-3.5 py-1.5 text-xs font-bold text-white shadow-glow-amber transition hover:scale-105 disabled:opacity-60"
                    >
                      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
                      {busy ? T.generating : T.generateFor}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

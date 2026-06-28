'use client'

import { useState, useEffect, useCallback } from 'react'
import { KeyRound, Copy, CheckCircle, AlertCircle, Loader2, Users, Clock } from 'lucide-react'
import type { RestaurantCtx, ThemeMode } from '../types'
import {
  getEmployees,
  getShiftCodes,
  getAttendance,
  generateShiftCode,
  type Employee,
  type ShiftCode,
  type AttendanceRow,
} from '@/lib/admin-service'

interface Props {
  ctx: RestaurantCtx
  theme: ThemeMode
}

const ROLE_LABELS: Record<string, string> = { cameriere: 'Cameriere', cucina: 'Cucina' }

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

export function CalendarSection({ ctx }: Props) {
  const [isLoading, setIsLoading] = useState(true)
  const [generating, setGenerating] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [shiftCodes, setShiftCodes] = useState<ShiftCode[]>([])
  const [viewMode, setViewMode] = useState<'7' | '30'>('30')
  const [attendance, setAttendance] = useState<AttendanceRow[]>([])
  const [loadingAtt, setLoadingAtt] = useState(true)

  const loadStaffAndCodes = useCallback(async () => {
    setError(null)
    try {
      const [emps, codes] = await Promise.all([
        getEmployees(ctx.restaurantId),
        getShiftCodes(ctx.restaurantId),
      ])
      setEmployees(emps)
      setShiftCodes(codes)
    } catch (err: any) {
      setError(err.message ?? 'Errore nel caricamento dello staff.')
    } finally {
      setIsLoading(false)
    }
  }, [ctx.restaurantId])

  useEffect(() => {
    loadStaffAndCodes()
  }, [loadStaffAndCodes])

  const loadAttendance = useCallback(async () => {
    setLoadingAtt(true)
    try {
      const data = await getAttendance(ctx.restaurantId, viewMode === '7' ? 7 : 30)
      setAttendance(data)
    } catch (err: any) {
      setError(err.message ?? 'Errore nel caricamento delle presenze.')
    } finally {
      setLoadingAtt(false)
    }
  }, [ctx.restaurantId, viewMode])

  useEffect(() => {
    loadAttendance()
  }, [loadAttendance])

  const handleGenerate = async (empId: string) => {
    setGenerating(empId)
    setError(null)
    setSuccessMsg(null)
    try {
      const code = await generateShiftCode(ctx.restaurantId, empId)
      setSuccessMsg(`Codice ${code} generato con successo.`)
      await loadStaffAndCodes()
    } catch (err: any) {
      setError(err.message ?? 'Errore nella generazione del codice.')
    } finally {
      setGenerating(null)
    }
  }

  const handleCopy = async (c: ShiftCode) => {
    await navigator.clipboard.writeText(c.code)
    setCopiedId(c.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const empById = new Map(employees.map((e) => [e.id, e]))
  const activeCodeByEmp = new Map<string, ShiftCode>()
  for (const c of shiftCodes) {
    if (c.is_active && !activeCodeByEmp.has(c.profile_id)) activeCodeByEmp.set(c.profile_id, c)
  }
  const attendanceByDay = new Map<string, AttendanceRow[]>()
  for (const row of attendance) {
    const list = attendanceByDay.get(row.work_date) ?? []
    list.push(row)
    attendanceByDay.set(row.work_date, list)
  }
  const sortedDays = [...attendanceByDay.keys()].sort((a, b) => b.localeCompare(a))

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-tt-pink/30 border-t-tt-pink" />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-tt-danger/20 bg-tt-danger/10 px-4 py-3 text-sm text-tt-danger">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-3 rounded-2xl border border-tt-success/20 bg-tt-success/10 px-4 py-3 text-sm text-tt-success">
          <CheckCircle className="h-5 w-5 shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Codice turno */}
      <div className="tt-card animate-ttFadeUp overflow-hidden rounded-3xl border border-tt-line shadow-tt">
        <div className="flex items-center gap-3 border-b border-tt-line px-4 py-4 sm:px-6">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-amber to-brand-terra text-white">
            <KeyRound className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-tt-ink">Codice turno</h3>
            <p className="text-xs text-tt-muted">Richiesto al login per cameriere/cucina · un codice fisso per account</p>
          </div>
        </div>
        <div className="space-y-2.5 px-4 py-5 sm:px-6">
          {employees.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-tt-line bg-tt-surfaceAlt py-8 text-center">
              <Users className="mx-auto mb-2 h-8 w-8 text-tt-muted opacity-50" />
              <p className="text-sm text-tt-muted">Nessun account cameriere/cucina registrato</p>
            </div>
          ) : (
            employees.map((e) => {
              const c = activeCodeByEmp.get(e.id)
              return (
                <div
                  key={e.id}
                  className="flex flex-col gap-3 rounded-2xl border border-tt-line bg-tt-surfaceAlt px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-tt-ink">
                        {e.first_name} {e.last_name}
                      </span>
                      <span className="rounded-full bg-tt-pink/10 px-2 py-0.5 text-[10px] font-bold text-tt-pink">
                        {ROLE_LABELS[e.role]}
                      </span>
                    </div>
                    {c ? (
                      <p className="mt-1">
                        <span className="block font-mono text-base font-bold tracking-widest text-tt-ink">{c.code}</span>
                        {c.last_used_at && (
                          <span className="block text-xs text-tt-muted">ultimo accesso {formatDateTime(c.last_used_at)}</span>
                        )}
                      </p>
                    ) : (
                      <p className="mt-0.5 text-xs text-tt-muted">Nessun codice associato</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {c && (
                      <button
                        onClick={() => handleCopy(c)}
                        className="flex items-center gap-1.5 rounded-full border border-tt-line bg-white px-3 py-1.5 text-xs font-semibold text-tt-muted transition hover:border-tt-pink/30 hover:bg-tt-pink/10 hover:text-tt-pink"
                      >
                        {copiedId === c.id ? (
                          <>
                            <CheckCircle className="h-3.5 w-3.5 text-tt-success" />
                            Copiato
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            Copia
                          </>
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => handleGenerate(e.id)}
                      disabled={generating === e.id}
                      className="flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-amber to-brand-terra px-3 py-1.5 text-xs font-bold text-white shadow-tt transition hover:shadow-ttHover disabled:opacity-60"
                    >
                      {generating === e.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <KeyRound className="h-3.5 w-3.5" />
                      )}
                      {c ? 'Rigenera' : 'Genera'}
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Presenze */}
      <div className="tt-card animate-ttFadeUp overflow-hidden rounded-3xl border border-tt-line shadow-tt">
        <div className="flex flex-col gap-3 border-b border-tt-line px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-amber to-brand-terra text-white">
              <Clock className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-tt-ink">Presenze</h3>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-tt-surfaceAlt2 p-1">
            {(
              [
                ['7', '7 giorni'],
                ['30', '30 giorni'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setViewMode(key)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
                  viewMode === key ? 'bg-tt-pink/15 text-tt-pink' : 'text-tt-muted hover:opacity-80'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="px-4 py-5 sm:px-6">
          {loadingAtt ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-tt-pink" />
            </div>
          ) : sortedDays.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-tt-line bg-tt-surfaceAlt py-10 text-center">
              <Clock className="mx-auto mb-2 h-8 w-8 text-tt-muted opacity-50" />
              <p className="text-sm text-tt-muted">Nessuna presenza in questo periodo</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedDays.map((day) => (
                <div key={day}>
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.15em] text-tt-muted">
                    {new Date(day).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                  <div className="divide-y divide-tt-line/60 overflow-hidden rounded-2xl border border-tt-line">
                    {(attendanceByDay.get(day) ?? []).map((row) => {
                      const emp = empById.get(row.profile_id)
                      return (
                        <div key={row.id} className="flex items-center justify-between px-4 py-3 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-tt-ink">
                              {emp ? `${emp.first_name} ${emp.last_name}` : '—'}
                            </span>
                            {emp && (
                              <span className="rounded-full bg-tt-pink/10 px-2 py-0.5 text-[10px] font-bold text-tt-pink">
                                {ROLE_LABELS[emp.role]}
                              </span>
                            )}
                          </div>
                          <span className="font-mono text-tt-muted">{formatTime(row.clock_in_at)}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

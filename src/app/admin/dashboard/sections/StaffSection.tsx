'use client'

import { useEffect, useState } from 'react'
import { Plus, Users, Shield, UtensilsCrossed, MoreHorizontal, AlertCircle, X, Check, Loader2, Copy, UserCog, Trash2 } from 'lucide-react'
import type { RestaurantCtx, ThemeMode } from '../types'
import { supabase } from '@/lib/supabase'
import {
  getStaffMembers,
  getStaffCount,
  createStaffInvite,
  type StaffMember,
} from '@/lib/admin-service'

interface Props {
  ctx: RestaurantCtx
  theme: ThemeMode
}

const roleMeta: Record<string, { cls: string; icon: typeof Shield; label: string }> = {
  admin: { cls: 'bg-tt-pink/15 text-tt-pink', icon: Shield, label: 'Proprietario' },
  titolare: { cls: 'bg-tt-pink/15 text-tt-pink', icon: Shield, label: 'Proprietario' },
  manager: { cls: 'bg-tt-pinkSoft/15 text-tt-pinkSoft', icon: Shield, label: 'Manager' },
  cameriere: { cls: 'bg-tt-cyan/15 text-tt-cyan', icon: UtensilsCrossed, label: 'Cameriere' },
  cucina: { cls: 'bg-tt-warning/15 text-tt-warning', icon: UtensilsCrossed, label: 'Cucina' },
  staff: { cls: 'bg-tt-muted/15 text-tt-muted', icon: Users, label: 'Staff' },
}

const inviteRoles: { id: 'manager' | 'cameriere' | 'cucina'; label: string }[] = [
  { id: 'manager', label: 'Manager' },
  { id: 'cameriere', label: 'Cameriere' },
  { id: 'cucina', label: 'Cucina' },
]

export function StaffSection({ ctx }: Props) {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteRole, setInviteRole] = useState<'manager' | 'cameriere' | 'cucina'>('cameriere')
  const [generating, setGenerating] = useState(false)
  const [generatedCode, setGeneratedCode] = useState<string | null>(null)
  const [copiedCode, setCopiedCode] = useState(false)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [actionMsg, setActionMsg] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    Promise.all([getStaffMembers(ctx.restaurantId), getStaffCount(ctx.restaurantId)])
      .then(([members, c]) => {
        if (active) {
          setStaff(members)
          setCount(c)
          setLoading(false)
        }
      })
      .catch((e) => {
        if (active) {
          setError(e.message ?? 'Errore nel caricamento staff')
          setLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [ctx.restaurantId])

  async function handleGenerateInvite() {
    setGenerating(true)
    setError(null)
    setGeneratedCode(null)
    try {
      const code = await createStaffInvite(ctx.restaurantId, inviteRole)
      setGeneratedCode(code)
    } catch (e: any) {
      setError(e.message ?? 'Errore nella generazione del codice invito')
    } finally {
      setGenerating(false)
    }
  }

  async function copyInviteCode() {
    if (!generatedCode) return
    await navigator.clipboard.writeText(generatedCode)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  async function changeRole(member: StaffMember, newRole: string) {
    setOpenMenu(null)
    try {
      const { error: e } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', member.id)
      if (e) throw e
      setStaff((prev) => prev.map((m) => (m.id === member.id ? { ...m, role: newRole as any } : m)))
      setActionMsg(`Ruolo di ${member.first_name} aggiornato a ${roleMeta[newRole]?.label ?? newRole}`)
      setTimeout(() => setActionMsg(null), 3000)
    } catch (e: any) {
      setError(e.message ?? 'Errore aggiornamento ruolo')
    }
  }

  async function removeMember(member: StaffMember) {
    setOpenMenu(null)
    if (!confirm(`Rimuovere ${member.first_name} ${member.last_name} dallo staff?`)) return
    try {
      // set restaurant_id to null to detach from restaurant
      const { error: e } = await supabase
        .from('profiles')
        .update({ restaurant_id: null })
        .eq('id', member.id)
      if (e) throw e
      setStaff((prev) => prev.filter((m) => m.id !== member.id))
      setActionMsg(`${member.first_name} rimosso dallo staff`)
      setTimeout(() => setActionMsg(null), 3000)
    } catch (e: any) {
      setError(e.message ?? 'Errore rimozione membro')
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-7 w-32 tt-skeleton rounded-full" />
        <div className="tt-card overflow-hidden rounded-2xl border border-tt-line shadow-tt">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 border-t border-tt-line p-4 first:border-t-0">
              <div className="h-11 w-11 tt-skeleton rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 tt-skeleton rounded-full" />
                <div className="h-3 w-1/2 tt-skeleton rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error && staff.length === 0) {
    return (
      <div className="grid place-items-center py-16 text-center">
        <AlertCircle className="mb-3 h-10 w-10 text-tt-danger" />
        <p className="text-sm font-bold text-tt-ink">Errore</p>
        <p className="mt-1 max-w-xs text-xs text-tt-muted">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-serif text-xl font-extrabold text-tt-ink">Staff</h2>
          <p className="text-xs text-tt-muted">
            {staff.length} membri totali · {count} attivi
          </p>
        </div>
        <button
          onClick={() => { setShowInvite(true); setGeneratedCode(null); setError(null) }}
          className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-brand-amber to-brand-terra px-4 py-2 text-sm font-bold text-white shadow-glow-amber transition hover:scale-105"
        >
          <Plus className="h-4 w-4" /> Invita membro
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-tt-danger/30 bg-tt-danger/10 px-3 py-2 text-xs text-tt-danger">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      {actionMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-tt-success/30 bg-tt-success/10 px-3 py-2 text-xs text-tt-success">
          <Check className="h-4 w-4 shrink-0" /> {actionMsg}
        </div>
      )}

      {staff.length === 0 ? (
        <div className="tt-card rounded-2xl border border-dashed border-tt-line p-10 text-center shadow-tt">
          <Users className="mx-auto mb-3 h-10 w-10 text-tt-muted opacity-50" />
          <p className="text-sm font-bold text-tt-ink">Nessun membro staff</p>
          <p className="mt-1 text-xs text-tt-muted">Invita il primo membro con "Invita membro"</p>
        </div>
      ) : (
        <div className="tt-card overflow-hidden rounded-2xl border border-tt-line shadow-tt">
          {staff.map((m, i) => {
            const role = roleMeta[m.role] ?? roleMeta['staff']
            const RoleIcon = role.icon
            const initials = [m.first_name?.[0], m.last_name?.[0]].filter(Boolean).join('').toUpperCase() || '??'
            return (
              <div key={m.id} className={`relative flex items-center gap-3 p-4 transition-colors hover:bg-tt-surfaceAlt2 ${i > 0 ? 'border-t border-tt-line' : ''}`}>
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-amber to-brand-terra text-sm font-bold text-white">
                  {initials}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-bold text-tt-ink">
                      {[m.first_name, m.last_name].filter(Boolean).join(' ') || 'Senza nome'}
                    </p>
                    <span className={`tt-pill ${role.cls}`}>
                      <RoleIcon className="h-3 w-3" /> {role.label}
                    </span>
                  </div>
                  <p className="truncate text-xs text-tt-muted">{m.email}</p>
                </div>
                <div className="relative shrink-0">
                  <button
                    onClick={() => setOpenMenu(openMenu === m.id ? null : m.id)}
                    className="grid h-8 w-8 place-items-center rounded-lg text-tt-muted transition hover:bg-tt-surfaceAlt2 hover:text-tt-ink"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                  {openMenu === m.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />
                      <div className="absolute right-0 top-9 z-20 w-48 overflow-hidden rounded-xl border border-tt-line bg-white py-1 shadow-xl">
                        <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-tt-muted">Cambia ruolo</p>
                        {(['manager', 'cameriere', 'cucina'] as const).map((r) => (
                          <button
                            key={r}
                            onClick={() => changeRole(m, r)}
                            disabled={m.role === r}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-tt-ink transition hover:bg-tt-surfaceAlt2 disabled:opacity-40"
                          >
                            <UserCog className="h-3.5 w-3.5 text-tt-muted" /> {roleMeta[r].label}
                            {m.role === r && <Check className="ml-auto h-3.5 w-3.5 text-tt-success" />}
                          </button>
                        ))}
                        <div className="my-1 border-t border-tt-line" />
                        <button
                          onClick={() => removeMember(m)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-tt-danger transition hover:bg-tt-danger/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Rimuovi dallo staff
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Invite modal */}
      {showInvite && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setShowInvite(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-serif text-lg font-extrabold text-tt-ink">Invita membro</h3>
              <button
                onClick={() => setShowInvite(false)}
                className="grid h-8 w-8 place-items-center rounded-full bg-tt-surfaceAlt2 text-tt-muted transition hover:text-tt-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {!generatedCode ? (
              <>
                <p className="mb-4 text-sm text-tt-muted">
                  Genera un codice invito (valido 5 minuti). Il nuovo membro dovrà registrarsi con questo codice.
                </p>
                <label className="mb-2 block text-xs font-bold text-tt-ink">Ruolo</label>
                <div className="mb-4 flex gap-2">
                  {inviteRoles.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setInviteRole(r.id)}
                      className={`flex-1 rounded-xl border-2 px-3 py-2 text-sm font-bold transition ${
                        inviteRole === r.id
                          ? 'border-tt-pink bg-tt-pink/10 text-tt-pink'
                          : 'border-tt-line bg-white text-tt-muted hover:text-tt-ink'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleGenerateInvite}
                  disabled={generating}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-amber to-brand-terra py-3 text-sm font-bold text-white shadow-glow-amber transition hover:scale-105 disabled:opacity-60"
                >
                  {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Genera codice invito
                </button>
              </>
            ) : (
              <>
                <div className="rounded-2xl border border-tt-success/30 bg-tt-success/10 p-4 text-center">
                  <Check className="mx-auto mb-2 h-8 w-8 text-tt-success" />
                  <p className="text-xs text-tt-muted">Codice invito generato (ruolo: {roleMeta[inviteRole].label})</p>
                  <p className="mt-2 font-mono text-2xl font-black tracking-widest text-tt-ink">{generatedCode}</p>
                  <p className="mt-1 text-[11px] text-tt-muted">Scade tra 5 minuti</p>
                </div>
                <button
                  onClick={copyInviteCode}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-amber to-brand-terra py-3 text-sm font-bold text-white shadow-glow-amber transition hover:scale-105"
                >
                  {copiedCode ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copiedCode ? 'Copiato!' : 'Copia codice'}
                </button>
                <button
                  onClick={() => { setGeneratedCode(null); setCopiedCode(false) }}
                  className="mt-2 w-full rounded-full border border-tt-line bg-white py-2.5 text-sm font-bold text-tt-muted transition hover:text-tt-ink"
                >
                  Genera un altro codice
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

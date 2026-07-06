'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Users, Shield, UtensilsCrossed, MoreHorizontal, AlertCircle, X, Check, Loader2, Copy, UserCog, Trash2, UserPlus } from 'lucide-react'
import type { RestaurantCtx, ThemeMode } from '../types'
import { supabase } from '@/lib/supabase'
import {
  getStaffMembers,
  getStaffCount,
  createStaffInvite,
  type StaffMember,
} from '@/lib/admin-service'
import { useI18n } from '@/components/i18n/I18nProvider'

interface Props {
  ctx: RestaurantCtx
  theme: ThemeMode
}

const roleCls: Record<string, { cls: string; icon: typeof Shield; border: string }> = {
  admin: { cls: 'bg-tt-pink/15 text-tt-pink', icon: Shield, border: 'var(--color-tt-pink)' },
  titolare: { cls: 'bg-tt-pink/15 text-tt-pink', icon: Shield, border: 'var(--color-tt-pink)' },
  manager: { cls: 'bg-tt-pinkSoft/15 text-tt-pinkSoft', icon: Shield, border: 'var(--color-tt-pinkSoft)' },
  cameriere: { cls: 'bg-tt-cyan/15 text-tt-cyan', icon: UtensilsCrossed, border: 'var(--color-tt-cyan)' },
  cucina: { cls: 'bg-tt-warning/15 text-tt-warning', icon: UtensilsCrossed, border: 'var(--color-tt-warning)' },
  staff: { cls: 'bg-tt-muted/15 text-tt-muted', icon: Users, border: 'var(--color-tt-muted)' },
}

export function StaffSection({ ctx }: Props) {
  const { tr } = useI18n()
  const T = tr.admin.staff
  const roleMeta: Record<string, { cls: string; icon: typeof Shield; label: string; border: string }> = Object.fromEntries(
    Object.entries(roleCls).map(([k, v]) => [k, { ...v, label: (T.roles as Record<string, string>)[k] ?? k }])
  )
  const inviteRoles: { id: 'manager' | 'cameriere' | 'cucina'; label: string }[] = [
    { id: 'manager', label: T.roles.manager },
    { id: 'cameriere', label: T.roles.cameriere },
    { id: 'cucina', label: T.roles.cucina },
  ]
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [errorClosing, setErrorClosing] = useState(false)
  const dismissError = () => {
    setErrorClosing(true)
    setTimeout(() => { setError(null); setErrorClosing(false) }, 200)
  }
  useEffect(() => {
    if (!error) return
    setErrorClosing(false)
    const t = setTimeout(dismissError, 5000)
    return () => clearTimeout(t)
  }, [error])
  const [showInvite, setShowInvite] = useState(false)
  const [inviteRole, setInviteRole] = useState<'manager' | 'cameriere' | 'cucina'>('cameriere')
  const [generating, setGenerating] = useState(false)
  const [generatedCode, setGeneratedCode] = useState<string | null>(null)
  const [copiedCode, setCopiedCode] = useState(false)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [closingMenu, setClosingMenu] = useState<string | null>(null)
  const [menuFlip, setMenuFlip] = useState(false)
  const closeMenu = () => {
    if (!openMenu) return
    setClosingMenu(openMenu)
    setOpenMenu(null)
    setTimeout(() => setClosingMenu(null), 200)
  }
  const toggleMenu = (id: string, e: React.MouseEvent<HTMLButtonElement>) => {
    if (openMenu === id) { closeMenu(); return }
    const rect = e.currentTarget.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    setMenuFlip(spaceBelow < 260)
    setClosingMenu(null); setOpenMenu(id)
  }
  const [actionMsg, setActionMsg] = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState<StaffMember | null>(null)
  const [removing, setRemoving] = useState(false)

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
          setError(e.message ?? T.errorLoad)
          setLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [ctx.restaurantId])

  async function handleGenerateInvite() {
    if (ctx.maxStaff != null && staff.length >= ctx.maxStaff) {
      setError(T.staffLimitReached(ctx.maxStaff))
      return
    }
    setGenerating(true)
    setError(null)
    setGeneratedCode(null)
    try {
      const code = await createStaffInvite(ctx.restaurantId, inviteRole)
      setGeneratedCode(code)
    } catch (e: any) {
      setError(e.message ?? T.errorGenerateCode)
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
      setActionMsg(T.roleUpdated(member.first_name ?? T.noName, roleMeta[newRole]?.label ?? newRole))
      setTimeout(() => setActionMsg(null), 3000)
    } catch (e: any) {
      setError(e.message ?? T.errorUpdateRole)
    }
  }

  async function removeMember(member: StaffMember) {
    setRemoving(true)
    try {
      // set restaurant_id to null to detach from restaurant
      const { error: e } = await supabase
        .from('profiles')
        .update({ restaurant_id: null })
        .eq('id', member.id)
      if (e) throw e
      setStaff((prev) => prev.filter((m) => m.id !== member.id))
      setActionMsg(T.memberRemoved(member.first_name ?? T.noName))
      setTimeout(() => setActionMsg(null), 3000)
      setConfirmRemove(null)
    } catch (e: any) {
      setError(e.message ?? T.errorRemoveMember)
    } finally {
      setRemoving(false)
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
        <p className="text-sm font-bold text-tt-ink">{T.error}</p>
        <p className="mt-1 max-w-xs text-xs text-tt-muted">{error}</p>
      </div>
    )
  }

  const limitReached = ctx.maxStaff != null && staff.length >= ctx.maxStaff

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-serif text-xl font-extrabold text-tt-ink">{T.title}</h2>
          <p className="text-xs text-tt-muted">
            {T.countF(staff.length, count)}{ctx.maxStaff != null ? ` · ${T.staffLimitOf(ctx.maxStaff)}` : ''} · {T.ownerExcluded}
          </p>
        </div>
        <button
          onClick={() => { if (limitReached) { setError(T.staffLimitReached(ctx.maxStaff!)); return }; setShowInvite(true); setGeneratedCode(null); setError(null) }}
          disabled={limitReached}
          className="flex w-full items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-brand-amber to-brand-terra px-4 py-2 text-sm font-bold text-white shadow-glow-amber transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 sm:w-auto"
        >
          <Plus className="h-4 w-4 shrink-0" /> {T.inviteMember}
        </button>
      </div>

      {error && (
        <div className={`pointer-events-none fixed inset-x-0 top-4 z-[60] flex justify-center px-4 ${errorClosing ? 'animate-ttFadeOut' : 'animate-ttFadeUp'}`}>
          <div className="pointer-events-auto flex max-w-sm items-start gap-2 rounded-2xl border border-tt-danger/30 bg-white/95 px-4 py-3 text-sm text-tt-danger shadow-tt backdrop-blur-xl">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={dismissError} className="text-tt-danger/70 hover:text-tt-danger">
              <X className="h-4 w-4" />
            </button>
          </div>
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
          <p className="text-sm font-bold text-tt-ink">{T.emptyDb}</p>
          <p className="mt-1 text-xs text-tt-muted">{T.emptyDbHint}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {(['admin', 'manager', 'cucina', 'cameriere', 'staff'] as const).map((bucket) => {
            const bucketMembers = staff.filter((m) => {
              if (bucket === 'admin') return m.role === 'admin' || m.role === 'titolare' || m.role === 'owner'
              if (bucket === 'cucina') return m.role === 'cucina' || m.role === 'kitchen'
              if (bucket === 'cameriere') return m.role === 'cameriere' || m.role === 'waiter'
              return m.role === bucket
            })
            const bucketMeta = roleMeta[bucket] ?? roleMeta['staff']
            const BucketIcon = bucketMeta.icon
            if (bucketMembers.length === 0) {
              if (bucket !== 'manager' && bucket !== 'cameriere' && bucket !== 'cucina') return null
              const emptyCopy = {
                manager: { title: T.noManager, hint: T.addManagerHint },
                cameriere: { title: T.noCameriere, hint: T.addCameriereHint },
                cucina: { title: T.noCucina, hint: T.addCucinaHint },
              }[bucket]
              return (
                <div key={bucket}>
                  <div className="mb-2 flex items-center gap-2 px-1">
                    <span className={`tt-pill ${bucketMeta.cls}`}>
                      <BucketIcon className="h-3 w-3" /> {bucketMeta.label}
                    </span>
                    <span className="text-xs text-tt-muted">0</span>
                  </div>
                  <button
                    onClick={() => { if (limitReached) { setError(T.staffLimitReached(ctx.maxStaff!)); return }; setInviteRole(bucket); setShowInvite(true); setGeneratedCode(null); setError(null) }}
                    style={{ borderColor: bucketMeta.border }}
                    className="tt-card flex w-full items-center gap-3 rounded-2xl border-2 border-dashed p-4 text-left transition hover:bg-tt-surfaceAlt2"
                  >
                    <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${bucketMeta.cls}`}>
                      <BucketIcon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-tt-ink">{emptyCopy.title}</p>
                      <p className="truncate text-xs text-tt-muted">{emptyCopy.hint}</p>
                    </div>
                    <UserPlus className="h-5 w-5 shrink-0 text-tt-pink" />
                  </button>
                </div>
              )
            }
            return (
              <div key={bucket}>
                <div className="mb-2 flex items-center gap-2 px-1">
                  <span className={`tt-pill ${bucketMeta.cls}`}>
                    <BucketIcon className="h-3 w-3" /> {bucketMeta.label}
                  </span>
                  <span className="text-xs text-tt-muted">{bucketMembers.length}</span>
                </div>
                <div style={{ borderColor: bucketMeta.border }} className="tt-card rounded-2xl border-2 shadow-tt">
          {bucketMembers.map((m, i, arr) => {
            const role = roleMeta[m.role] ?? roleMeta['staff']
            const RoleIcon = role.icon
            const initials = [m.first_name?.[0], m.last_name?.[0]].filter(Boolean).join('').toUpperCase() || '??'
            return (
              <div key={m.id} className={`relative flex items-center gap-3 p-4 transition-colors hover:bg-tt-surfaceAlt2 ${i > 0 ? 'border-t border-tt-line' : ''} ${i === 0 ? 'rounded-t-2xl' : ''} ${i === arr.length - 1 ? 'rounded-b-2xl' : ''}`}>
                {m.avatar_url ? (
                  <img
                    src={m.avatar_url}
                    alt={initials}
                    className="h-11 w-11 shrink-0 rounded-full border-2 border-tt-pink object-cover shadow-tt"
                  />
                ) : (
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-tt-pink bg-gradient-to-br from-brand-amber to-brand-terra text-sm font-bold text-white">
                    {initials}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="min-w-0 flex-1 truncate text-sm font-bold text-tt-ink">
                      {[m.first_name, m.last_name].filter(Boolean).join(' ') || T.noName}
                    </p>
                    <span className={`tt-pill shrink-0 ${role.cls}`}>
                      <RoleIcon className="h-3 w-3" /> {role.label}
                    </span>
                  </div>
                  <p className="truncate text-xs text-tt-muted">{m.email}</p>
                </div>
                <div className="relative shrink-0">
                  {m.role !== 'owner' && m.role !== 'titolare' && m.role !== 'admin' && (<>
                  <button
                    onClick={(e) => toggleMenu(m.id, e)}
                    className="grid h-8 w-8 place-items-center rounded-lg text-tt-muted transition hover:bg-tt-surfaceAlt2 hover:text-tt-ink"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                  {(openMenu === m.id || closingMenu === m.id) && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={closeMenu} />
                      <div className={`absolute right-0 ${menuFlip ? 'bottom-9' : 'top-9'} z-20 w-48 origin-top-right overflow-hidden rounded-xl border border-tt-line bg-white py-1 shadow-xl ${closingMenu === m.id ? 'animate-ttFadeOut' : 'animate-ttFadeUp'}`}>
                        <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-tt-muted">{T.changeRole}</p>
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
                          onClick={() => { closeMenu(); setConfirmRemove(m) }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-tt-danger transition hover:bg-tt-danger/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> {T.removeFromStaff}
                        </button>
                      </div>
                    </>
                  )}
                  </>)}
                </div>
              </div>
            )
          })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Invite modal */}
      <AnimatePresence>
      {showInvite && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setShowInvite(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-serif text-lg font-extrabold text-tt-ink">{T.inviteMember}</h3>
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
                  {T.generateNote}
                </p>
                <label className="mb-2 block text-xs font-bold text-tt-ink">{T.role}</label>
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
                  {T.generateCode}
                </button>
              </>
            ) : (
              <>
                <div className="rounded-2xl border border-tt-success/30 bg-tt-success/10 p-4 text-center">
                  <Check className="mx-auto mb-2 h-8 w-8 text-tt-success" />
                  <p className="text-xs text-tt-muted">{T.codeGenerated(roleMeta[inviteRole].label)}</p>
                  <p className="mt-2 font-mono text-2xl font-black tracking-widest text-tt-ink">{generatedCode}</p>
                  <p className="mt-1 text-[11px] text-tt-muted">{T.expiresIn5}</p>
                </div>
                <button
                  onClick={copyInviteCode}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-amber to-brand-terra py-3 text-sm font-bold text-white shadow-glow-amber transition hover:scale-105"
                >
                  {copiedCode ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copiedCode ? T.copied : T.copyCode}
                </button>
                <button
                  onClick={() => { setGeneratedCode(null); setCopiedCode(false) }}
                  className="mt-2 w-full rounded-full border border-tt-line bg-white py-2.5 text-sm font-bold text-tt-muted transition hover:text-tt-ink"
                >
                  {T.generateAnother}
                </button>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Remove member confirmation */}
      {confirmRemove && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => !removing && setConfirmRemove(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"
          >
            <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-tt-danger/10 text-tt-danger">
              <Trash2 className="h-5 w-5" />
            </div>
            <h3 className="mb-1 font-serif text-lg font-extrabold text-tt-ink">{T.removeMemberTitle}</h3>
            <p className="mb-5 text-sm text-tt-muted">
              {T.confirmRemove(`${confirmRemove.first_name ?? ''} ${confirmRemove.last_name ?? ''}`.trim() || T.noName)}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmRemove(null)}
                disabled={removing}
                className="h-11 flex-1 rounded-full border border-tt-line bg-white text-sm font-bold text-tt-muted transition hover:text-tt-ink disabled:opacity-60"
              >
                {T.cancel}
              </button>
              <button
                onClick={() => removeMember(confirmRemove)}
                disabled={removing}
                className="flex h-11 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-tt-danger px-3 text-sm font-bold text-white shadow-tt transition hover:scale-105 disabled:opacity-60"
              >
                {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                <span className="truncate">{T.removeFromStaff}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

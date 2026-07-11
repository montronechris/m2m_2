'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Settings, Bell, Volume2, Globe, Shield, LogOut, ChevronRight, Check, X, Loader2, UserCog, Camera, KeyRound, AlertCircle } from 'lucide-react'
import type { RestaurantCtx, ThemeMode } from '../types'
import {
  getRestaurantSettings,
  updateNotificationPrefs,
  updateUserProfile,
  uploadUserAvatar,
  updateUserPassword,
  signOut,
  type RestaurantSettings,
} from '@/lib/admin-service'
import { isNotificationSoundMuted, setNotificationSoundMuted } from '@/lib/notificationSound'
import { useI18n } from '@/components/i18n/I18nProvider'

interface Props {
  ctx: RestaurantCtx
  theme: ThemeMode
}

export function SettingsSection({ ctx }: Props) {
  const router = useRouter()
  const { lang, setLang, tr } = useI18n()
  const t = tr.admin.settings
  const [data, setData] = useState<RestaurantSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [soundOn, setSoundOn] = useState(true)
  const [twoFA, setTwoFA] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showPlan, setShowPlan] = useState(false)
  const [actionMsg, setActionMsg] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    getRestaurantSettings(ctx.restaurantId)
      .then((d) => {
        if (active) setData(d)
      })
      .catch((e) => {
        if (active) setError(e.message ?? t.errorLoad)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    setSoundOn(!isNotificationSoundMuted())
    return () => {
      active = false
    }
  }, [ctx.restaurantId])

  async function togglePref(key: 'admin' | 'cameriere') {
    if (!data) return
    const next = { ...data.notification_prefs, [key]: !data.notification_prefs[key] }
    setData({ ...data, notification_prefs: next })
    setSaving(true)
    try {
      await updateNotificationPrefs(ctx.restaurantId, next)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e: any) {
      setError(e.message ?? t.errorSave)
      setData({ ...data, notification_prefs: data.notification_prefs })
    } finally {
      setSaving(false)
    }
  }

  function toggleSound() {
    const next = !soundOn
    setSoundOn(next)
    setNotificationSoundMuted(!next)
  }

  async function handleLogout() {
    try {
      await signOut()
    } catch {
      /* noop */
    }
    router.push('/login')
  }

  function flash(msg: string) {
    setActionMsg(msg)
    setTimeout(() => setActionMsg(null), 3000)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-7 w-32 tt-skeleton rounded-full" />
        <div className="tt-card h-24 rounded-2xl border border-tt-line shadow-tt" />
        <div className="tt-card h-48 rounded-2xl border border-tt-line shadow-tt" />
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="grid place-items-center py-16 text-center">
        <p className="text-sm font-bold text-tt-ink">{t.error}</p>
        <p className="mt-1 max-w-xs text-xs text-tt-muted">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-brand-amber to-brand-terra text-white shadow-glow-amber">
          <Settings className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-serif text-xl font-extrabold text-tt-ink">{t.title}</h2>
          <p className="text-xs text-tt-muted">{t.subtitle}</p>
        </div>
      </div>

      {actionMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-tt-success/30 bg-tt-success/10 px-3 py-2 text-xs text-tt-success">
          <Check className="h-4 w-4 shrink-0" /> {actionMsg}
        </div>
      )}

      {/* Account card */}
      <div className="tt-card-pink flex items-center gap-4 rounded-2xl p-5 shadow-tt">
        {ctx.userAvatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={ctx.userAvatarUrl}
            alt=""
            className="h-14 w-14 rounded-full object-cover shadow-tt"
          />
        ) : (
          <span className="tt-avatar h-14 w-14 text-lg shadow-tt">
            {ctx.userFirstName[0]}
            {ctx.userLastName[0]}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-tt-ink">
            {ctx.userFirstName} {ctx.userLastName}
          </p>
          <p className="truncate text-xs text-tt-muted">{ctx.userEmail}</p>
          <p className="text-[11px] text-tt-muted">
            {ctx.restaurantName} · {ctx.role}
          </p>
        </div>
        <button
          onClick={() => setShowProfile(true)}
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r from-brand-amber to-brand-terra px-3 py-2 text-xs font-bold text-white shadow-glow-amber transition hover:scale-105"
        >
          <UserCog className="h-3.5 w-3.5" /> {t.edit}
        </button>
      </div>

      {/* Notifications */}
      <div className="tt-card overflow-hidden rounded-2xl border border-tt-line shadow-tt">
        <div className="flex items-center justify-between border-b border-tt-line px-4 py-2.5">
          <p className="text-xs font-bold uppercase tracking-wide text-tt-muted">{t.notifications}</p>
          {saved && (
            <span className="flex items-center gap-1 text-xs font-bold text-tt-success">
              <Check className="h-3 w-3" /> {t.savedShort}
            </span>
          )}
        </div>
        {[
          {
            icon: Bell,
            label: t.notifAdmin,
            desc: t.notifAdminDesc,
            val: data?.notification_prefs.admin ?? true,
            onClick: () => togglePref('admin'),
          },
          {
            icon: Bell,
            label: t.notifStaff,
            desc: t.notifStaffDesc,
            val: data?.notification_prefs.cameriere ?? true,
            onClick: () => togglePref('cameriere'),
          },
          {
            icon: Volume2,
            label: t.notifSound,
            desc: t.notifSoundDesc,
            val: soundOn,
            onClick: toggleSound,
          },
        ].map((row, i) => {
          const Icon = row.icon
          return (
            <div key={row.label} className={`flex items-center gap-3 px-4 py-3.5 ${i > 0 ? 'border-t border-tt-line' : ''}`}>
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-tt-surfaceAlt2 text-tt-pink">
                <Icon className="h-4 w-4" />
              </span>
              <div className="flex-1">
                <p className="text-sm font-bold text-tt-ink">{row.label}</p>
                <p className="text-xs text-tt-muted">{row.desc}</p>
              </div>
              <span className="mr-2 text-xs font-bold text-tt-muted">{row.val ? 'ON' : 'OFF'}</span>
              <button
                onClick={row.onClick}
                disabled={saving}
                role="switch"
                aria-checked={row.val}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                  row.val ? 'bg-gradient-to-r from-brand-amber to-brand-terra' : 'bg-tt-line'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                    row.val ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          )
        })}
      </div>

      {/* Security & preferences */}
      <div className="tt-card overflow-hidden rounded-2xl border border-tt-line shadow-tt">
        <p className="border-b border-tt-line px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-tt-muted">
          {t.securityPrefs}
        </p>
        <div className="flex items-center gap-3 border-b border-tt-line px-4 py-3.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-tt-surfaceAlt2 text-tt-pink">
            <Shield className="h-4 w-4" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-bold text-tt-ink">{t.twoFA}</p>
            <p className="text-xs text-tt-muted">{t.twoFADesc}</p>
          </div>
          <span className="mr-2 text-xs font-bold text-tt-muted">{twoFA ? 'ON' : 'OFF'}</span>
          <button
            onClick={() => setTwoFA((v) => !v)}
            role="switch"
            aria-checked={twoFA}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
              twoFA ? 'bg-gradient-to-r from-brand-emerald to-brand-sky' : 'bg-tt-line'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                twoFA ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
        <div className="flex w-full items-center gap-3 border-b border-tt-line px-4 py-3.5 text-left">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-tt-surfaceAlt2 text-tt-pink">
            <Globe className="h-4 w-4" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-bold text-tt-ink">{t.language}</p>
            <p className="text-xs text-tt-muted">{t.languageDesc}</p>
          </div>
          <div className="flex items-center gap-1 rounded-full border border-tt-line bg-white p-0.5">
            <button
              onClick={() => setLang('it')}
              className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                lang === 'it' ? 'bg-gradient-to-r from-brand-amber to-brand-terra text-white' : 'text-tt-muted'
              }`}
            >
              🇮🇹 IT
            </button>
            <button
              onClick={() => setLang('en')}
              className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                lang === 'en' ? 'bg-gradient-to-r from-brand-amber to-brand-terra text-white' : 'text-tt-muted'
              }`}
            >
              🇬🇧 EN
            </button>
          </div>
        </div>
      </div>

      {/* Plan */}
      {data && (
        <div className="tt-card rounded-2xl border border-tt-line p-5 shadow-tt">
          <p className="tt-section-title">{t.subscription}</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-serif text-lg font-extrabold text-tt-ink">{t.planPrefix} {data.plan ?? '—'}</p>
              <p className="text-xs text-tt-muted">
                {data.accessExpiresAt
                  ? `${t.renewalPrefix} ${new Date(data.accessExpiresAt).toLocaleDateString(t.locale)}`
                  : t.noExpiration}
                {data.maxStaff ? t.staffSeatsSuffix(data.maxStaff) : ''}
              </p>
            </div>
            <button
              onClick={() => setShowPlan(true)}
              className="rounded-full bg-gradient-to-r from-brand-amber to-brand-terra px-4 py-2 text-sm font-bold text-white shadow-glow-amber transition hover:scale-105"
            >
              {t.manage}
            </button>
          </div>
        </div>
      )}

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-tt-danger/30 bg-tt-danger/5 py-3.5 text-sm font-bold text-tt-danger transition hover:bg-tt-danger/10"
      >
        <LogOut className="h-4 w-4" /> {t.logoutBtn}
      </button>

      {/* Profile edit modal */}
      {showProfile && (
        <ProfileEditModal
          ctx={ctx}
          onClose={() => setShowProfile(false)}
          onSaved={(msg) => {
            setShowProfile(false)
            flash(msg)
            // Ricarica per riflettere subito avatar/nome aggiornati in card + sidebar.
            setTimeout(() => window.location.reload(), 900)
          }}
        />
      )}

      {/* Plan management modal */}
      {showPlan && data && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setShowPlan(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between bg-gradient-to-r from-brand-amber to-brand-terra px-5 py-4 text-white">
              <h3 className="font-serif text-lg font-extrabold">{t.managePlan}</h3>
              <button onClick={() => setShowPlan(false)} className="grid h-8 w-8 place-items-center rounded-full bg-white/20">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5">
              <p className="mb-4 text-sm text-tt-muted">{t.currentPlanIntro}</p>
              <div className="mb-4 rounded-2xl border-2 border-tt-pink/30 bg-tt-pink/5 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-serif text-xl font-extrabold text-tt-ink">{t.planPrefix} {data.plan ?? '—'}</p>
                    <p className="text-xs text-tt-muted">
                      {data.accessExpiresAt
                        ? t.activeUntil(new Date(data.accessExpiresAt).toLocaleDateString(t.locale))
                        : t.active}
                    </p>
                  </div>
                  <span className="tt-pill bg-tt-success/15 text-tt-success">{t.active}</span>
                </div>
              </div>
              <div className="space-y-2">
                <button
                  onClick={() => { setShowPlan(false); flash(t.redirectPayment) }}
                  className="flex w-full items-center justify-between rounded-xl border border-tt-line px-4 py-3 text-left transition hover:bg-tt-surfaceAlt2"
                >
                  <div>
                    <p className="text-sm font-bold text-tt-ink">{t.renewSub}</p>
                    <p className="text-xs text-tt-muted">{t.renewSubDesc}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-tt-muted" />
                </button>
                <button
                  onClick={() => { setShowPlan(false); flash(t.salesContact) }}
                  className="flex w-full items-center justify-between rounded-xl border border-tt-line px-4 py-3 text-left transition hover:bg-tt-surfaceAlt2"
                >
                  <div>
                    <p className="text-sm font-bold text-tt-ink">{t.changePlan}</p>
                    <p className="text-xs text-tt-muted">{t.changePlanDesc}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-tt-muted" />
                </button>
                <button
                  onClick={() => { setShowPlan(false); flash(t.invoiceRequested) }}
                  className="flex w-full items-center justify-between rounded-xl border border-tt-line px-4 py-3 text-left transition hover:bg-tt-surfaceAlt2"
                >
                  <div>
                    <p className="text-sm font-bold text-tt-ink">{t.downloadInvoices}</p>
                    <p className="text-xs text-tt-muted">{t.downloadInvoicesDesc}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-tt-muted" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Profile edit modal ──────────────────────────────────────────────────────

function ProfileEditModal({
  ctx,
  onClose,
  onSaved,
}: {
  ctx: RestaurantCtx
  onClose: () => void
  onSaved: (msg: string) => void
}) {
  const { tr } = useI18n()
  const t = tr.admin.settings
  const [firstName, setFirstName] = useState(ctx.userFirstName)
  const [lastName, setLastName] = useState(ctx.userLastName)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const profileUpdates: { first_name?: string; last_name?: string; avatar_url?: string } = {}
      // Update name if changed
      if (firstName !== ctx.userFirstName) profileUpdates.first_name = firstName
      if (lastName !== ctx.userLastName) profileUpdates.last_name = lastName
      // Upload avatar if selected and persist its public URL to the profile.
      // (Prima l'upload avveniva ma l'URL veniva scartato: l'avatar non si salvava.)
      if (avatarFile) {
        try {
          const url = await uploadUserAvatar(avatarFile, ctx.userId)
          if (url) profileUpdates.avatar_url = url
        } catch {
          // storage may not be configured — ignore
        }
      }
      if (Object.keys(profileUpdates).length > 0) {
        await updateUserProfile(ctx.userId, profileUpdates)
      }
      // Update password if provided
      if (newPassword) {
        if (newPassword.length < 6) throw new Error(t.pwTooShort)
        if (newPassword !== confirmPassword) throw new Error(t.pwMismatch)
        await updateUserPassword(newPassword)
      }
      onSaved(t.profileUpdated)
    } catch (e: any) {
      setError(e.message ?? t.errorUpdate)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        <div className="flex shrink-0 items-center justify-between bg-gradient-to-r from-brand-amber to-brand-terra px-5 py-4 text-white">
          <div className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            <h3 className="font-serif text-lg font-extrabold">{t.editProfile}</h3>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full bg-white/20">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {/* Avatar */}
          <div className="mb-5 flex flex-col items-center">
            <div className="relative">
              <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-brand-amber to-brand-terra text-2xl font-bold text-white shadow-glow-amber">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="avatar" className="h-full w-full object-cover" />
                ) : ctx.userAvatarUrl ? (
                  <img src={ctx.userAvatarUrl} alt="avatar" className="h-full w-full object-cover" />
                ) : (
                  (firstName[0] || '?') + (lastName[0] || '')
                )}
              </div>
              <label className="absolute -bottom-1 -right-1 grid h-7 w-7 cursor-pointer place-items-center rounded-full bg-white shadow-lg ring-2 ring-tt-line">
                <Camera className="h-3.5 w-3.5 text-tt-pink" />
                <input type="file" accept="image/*" onChange={handleAvatar} className="hidden" />
              </label>
            </div>
            <p className="mt-2 text-xs text-tt-muted">{t.changePhoto}</p>
          </div>

          {/* Name */}
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-tt-ink">{t.firstName}</label>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-xl border border-tt-line bg-white px-3 py-2.5 text-sm text-tt-ink outline-none focus:border-tt-pink/40"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-tt-ink">{t.lastName}</label>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-xl border border-tt-line bg-white px-3 py-2.5 text-sm text-tt-ink outline-none focus:border-tt-pink/40"
              />
            </div>
          </div>

          {/* Password */}
          <div className="mb-2 flex items-center gap-2 text-xs font-bold text-tt-ink">
            <KeyRound className="h-3.5 w-3.5 text-tt-pink" /> {t.changePasswordOpt}
          </div>
          <div className="mb-3">
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t.newPasswordPh}
              className="w-full rounded-xl border border-tt-line bg-white px-3 py-2.5 text-sm text-tt-ink outline-none focus:border-tt-pink/40"
            />
          </div>
          <div className="mb-4">
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t.confirmNewPasswordPh}
              className="w-full rounded-xl border border-tt-line bg-white px-3 py-2.5 text-sm text-tt-ink outline-none focus:border-tt-pink/40"
            />
          </div>

          {error && (
            <div className="mb-3 flex items-center gap-2 rounded-lg bg-tt-danger/10 px-3 py-2 text-xs text-tt-danger">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}
        </div>

        <div className="flex shrink-0 gap-2 border-t border-tt-line p-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-amber to-brand-terra py-3 text-sm font-bold text-white shadow-glow-amber transition hover:scale-105 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {t.saveChanges}
          </button>
          <button
            onClick={onClose}
            className="rounded-full border border-tt-line bg-white px-5 py-3 text-sm font-bold text-tt-muted transition hover:text-tt-ink"
          >
            {t.cancel}
          </button>
        </div>
      </div>
    </div>
  )
}

'use client'

// ─── SEZIONE: IMPOSTAZIONI ─────────────────────────────────────────────────────
//
// Preferenze account, notifiche, lingua, sicurezza, logout.
// Stato: toggle e form controllati; salva le preferenze e da feedback immediato.
// ──────────────────────────────────────────────────────────────────────────────


import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Settings, Bell, Volume2, Globe, Shield, LogOut, ChevronRight, Check, X, Loader2, UserCog, Camera, KeyRound, AlertCircle, Download, Send, Mail, Phone, ConciergeBell, ChefHat } from 'lucide-react'
import type { RestaurantCtx, ThemeMode } from '../types'
import {
  getRestaurantSettings,
  updateOrderFlowMode,
  updateUserProfile,
  uploadUserAvatar,
  updateUserPasswordSecure,
  getTwoFactorStatus,
  getSecurityPrefs,
  setEmail2FA,
  enrollTwoFactor,
  verifyTwoFactor,
  disableTwoFactor,
  createSubscriptionRequest,
  listMySubscriptionRequests,
  signOut,
  type RestaurantSettings,
  type TwoFactorEnrollment,
} from '@/lib/admin-service'
import { evaluatePassword, PasswordStrength } from '@/components/auth/password-strength'
import {
  isNotificationSoundMuted,
  setNotificationSoundMuted,
  isAdminNotifMuted,
  setAdminNotifMuted,
  isCameriereNotifMuted,
  setCameriereNotifMuted,
} from '@/lib/notificationSound'
import { useI18n } from '@/components/i18n/I18nProvider'
import { DeliveryIntegrationsModal } from './DeliveryIntegrationsModal'
import { sectionsForRole } from '../nav-config'

interface Props {
  ctx: RestaurantCtx
  theme: ThemeMode
}

// Piani disponibili per il cambio abbonamento.
const PLAN_OPTIONS = ['antipasto', 'primo', 'secondo', 'custom'] as const

// Copy locale per la card + modale delle integrazioni delivery.
const DELIVERY_COPY = {
  it: {
    cardTitle: 'Integrazioni delivery',
    cardDesc: 'Collega Glovo, Deliveroo, Uber Eats e altre piattaforme',
    manage: 'Gestisci',
    modal: {
      title: 'Integrazioni delivery',
      intro:
        'Abilita una piattaforma e incolla il Webhook URL e il token nella dashboard partner della piattaforma. Da lì gli ordini arriveranno automaticamente nella sezione Delivery.',
      enabled: 'Abilitata',
      apiKey: 'API key',
      storeId: 'Store ID',
      autoAccept: 'Accetta automaticamente',
      autoAcceptHint: 'I nuovi ordini vengono accettati senza conferma',
      webhookUrl: 'Webhook URL',
      webhookToken: 'Token webhook',
      copy: 'Copia',
      copied: 'Copiato',
      regenerate: 'Rigenera token',
      save: 'Salva',
      saving: 'Salvataggio…',
      saved: 'Integrazione salvata',
      close: 'Chiudi',
      optional: 'opzionale',
    },
  },
  en: {
    cardTitle: 'Delivery integrations',
    cardDesc: 'Connect Glovo, Deliveroo, Uber Eats and other platforms',
    manage: 'Manage',
    modal: {
      title: 'Delivery integrations',
      intro:
        'Enable a platform and paste the Webhook URL and token into the platform partner dashboard. Orders will then flow automatically into the Delivery section.',
      enabled: 'Enabled',
      apiKey: 'API key',
      storeId: 'Store ID',
      autoAccept: 'Auto accept',
      autoAcceptHint: 'New orders are accepted without confirmation',
      webhookUrl: 'Webhook URL',
      webhookToken: 'Webhook token',
      copy: 'Copy',
      copied: 'Copied',
      regenerate: 'Regenerate token',
      save: 'Save',
      saving: 'Saving…',
      saved: 'Integration saved',
      close: 'Close',
      optional: 'optional',
    },
  },
}

// Escape di una cella CSV (delimitatore ';', compatibile con Excel IT).
function csvCell(value: string): string {
  return /[";\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

// Scarica una stringa come file CSV (con BOM per compatibilità Excel).
function downloadCsv(content: string, filename: string) {
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function SettingsSection({ ctx }: Props) {
  const router = useRouter()
  const { lang, setLang, tr } = useI18n()
  const t = tr.admin.settings
  // Ruoli operativi (staff/cameriere/cucina): accesso limitato alle impostazioni.
  // Vedono solo notifiche + sicurezza, l'abbonamento in sola lettura (niente "Gestisci"),
  // e NON vedono modalità di servizio né integrazioni delivery.
  // admin/manager/titolare (sectionsForRole === null) vedono tutto.
  const isStaff = sectionsForRole(ctx.role) !== null
  const [data, setData] = useState<RestaurantSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [soundOn, setSoundOn] = useState(true)
  const [adminNotifOn, setAdminNotifOn] = useState(true)
  const [cameriereNotifOn, setCameriereNotifOn] = useState(true)
  const [twoFA, setTwoFA] = useState(false)
  const [twoFAFactorId, setTwoFAFactorId] = useState<string | null>(null)
  const [twoFABusy, setTwoFABusy] = useState(false)
  const [show2FA, setShow2FA] = useState(false)
  const [emailTwoFA, setEmailTwoFA] = useState(false)
  const [emailTwoFABusy, setEmailTwoFABusy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showPlan, setShowPlan] = useState(false)
  const [showDelivery, setShowDelivery] = useState(false)
  // Toast di stato (popup fisso in basso) con variante success/error.
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [toastOut, setToastOut] = useState(false)
  const toastTimers = useRef<ReturnType<typeof setTimeout>[]>([])
  // Modal Piano: step corrente + selezione cambio piano + stato invio richiesta.
  const [planStep, setPlanStep] = useState<'menu' | 'change'>('menu')
  const [newPlan, setNewPlan] = useState<string>('')
  const [planBusy, setPlanBusy] = useState(false)

  // Modalità di servizio: true = ordini automatici in cucina; false = con cameriere.
  const [autoOrderFlow, setAutoOrderFlow] = useState(true)
  const [savingMode, setSavingMode] = useState(false)

  useEffect(() => {
    let active = true
    getRestaurantSettings(ctx.restaurantId)
      .then((d) => {
        if (active) {
          setData(d)
          setAutoOrderFlow(d.autoOrderFlow)
        }
      })
      .catch((e) => {
        if (active) setError(e.message ?? t.errorLoad)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    // Stato reale della 2FA per questo account (fattori TOTP verificati).
    getTwoFactorStatus()
      .then(({ enabled, factorId }) => {
        if (active) {
          setTwoFA(enabled)
          setTwoFAFactorId(factorId)
        }
      })
      .catch(() => {
        /* se non disponibile, resta disattivata */
      })
    // Preferenza 2FA via email (canale applicativo).
    getSecurityPrefs()
      .then((p) => {
        if (active) setEmailTwoFA(p.email2fa)
      })
      .catch(() => {
        /* se non disponibile, resta disattivata */
      })
    setSoundOn(!isNotificationSoundMuted())
    setAdminNotifOn(!isAdminNotifMuted())
    setCameriereNotifOn(!isCameriereNotifMuted())
    return () => {
      active = false
    }
  }, [ctx.restaurantId])

  // Toggle 2FA: se disattiva apre il modal di configurazione (QR + verifica),
  // se attiva chiede conferma e disabilita il fattore.
  async function handleToggle2FA() {
    if (twoFABusy) return
    if (twoFA) {
      if (!window.confirm(t.twoFADisableConfirm)) return
      setTwoFABusy(true)
      try {
        if (twoFAFactorId) await disableTwoFactor(twoFAFactorId)
        setTwoFA(false)
        setTwoFAFactorId(null)
        flash(t.twoFADisabledMsg)
      } catch (e: any) {
        flash(e.message ?? t.error)
      } finally {
        setTwoFABusy(false)
      }
    } else {
      setShow2FA(true)
    }
  }

  async function handleToggleEmail2FA() {
    if (emailTwoFABusy) return
    const next = !emailTwoFA
    setEmailTwoFABusy(true)
    try {
      await setEmail2FA(next)
      setEmailTwoFA(next)
      flash(next ? t.emailTwoFAEnabledMsg : t.emailTwoFADisabledMsg)
    } catch (e: any) {
      flash(e.message ?? t.error, 'error')
    } finally {
      setEmailTwoFABusy(false)
    }
  }

  // Preferenze notifiche: per-account (localStorage di questo browser/dispositivo),
  // non condivise con il resto dello staff del ristorante.
  function togglePref(key: 'admin' | 'cameriere') {
    if (key === 'admin') {
      const next = !adminNotifOn
      setAdminNotifOn(next)
      setAdminNotifMuted(!next)
    } else {
      const next = !cameriereNotifOn
      setCameriereNotifOn(next)
      setCameriereNotifMuted(!next)
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
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

  function flash(msg: string, type: 'success' | 'error' = 'success') {
    toastTimers.current.forEach(clearTimeout)
    toastTimers.current = []
    setToastOut(false)
    setToast({ msg, type })
    // Fase 1: dopo 3s avvia l'animazione di uscita. Fase 2: smonta.
    toastTimers.current.push(setTimeout(() => setToastOut(true), 3000))
    toastTimers.current.push(setTimeout(() => {
      setToast(null)
      setToastOut(false)
    }, 3260))
  }

  // Pulisce i timer del toast allo smontaggio del componente.
  useEffect(() => () => toastTimers.current.forEach(clearTimeout), [])

  // Cambia la modalità di servizio (ordini automatici in cucina ↔ con cameriere).
  // Ottimistico: aggiorna subito la UI, e in caso di errore ripristina il valore.
  async function toggleServiceMode(next: boolean) {
    if (savingMode) return
    const prev = autoOrderFlow
    setAutoOrderFlow(next)
    setSavingMode(true)
    try {
      await updateOrderFlowMode(ctx.restaurantId, next)
      setData((d) => (d ? { ...d, autoOrderFlow: next } : d))
      flash(tr.admin.settings.serviceMode.saved, 'success')
    } catch (err) {
      console.error('[SettingsSection] toggleServiceMode:', err)
      setAutoOrderFlow(prev)
      flash(tr.admin.settings.serviceMode.error, 'error')
    } finally {
      setSavingMode(false)
    }
  }

  // Chiusura animata del modal Piano (inline): riproduce l'uscita e poi smonta.
  const [planClosing, setPlanClosing] = useState(false)
  function closePlan(after?: () => void) {
    if (planClosing) return
    setPlanClosing(true)
    setTimeout(() => {
      setShowPlan(false)
      setPlanClosing(false)
      setPlanStep('menu')
      setNewPlan('')
      after?.()
    }, MODAL_EXIT_MS)
  }

  // ── Azioni del modal Piano ────────────────────────────────────────────────
  async function handleRenewRequest() {
    if (planBusy) return
    setPlanBusy(true)
    try {
      await createSubscriptionRequest({
        restaurantId: ctx.restaurantId,
        type: 'renew',
        currentPlan: data?.plan ?? null,
      })
      closePlan(() => flash(t.renewRequestSent))
    } catch (e: any) {
      closePlan(() => flash(e?.message === 'ALREADY_PENDING' ? t.renewAlreadyPending : t.requestError, 'error'))
    } finally {
      setPlanBusy(false)
    }
  }

  async function handleChangePlanRequest() {
    if (planBusy || !newPlan) return
    setPlanBusy(true)
    try {
      await createSubscriptionRequest({
        restaurantId: ctx.restaurantId,
        type: 'plan_change',
        currentPlan: data?.plan ?? null,
        requestedPlan: newPlan,
      })
      closePlan(() => flash(t.changeRequestSent))
    } catch (e: any) {
      closePlan(() => flash(e?.message === 'ALREADY_PENDING' ? t.changeAlreadyPending : t.requestError, 'error'))
    } finally {
      setPlanBusy(false)
    }
  }

  async function handleDownloadInvoices() {
    if (planBusy) return
    setPlanBusy(true)
    try {
      const history = await listMySubscriptionRequests(ctx.restaurantId)
      const typeLabels: Record<string, string> = {
        renew: t.csvRenew,
        plan_change: t.csvPlanChange,
      }
      const statusLabels: Record<string, string> = {
        pending: t.csvStatusPending,
        approved: t.csvStatusApproved,
        rejected: t.csvStatusRejected,
      }
      const fmt = (iso: string | null) =>
        iso ? new Date(iso).toLocaleDateString(t.locale) : '—'
      const header = [t.csvType, t.csvDate, t.csvCurrentPlan, t.csvRequestedPlan, t.csvStatus]
      const rows: string[][] = [
        [t.csvActiveSub, fmt(data?.accessExpiresAt ?? null), data?.plan ?? '—', '', t.active],
        ...history.map((h) => [
          typeLabels[h.type] ?? h.type,
          fmt(h.createdAt),
          h.currentPlan ?? '—',
          h.requestedPlan ?? '',
          statusLabels[h.status] ?? h.status,
        ]),
      ]
      const csv = [header, ...rows]
        .map((r) => r.map(csvCell).join(';'))
        .join('\r\n')
      downloadCsv(csv, `storico-abbonamento-${data?.plan ?? 'piano'}.csv`)
      closePlan(() => flash(t.invoiceDownloaded))
    } catch {
      closePlan(() => flash(t.requestError, 'error'))
    } finally {
      setPlanBusy(false)
    }
  }

  const planBackdropAnim = planClosing ? 'animate-out fade-out-0' : 'animate-in fade-in-0'
  const planCardAnim = planClosing
    ? 'animate-out fade-out-0 zoom-out-95 slide-out-to-bottom-4'
    : 'animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4'

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

      {/* Toast di stato: popup fisso in basso, auto-dismiss con animazione in/out */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`pointer-events-none fixed inset-x-0 bottom-6 z-[120] flex justify-center px-4 duration-300 ease-out ${
            toastOut
              ? 'animate-out fade-out-0 slide-out-to-bottom-4'
              : 'animate-in fade-in-0 slide-in-from-bottom-4'
          }`}
        >
          <div
            className={`pointer-events-auto flex max-w-[90vw] items-center gap-2.5 rounded-2xl border px-4 py-3 text-sm font-semibold text-white shadow-xl ${
              toast.type === 'error'
                ? 'border-red-400/40 bg-red-600'
                : 'border-emerald-400/40 bg-emerald-600'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertCircle className="h-5 w-5 shrink-0" />
            ) : (
              <Check className="h-5 w-5 shrink-0" />
            )}
            <span>{toast.msg}</span>
          </div>
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
            val: adminNotifOn,
            onClick: () => togglePref('admin'),
          },
          {
            icon: Bell,
            label: t.notifStaff,
            desc: t.notifStaffDesc,
            val: cameriereNotifOn,
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

      {/* Modalità di servizio (nascosta allo staff operativo) */}
      {!isStaff && (
      <div className="tt-card overflow-hidden rounded-2xl border border-tt-line shadow-tt">
        <p className="border-b border-tt-line px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-tt-muted">
          {t.serviceMode.title}
        </p>
        <div className="flex items-center gap-3 px-4 py-3.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-tt-surfaceAlt2 text-tt-pink">
            {autoOrderFlow ? <ChefHat className="h-4 w-4" /> : <ConciergeBell className="h-4 w-4" />}
          </span>
          <div className="flex-1">
            <p className="text-sm font-bold text-tt-ink">
              {autoOrderFlow ? t.serviceMode.autoLabel : t.serviceMode.waiterLabel}
            </p>
            <p className="text-xs text-tt-muted">
              {autoOrderFlow ? t.serviceMode.autoDesc : t.serviceMode.waiterDesc}
            </p>
          </div>
          <span className="mr-2 text-xs font-bold text-tt-muted">{autoOrderFlow ? 'ON' : 'OFF'}</span>
          <button
            onClick={() => toggleServiceMode(!autoOrderFlow)}
            disabled={savingMode}
            role="switch"
            aria-checked={autoOrderFlow}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              autoOrderFlow ? 'bg-gradient-to-r from-brand-amber to-brand-terra' : 'bg-tt-line'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                autoOrderFlow ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </div>
      )}

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
          <span className="mr-2 text-xs font-bold text-tt-muted">
            {twoFABusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : twoFA ? 'ON' : 'OFF'}
          </span>
          <button
            onClick={handleToggle2FA}
            disabled={twoFABusy}
            role="switch"
            aria-checked={twoFA}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
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
        {/* 2FA via email (canale applicativo) */}
        <div className="flex items-center gap-3 border-b border-tt-line px-4 py-3.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-tt-surfaceAlt2 text-tt-pink">
            <Mail className="h-4 w-4" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-bold text-tt-ink">{t.emailTwoFA}</p>
            <p className="text-xs text-tt-muted">{t.emailTwoFADesc}</p>
          </div>
          <span className="mr-2 text-xs font-bold text-tt-muted">
            {emailTwoFABusy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : emailTwoFA ? (
              'ON'
            ) : (
              'OFF'
            )}
          </span>
          <button
            onClick={handleToggleEmail2FA}
            disabled={emailTwoFABusy}
            role="switch"
            aria-checked={emailTwoFA}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              emailTwoFA ? 'bg-gradient-to-r from-brand-emerald to-brand-sky' : 'bg-tt-line'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                emailTwoFA ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
        {/* 2FA via SMS: predisposta, richiede un provider SMS (es. Twilio) */}
        <div className="flex items-center gap-3 border-b border-tt-line px-4 py-3.5 opacity-60">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-tt-surfaceAlt2 text-tt-pink">
            <Phone className="h-4 w-4" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-bold text-tt-ink">{t.smsTwoFA}</p>
            <p className="text-xs text-tt-muted">{t.smsTwoFADesc}</p>
          </div>
          <span className="mr-2 rounded-full bg-tt-surfaceAlt2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-tt-muted">
            {t.comingSoon}
          </span>
          <button
            disabled
            role="switch"
            aria-checked={false}
            className="relative inline-flex h-6 w-11 shrink-0 cursor-not-allowed items-center rounded-full bg-tt-line"
          >
            <span className="inline-block h-5 w-5 translate-x-0.5 transform rounded-full bg-white shadow" />
          </button>
        </div>
        {/* Cambia password */}
        <button
          onClick={() => setShowPassword(true)}
          className="flex w-full items-center gap-3 border-b border-tt-line px-4 py-3.5 text-left transition hover:bg-tt-surfaceAlt2"
        >
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-tt-surfaceAlt2 text-tt-pink">
            <KeyRound className="h-4 w-4" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-bold text-tt-ink">{t.changePasswordRow}</p>
            <p className="text-xs text-tt-muted">{t.changePasswordRowDesc}</p>
          </div>
          <ChevronRight className="h-4 w-4 text-tt-muted" />
        </button>
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
              onClick={() => {
                if (isStaff) return
                setPlanClosing(false)
                setShowPlan(true)
              }}
              disabled={isStaff}
              title={isStaff ? t.manageStaffLocked : undefined}
              className={`rounded-full bg-gradient-to-r from-brand-amber to-brand-terra px-4 py-2 text-sm font-bold text-white shadow-glow-amber transition ${
                isStaff ? 'cursor-not-allowed opacity-50' : 'hover:scale-105'
              }`}
            >
              {t.manage}
            </button>
          </div>
        </div>
      )}

      {/* Integrazioni delivery (nascoste allo staff operativo) */}
      {!isStaff && (
        <div className="tt-card rounded-2xl border border-tt-line p-5 shadow-tt">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-amber to-brand-terra text-white shadow-glow-amber">
                <Send className="h-5 w-5" />
              </span>
              <div>
                <p className="font-serif text-base font-extrabold text-tt-ink">
                  {DELIVERY_COPY[lang === 'en' ? 'en' : 'it'].cardTitle}
                </p>
                <p className="text-xs text-tt-muted">
                  {DELIVERY_COPY[lang === 'en' ? 'en' : 'it'].cardDesc}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowDelivery(true)}
              className="shrink-0 rounded-full border border-tt-line bg-white px-4 py-2 text-sm font-bold text-tt-ink transition hover:bg-tt-surfaceAlt"
            >
              {DELIVERY_COPY[lang === 'en' ? 'en' : 'it'].manage}
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

      {/* Password change modal */}
      {showPassword && (
        <PasswordChangeModal
          email={ctx.userEmail}
          onClose={() => setShowPassword(false)}
          onSaved={(msg) => {
            setShowPassword(false)
            flash(msg)
          }}
        />
      )}

      {/* Two-factor setup modal */}
      {show2FA && (
        <TwoFactorModal
          onClose={() => setShow2FA(false)}
          onEnabled={(factorId) => {
            setShow2FA(false)
            setTwoFA(true)
            setTwoFAFactorId(factorId)
            flash(t.twoFAEnabledMsg)
          }}
        />
      )}

      {/* Delivery integrations modal */}
      {showDelivery && (
        <DeliveryIntegrationsModal
          restaurantId={ctx.restaurantId}
          copy={DELIVERY_COPY[lang === 'en' ? 'en' : 'it'].modal}
          onClose={() => setShowDelivery(false)}
          onSaved={(msg) => flash(msg, 'success')}
        />
      )}

      {/* Plan management modal */}
      {showPlan && data && (
        <div
          className={`fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm duration-200 ${planBackdropAnim}`}
          onClick={() => closePlan()}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl duration-200 ease-out ${planCardAnim}`}
          >
            <div className="flex items-center justify-between bg-gradient-to-r from-brand-amber to-brand-terra px-5 py-4 text-white">
              <h3 className="font-serif text-lg font-extrabold">{t.managePlan}</h3>
              <button onClick={() => closePlan()} className="grid h-8 w-8 place-items-center rounded-full bg-white/20">
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
              {planStep === 'menu' ? (
                <div className="space-y-2">
                  <button
                    onClick={handleRenewRequest}
                    disabled={planBusy}
                    className="flex w-full items-center justify-between rounded-xl border border-tt-line px-4 py-3 text-left transition hover:bg-tt-surfaceAlt2 disabled:opacity-60"
                  >
                    <div>
                      <p className="text-sm font-bold text-tt-ink">{t.renewSub}</p>
                      <p className="text-xs text-tt-muted">{t.renewSubDesc}</p>
                    </div>
                    {planBusy ? (
                      <Loader2 className="h-4 w-4 animate-spin text-tt-muted" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-tt-muted" />
                    )}
                  </button>
                  <button
                    onClick={() => { setNewPlan(''); setPlanStep('change') }}
                    disabled={planBusy}
                    className="flex w-full items-center justify-between rounded-xl border border-tt-line px-4 py-3 text-left transition hover:bg-tt-surfaceAlt2 disabled:opacity-60"
                  >
                    <div>
                      <p className="text-sm font-bold text-tt-ink">{t.changePlan}</p>
                      <p className="text-xs text-tt-muted">{t.changePlanDesc}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-tt-muted" />
                  </button>
                  <button
                    onClick={handleDownloadInvoices}
                    disabled={planBusy}
                    className="flex w-full items-center justify-between rounded-xl border border-tt-line px-4 py-3 text-left transition hover:bg-tt-surfaceAlt2 disabled:opacity-60"
                  >
                    <div>
                      <p className="text-sm font-bold text-tt-ink">{t.downloadInvoices}</p>
                      <p className="text-xs text-tt-muted">{t.downloadInvoicesDesc}</p>
                    </div>
                    {planBusy ? (
                      <Loader2 className="h-4 w-4 animate-spin text-tt-muted" />
                    ) : (
                      <Download className="h-4 w-4 text-tt-muted" />
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <p className="text-xs leading-relaxed text-amber-800">{t.changePlanWarning}</p>
                  </div>
                  <p className="text-xs font-semibold text-tt-muted">{t.changePlanSelectLabel}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {PLAN_OPTIONS.map((p) => {
                      const isCurrent = data.plan === p
                      const selected = newPlan === p
                      return (
                        <button
                          key={p}
                          disabled={isCurrent || planBusy}
                          onClick={() => setNewPlan(p)}
                          className={`rounded-xl border px-3 py-2.5 text-left text-sm font-semibold capitalize transition ${
                            selected
                              ? 'border-brand-terra bg-brand-terra/10 text-brand-terra'
                              : isCurrent
                                ? 'cursor-not-allowed border-tt-line bg-tt-surfaceAlt2 text-tt-muted opacity-60'
                                : 'border-tt-line text-tt-ink hover:bg-tt-surfaceAlt2'
                          }`}
                        >
                          {p}
                          {isCurrent && <span className="ml-1 text-[10px] font-normal lowercase">({t.currentPlanBadge})</span>}
                        </button>
                      )
                    })}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => setPlanStep('menu')}
                      disabled={planBusy}
                      className="flex-1 rounded-xl border border-tt-line px-4 py-2.5 text-sm font-semibold text-tt-ink transition hover:bg-tt-surfaceAlt2 disabled:opacity-60"
                    >
                      {t.planBack}
                    </button>
                    <button
                      onClick={handleChangePlanRequest}
                      disabled={!newPlan || planBusy}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-amber to-brand-terra px-4 py-2.5 text-sm font-bold text-white transition disabled:opacity-50"
                    >
                      {planBusy && <Loader2 className="h-4 w-4 animate-spin" />}
                      {t.changePlanConfirm}
                    </button>
                  </div>
                </div>
              )}
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
  const { closing, runExit, backdropAnim, cardAnim } = useModalExit()
  const [firstName, setFirstName] = useState(ctx.userFirstName)
  const [lastName, setLastName] = useState(ctx.userLastName)
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
      runExit(() => onSaved(t.profileUpdated))
    } catch (e: any) {
      setError(e.message ?? t.errorUpdate)
      setSaving(false)
    }
  }

  return (
    <div
      className={`fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm duration-200 ${backdropAnim}`}
      onClick={() => runExit(onClose)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-3xl bg-white shadow-2xl duration-200 ease-out ${cardAnim}`}
      >
        <div className="flex shrink-0 items-center justify-between bg-gradient-to-r from-brand-amber to-brand-terra px-5 py-4 text-white">
          <div className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            <h3 className="font-serif text-lg font-extrabold">{t.editProfile}</h3>
          </div>
          <button onClick={() => runExit(onClose)} className="grid h-8 w-8 place-items-center rounded-full bg-white/20">
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

          {error && (
            <div className="mb-3 flex items-center gap-2 rounded-lg bg-tt-danger/10 px-3 py-2 text-xs text-tt-danger">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}
        </div>

        <div className="flex shrink-0 gap-2 border-t border-tt-line p-4">
          <button
            onClick={handleSave}
            disabled={saving || closing}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-amber to-brand-terra py-3 text-sm font-bold text-white shadow-glow-amber transition hover:scale-105 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {t.saveChanges}
          </button>
          <button
            onClick={() => runExit(onClose)}
            disabled={closing}
            className="rounded-full border border-tt-line bg-white px-5 py-3 text-sm font-bold text-tt-muted transition hover:text-tt-ink"
          >
            {t.cancel}
          </button>
        </div>
      </div>
    </div>
  )
}

// Animazione di entrata/uscita dei modal: teniamo il nodo montato durante
// l'uscita e chiamiamo il callback reale al termine della transizione.
const MODAL_EXIT_MS = 200

function useModalExit() {
  const [closing, setClosing] = useState(false)
  function runExit(cb: () => void) {
    if (closing) return
    setClosing(true)
    setTimeout(cb, MODAL_EXIT_MS)
  }
  const backdropAnim = closing ? 'animate-out fade-out-0' : 'animate-in fade-in-0'
  const cardAnim = closing
    ? 'animate-out fade-out-0 zoom-out-95 slide-out-to-bottom-4'
    : 'animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4'
  return { closing, runExit, backdropAnim, cardAnim }
}

// ─── Password change modal ───────────────────────────────────────────────────

function PasswordChangeModal({
  email,
  onClose,
  onSaved,
}: {
  email: string
  onClose: () => void
  onSaved: (msg: string) => void
}) {
  const { tr } = useI18n()
  const t = tr.admin.settings
  const { closing, runExit, backdropAnim, cardAnim } = useModalExit()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setError(null)
    if (!currentPassword) {
      setError(t.pwCurrentRequired)
      return
    }
    // Stessi requisiti delle pagine di autenticazione (signup/login).
    if (!evaluatePassword(newPassword).allPassed) {
      setError(t.pwWeak)
      return
    }
    if (newPassword !== confirmPassword) {
      setError(t.pwMismatch)
      return
    }
    setSaving(true)
    try {
      await updateUserPasswordSecure(email, currentPassword, newPassword)
      runExit(() => onSaved(t.pwChanged))
    } catch (e: any) {
      setError(e.message === 'CURRENT_PW_WRONG' ? t.pwCurrentWrong : e.message ?? t.errorUpdate)
      setSaving(false)
    }
  }

  return (
    <div
      className={`fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm duration-200 ${backdropAnim}`}
      onClick={() => runExit(onClose)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl duration-200 ease-out ${cardAnim}`}
      >
        <div className="flex items-center justify-between bg-gradient-to-r from-brand-amber to-brand-terra px-5 py-4 text-white">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            <h3 className="font-serif text-lg font-extrabold">{t.changePasswordRow}</h3>
          </div>
          <button onClick={() => runExit(onClose)} className="grid h-8 w-8 place-items-center rounded-full bg-white/20">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5">
          <div className="mb-3">
            <label className="mb-1 block text-xs font-bold text-tt-ink">{t.currentPasswordPh}</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder={t.currentPasswordPh}
              autoComplete="current-password"
              className="w-full rounded-xl border border-tt-line bg-white px-3 py-2.5 text-sm text-tt-ink outline-none focus:border-tt-pink/40"
            />
          </div>
          <div className="mb-3">
            <label className="mb-1 block text-xs font-bold text-tt-ink">{t.newPasswordPh}</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t.newPasswordPh}
              autoComplete="new-password"
              className="w-full rounded-xl border border-tt-line bg-white px-3 py-2.5 text-sm text-tt-ink outline-none focus:border-tt-pink/40"
            />
            {newPassword.length > 0 && (
              <div className="mt-2">
                <PasswordStrength password={newPassword} />
              </div>
            )}
          </div>
          <div className="mb-4">
            <label className="mb-1 block text-xs font-bold text-tt-ink">{t.confirmNewPasswordPh}</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t.confirmNewPasswordPh}
              autoComplete="new-password"
              className="w-full rounded-xl border border-tt-line bg-white px-3 py-2.5 text-sm text-tt-ink outline-none focus:border-tt-pink/40"
            />
          </div>

          {error && (
            <div className="mb-3 flex items-center gap-2 rounded-lg bg-tt-danger/10 px-3 py-2 text-xs text-tt-danger">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving || closing}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-amber to-brand-terra py-3 text-sm font-bold text-white shadow-glow-amber transition hover:scale-105 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {t.saveChanges}
            </button>
            <button
              onClick={() => runExit(onClose)}
              disabled={closing}
              className="rounded-full border border-tt-line bg-white px-5 py-3 text-sm font-bold text-tt-muted transition hover:text-tt-ink"
            >
              {t.cancel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Two-factor setup modal ──────────────────────────────────────────────────

function TwoFactorModal({
  onClose,
  onEnabled,
}: {
  onClose: () => void
  onEnabled: (factorId: string) => void
}) {
  const { tr } = useI18n()
  const t = tr.admin.settings
  const { closing, runExit, backdropAnim, cardAnim } = useModalExit()
  const [enrollment, setEnrollment] = useState<TwoFactorEnrollment | null>(null)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    enrollTwoFactor()
      .then((e) => {
        if (active) {
          setEnrollment(e)
          setLoading(false)
        }
      })
      .catch((e: any) => {
        if (active) {
          setError(e?.message ? `${t.twoFALoadError}: ${e.message}` : t.twoFALoadError)
          setLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [])

  // Chiudendo senza completare, rimuoviamo il fattore ancora non verificato.
  function handleClose() {
    if (closing) return
    if (enrollment && !verifying) {
      disableTwoFactor(enrollment.factorId).catch(() => {})
    }
    runExit(onClose)
  }

  async function handleVerify() {
    if (!enrollment || verifying) return
    setError(null)
    setVerifying(true)
    try {
      await verifyTwoFactor(enrollment.factorId, code)
      const factorId = enrollment.factorId
      runExit(() => onEnabled(factorId))
    } catch {
      setError(t.twoFAInvalidCode)
      setVerifying(false)
    }
  }

  return (
    <div
      className={`fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm duration-200 ${backdropAnim}`}
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl duration-200 ease-out ${cardAnim}`}
      >
        <div className="flex items-center justify-between bg-gradient-to-r from-brand-emerald to-brand-sky px-5 py-4 text-white">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <h3 className="font-serif text-lg font-extrabold">{t.twoFAModalTitle}</h3>
          </div>
          <button onClick={handleClose} className="grid h-8 w-8 place-items-center rounded-full bg-white/20">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="grid place-items-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-tt-muted" />
            </div>
          ) : error && !enrollment ? (
            <div className="flex items-center gap-2 rounded-lg bg-tt-danger/10 px-3 py-2 text-xs text-tt-danger">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          ) : enrollment ? (
            <>
              <p className="mb-4 text-sm text-tt-muted">{t.twoFAScanInstructions}</p>
              <div className="mb-4 grid place-items-center">
                {/* Supabase restituisce il QR come SVG data URL. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={enrollment.qrCode}
                  alt="QR 2FA"
                  className="h-44 w-44 rounded-xl border border-tt-line bg-white p-2"
                />
              </div>
              <div className="mb-4 rounded-xl border border-tt-line bg-tt-surfaceAlt2 px-3 py-2 text-center">
                <p className="text-[11px] font-bold uppercase tracking-wide text-tt-muted">{t.twoFAManualKey}</p>
                <p className="mt-1 break-all font-mono text-xs text-tt-ink">{enrollment.secret}</p>
              </div>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder={t.twoFACodePh}
                className="mb-3 w-full rounded-xl border border-tt-line bg-white px-3 py-2.5 text-center text-lg font-bold tracking-[0.3em] text-tt-ink outline-none focus:border-tt-pink/40"
              />

              {error && (
                <div className="mb-3 flex items-center gap-2 rounded-lg bg-tt-danger/10 px-3 py-2 text-xs text-tt-danger">
                  <AlertCircle className="h-4 w-4 shrink-0" /> {error}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleVerify}
                  disabled={verifying || closing || code.length < 6}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-emerald to-brand-sky py-3 text-sm font-bold text-white shadow-tt transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
                >
                  {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {verifying ? t.twoFAVerifying : t.twoFAEnableBtn}
                </button>
                <button
                  onClick={handleClose}
                  disabled={closing}
                  className="rounded-full border border-tt-line bg-white px-5 py-3 text-sm font-bold text-tt-muted transition hover:text-tt-ink"
                >
                  {t.cancel}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}

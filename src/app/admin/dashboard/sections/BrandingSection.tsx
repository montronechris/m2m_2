'use client'

// ─── SEZIONE: BRANDING / IDENTITA LOCALE ───────────────────────────────────────
//
// Logo, colori, contatti e link social del ristorante.
// Stato: form controllato; salva le modifiche su Supabase e mostra esito (loading/ok/errore).
// ──────────────────────────────────────────────────────────────────────────────


import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Palette, Save, CheckCircle2, Globe, Phone, MapPin, Instagram, AlertCircle, ImageIcon, Trash2 } from 'lucide-react'
import type { RestaurantCtx, ThemeMode } from '../types'
import { getBranding, updateBranding, type BrandingData } from '@/lib/admin-service'
import { useI18n } from '@/components/i18n/I18nProvider'
import { restaurantAvatars } from '@/lib/restaurant-avatars'
import { establishmentTypes } from '@/lib/establishment-types'
import { setUnsavedChanges } from '@/lib/unsaved-changes'
import { updateEstablishmentType, EstablishmentTypeCooldownError } from '@/lib/admin-service'

const DAY_MS = 24 * 60 * 60 * 1000
const COOLDOWN_DAYS = 30

interface Props {
  ctx: RestaurantCtx
  theme: ThemeMode
}

export function BrandingSection({ ctx }: Props) {
  const { tr } = useI18n()
  const t = tr.admin.branding
  const swatches = [
    { name: t.swAmber, color: '#d97706' },
    { name: t.swEmerald, color: '#059669' },
    { name: t.swBlue, color: '#2563eb' },
    { name: t.swPurple, color: '#7c3aed' },
    { name: t.swYellow, color: '#eab308' },
    { name: t.swPink, color: '#e11d48' },
    { name: t.swTeal, color: '#0d9488' },
    { name: t.swOrange, color: '#ea580c' },
  ]
  const [data, setData] = useState<BrandingData | null>(null)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [pendingType, setPendingType] = useState<string | null>(null)
  const [pendingCustomType, setPendingCustomType] = useState('')
  const [typeSaving, setTypeSaving] = useState(false)
  const [typeError, setTypeError] = useState<string | null>(null)
  // Remembers the image URL / solid color independently so switching between
  // "Immagine" and "Colore solido" tabs doesn't clobber the other's value —
  // both are persisted in the single background_image_url column.
  const [lastImageUrl, setLastImageUrl] = useState('')
  const [lastColorValue, setLastColorValue] = useState('#f5f0e8')

  // Load from DATABASE via admin-service
  useEffect(() => {
    let active = true
    getBranding(ctx.restaurantId)
      .then((d) => {
        if (!active) return
        setData(d)
        if (d.background_type === 'image' && d.background_image_url) {
          setLastImageUrl(d.background_image_url)
        } else if (d.background_type === 'color' && /^#[0-9a-fA-F]{6}$/.test(d.background_image_url)) {
          setLastColorValue(d.background_image_url)
        }
      })
      .catch((e) => {
        if (active) setError(e.message ?? t.errorLoad)
      })
    return () => {
      active = false
    }
  }, [ctx.restaurantId])

  function set<K extends keyof BrandingData>(field: K, value: string) {
    setData((prev) => (prev ? { ...prev, [field]: value } : prev))
    setUnsavedChanges(true)
  }

  async function uploadBackground(file: File) {
    const { createBrowserClient } = await import('@supabase/ssr')
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const ext = file.name.split('.').pop()
    const fileName = `backgrounds/${ctx.restaurantId}-${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage
      .from('restaurant-logos')
      .upload(fileName, file, { upsert: true })
    if (upErr) throw upErr
    const { data } = supabase.storage.from('restaurant-logos').getPublicUrl(fileName)
    setLastImageUrl(data.publicUrl)
    set('background_image_url', data.publicUrl)
    set('background_type', 'image')
  }

  async function save() {
    if (!data) return
    setSaving(true)
    setError(null)
    try {
      await updateBranding(ctx.restaurantId, {
        name: data.name.trim() || ctx.restaurantName,
        logo_icon: data.logo_icon,
        brand_color: data.brand_color,
        background_image_url: data.background_image_url,
        background_type: data.background_type,
        address: data.address,
        phone: data.phone,
        instagram: data.instagram,
        website: data.website,
      })
      setUnsavedChanges(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2200)
    } catch (e: any) {
      setError(e.message ?? t.errorSave)
    } finally {
      setSaving(false)
    }
  }

  const typeCooldownDaysLeft = (() => {
    if (!data?.establishment_type_changed_at) return 0
    const elapsedMs = Date.now() - new Date(data.establishment_type_changed_at).getTime()
    const remainingMs = COOLDOWN_DAYS * DAY_MS - elapsedMs
    return remainingMs > 0 ? Math.ceil(remainingMs / DAY_MS) : 0
  })()
  const typeLocked = typeCooldownDaysLeft > 0

  async function confirmTypeChange() {
    if (!data || !pendingType) return
    if (pendingType === 'altro' && !pendingCustomType.trim()) return
    setTypeSaving(true)
    setTypeError(null)
    try {
      const customType = pendingType === 'altro' ? pendingCustomType.trim() : null
      await updateEstablishmentType(ctx.restaurantId, pendingType, customType)
      setData((prev) =>
        prev
          ? {
              ...prev,
              establishment_type: pendingType,
              establishment_type_custom: customType,
              establishment_type_changed_at: new Date().toISOString(),
            }
          : prev
      )
      setPendingType(null)
      setPendingCustomType('')
    } catch (e) {
      setTypeError(e instanceof EstablishmentTypeCooldownError ? t.typeCooldownError : t.errorSave)
    } finally {
      setTypeSaving(false)
    }
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

  if (!data) {
    return (
      <div className="space-y-4">
        <div className="h-7 w-32 tt-skeleton rounded-full" />
        <div className="tt-card h-24 rounded-2xl border border-tt-line shadow-tt" />
        <div className="tt-card h-64 rounded-2xl border border-tt-line shadow-tt" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-brand-amber to-brand-terra text-white shadow-glow-amber">
            <Palette className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-serif text-xl font-extrabold text-tt-ink">{t.title}</h2>
            <p className="text-xs text-tt-muted">{t.subtitle}</p>
          </div>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-brand-amber to-brand-terra px-4 py-2 text-sm font-bold text-white shadow-glow-amber transition hover:scale-105 disabled:opacity-60"
        >
          {saved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saved ? t.saved : saving ? t.saving : t.saveChanges}
        </button>
      </div>

      {data.logo_url && (
        <div className="tt-card-pink rounded-2xl p-5 shadow-tt">
          <div className="flex items-center gap-4">
            <img src={data.logo_url} alt="logo" className="h-14 w-14 rounded-2xl bg-white/15 object-cover" />
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-serif text-lg font-extrabold text-tt-ink">{data.name}</h3>
              <p className="truncate text-sm text-tt-muted">
                {data.establishment_type === 'altro'
                  ? data.establishment_type_custom || t.establishmentType
                  : tr.auth.create.types[data.establishment_type as keyof typeof tr.auth.create.types] ?? data.establishment_type}
                {data.city && ` · ${tr.auth.create.venueAt} ${data.city}`}
              </p>
            </div>
            <span className="h-6 w-6 shrink-0 rounded-full border-2 border-white shadow" style={{ background: data.brand_color }} />
          </div>
        </div>
      )}

      <div className="tt-card rounded-2xl border border-tt-line p-5 shadow-tt">
        <p className="tt-section-title">{t.visualIdentity}</p>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-bold text-tt-ink">{t.name}</label>
            <input
              value={data.name}
              onChange={(e) => set('name', e.target.value)}
              className="w-full rounded-xl border border-tt-line bg-white px-3 py-2.5 text-sm text-tt-ink outline-none focus:border-tt-pink/40"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold text-tt-ink">{t.avatar}</label>
            <div className="flex flex-wrap gap-2">
              {restaurantAvatars.map((a) => {
                const isSelected = data.logo_icon === a.id
                return (
                  <button
                    key={a.id}
                    onClick={() => set('logo_icon', a.id)}
                    title={a.label}
                    className={`grid h-11 w-11 place-items-center rounded-xl border-2 transition hover:scale-110 ${isSelected ? 'border-tt-pink bg-tt-pink/10 text-tt-pink' : 'border-tt-line bg-white text-tt-muted'}`}
                  >
                    <a.Icon className="h-5 w-5" />
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold text-tt-ink">{t.brandColor}</label>
            <div className="flex flex-wrap gap-2">
              {swatches.map((s) => (
                <button
                  key={s.color}
                  onClick={() => set('brand_color', s.color)}
                  className={`h-9 w-9 rounded-full border-2 transition hover:scale-110 ${data.brand_color === s.color ? 'border-tt-ink' : 'border-white'}`}
                  style={{ background: s.color }}
                  title={s.name}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="tt-card rounded-2xl border border-tt-line p-5 shadow-tt"
      >
        <p className="tt-section-title">{t.establishmentType}</p>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-tt-ink">
              {data.establishment_type === 'altro'
                ? data.establishment_type_custom || t.establishmentType
                : tr.auth.create.types[data.establishment_type as keyof typeof tr.auth.create.types] ?? data.establishment_type}
            </span>
            <AnimatePresence>
              {typeLocked && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-xs font-semibold text-tt-muted"
                >
                  {t.typeCooldownMessage.replace('{days}', String(typeCooldownDaysLeft))}
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          <div className={`flex flex-wrap gap-2 ${typeLocked ? 'pointer-events-none opacity-40' : ''}`}>
            {establishmentTypes.map((et) => {
              const isCurrent = data.establishment_type === et.id
              const label = tr.auth.create.types[et.id as keyof typeof tr.auth.create.types] ?? et.id
              return (
                <motion.button
                  key={et.id}
                  disabled={typeLocked}
                  onClick={() => !isCurrent && (setPendingType(et.id), setPendingCustomType(''), setTypeError(null))}
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.96 }}
                  className={`rounded-full border-2 px-3 py-1.5 text-xs font-bold transition-colors ${isCurrent ? 'border-tt-pink bg-tt-pink/10 text-tt-pink' : 'border-tt-line bg-white text-tt-muted'}`}
                >
                  {label}
                </motion.button>
              )
            })}
          </div>

          <AnimatePresence>
            {pendingType && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="overflow-hidden"
              >
                <div className="rounded-xl border border-tt-line bg-tt-bg p-3">
                  <AnimatePresence>
                    {pendingType === 'altro' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="mb-2 overflow-hidden"
                      >
                        <label className="mb-1 block text-xs font-bold text-tt-ink">{tr.auth.create.customTypeLabel}</label>
                        <input
                          value={pendingCustomType}
                          onChange={(e) => setPendingCustomType(e.target.value)}
                          placeholder={tr.auth.create.customTypePlaceholder}
                          maxLength={80}
                          className="h-10 w-full rounded-lg border border-tt-line bg-white px-3 text-sm text-tt-ink outline-none focus:border-tt-pink"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <p className="mb-2 text-xs font-semibold text-tt-ink">{t.typeChangeConfirmMessage}</p>
                  {typeError && <p className="mb-2 text-xs font-semibold text-tt-danger">{typeError}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setPendingType(null); setPendingCustomType(''); setTypeError(null) }}
                      className="h-9 flex-1 rounded-full border border-tt-line bg-white text-xs font-bold text-tt-muted transition hover:text-tt-ink"
                    >
                      {t.cancel}
                    </button>
                    <button
                      onClick={confirmTypeChange}
                      disabled={typeSaving || (pendingType === 'altro' && !pendingCustomType.trim())}
                      className="h-9 flex-1 rounded-full bg-tt-pink text-xs font-bold text-white shadow-tt transition hover:scale-105 disabled:opacity-60"
                    >
                      {typeSaving ? '…' : t.confirmTypeChange}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <div className="tt-card rounded-2xl border border-tt-line p-5 shadow-tt">
        <p className="tt-section-title">{t.customerBackground}</p>
        <div className="space-y-3">

          {/* Scelta tipo */}
          <div className="flex flex-wrap gap-2">
            {(['gradient', 'image', 'color'] as const).map((bt) => (
              <button
                key={bt}
                onClick={() => {
                  if (bt === 'color') {
                    set('background_image_url', lastColorValue)
                  } else if (bt === 'image') {
                    set('background_image_url', lastImageUrl)
                  }
                  set('background_type', bt)
                }}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition border ${
                  data.background_type === bt
                    ? 'bg-tt-ink text-white border-tt-ink'
                    : 'border-tt-line text-tt-muted hover:border-tt-ink/40'
                }`}
              >
                {bt === 'gradient' ? t.bgGradient : bt === 'image' ? t.bgImage : t.bgColor}
              </button>
            ))}
          </div>

          {/* Immagine */}
          {data.background_type === 'image' && (
            <div className="space-y-2">
              {data.background_image_url ? (
                <div className="relative overflow-hidden rounded-xl border border-tt-line">
                  <img
                    src={data.background_image_url}
                    alt="Sfondo"
                    className="h-32 w-full object-cover"
                  />
                  <button
                    onClick={() => { setLastImageUrl(''); set('background_image_url', ''); set('background_type', 'gradient') }}
                    className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/50 text-white hover:bg-black/70"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-tt-line bg-tt-surface py-8 transition hover:border-tt-ink/30">
                  <ImageIcon className="h-8 w-8 text-tt-muted" />
                  <span className="text-xs font-semibold text-tt-muted">{t.uploadBg}</span>
                  <span className="text-[10px] text-tt-muted/60">{t.uploadBgFormats}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        try { await uploadBackground(file) }
                        catch (err: any) { setError(err.message ?? t.errorUpload) }
                      }
                    }}
                  />
                </label>
              )}
              <p className="text-[11px] text-tt-muted">
                {t.bgImageDesc}
              </p>
            </div>
          )}

          {/* Colore solido */}
          {data.background_type === 'color' && (() => {
            const solidColor = /^#[0-9a-fA-F]{6}$/.test(data.background_image_url)
              ? data.background_image_url
              : '#f5f0e8'
            return (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={solidColor}
                  onChange={(e) => { setLastColorValue(e.target.value); set('background_image_url', e.target.value) }}
                  className="h-10 w-10 cursor-pointer rounded-lg border border-tt-line"
                />
                <span className="text-sm font-mono text-tt-muted">
                  {solidColor}
                </span>
              </div>
              <p className="text-[11px] text-tt-muted">
                {t.bgColorDesc}
              </p>
            </div>
            )
          })()}

          {/* Gradiente brand */}
          {data.background_type === 'gradient' && (
            <p className="text-xs text-tt-muted">
              {t.bgGradientDesc}
            </p>
          )}

        </div>
      </div>

      <div className="tt-card rounded-2xl border border-tt-line p-5 shadow-tt">
        <p className="tt-section-title">{t.contactsSocial}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {([
            { icon: MapPin, label: t.addressField, field: 'address' as const },
            { icon: Phone, label: t.phoneField, field: 'phone' as const },
            { icon: Instagram, label: t.instagramField, field: 'instagram' as const },
            { icon: Globe, label: t.websiteField, field: 'website' as const },
          ]).map((c) => {
            const Icon = c.icon
            return (
              <div key={c.field}>
                <label className="mb-1 flex items-center gap-1.5 text-xs font-bold text-tt-ink">
                  <Icon className="h-3.5 w-3.5 text-tt-pink" /> {c.label}
                </label>
                <input
                  value={data[c.field]}
                  onChange={(e) => set(c.field, e.target.value)}
                  className="w-full rounded-xl border border-tt-line bg-white px-3 py-2.5 text-sm text-tt-ink outline-none focus:border-tt-pink/40"
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
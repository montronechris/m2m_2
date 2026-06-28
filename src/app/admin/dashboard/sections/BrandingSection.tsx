'use client'

import { useEffect, useState } from 'react'
import { Palette, Save, CheckCircle2, Globe, Phone, MapPin, Instagram, MessageSquare, AlertCircle, ImageIcon, Trash2 } from 'lucide-react'
import type { RestaurantCtx, ThemeMode } from '../types'
import { getBranding, updateBranding, type BrandingData } from '@/lib/admin-service'

interface Props {
  ctx: RestaurantCtx
  theme: ThemeMode
}

const swatches = [
  { name: 'Ambra', color: '#d97706' },
  { name: 'Smeraldo', color: '#059669' },
  { name: 'Blu', color: '#2563eb' },
  { name: 'Viola', color: '#7c3aed' },
  { name: 'Giallo', color: '#eab308' },
  { name: 'Rosa', color: '#e11d48' },
  { name: 'Teal', color: '#0d9488' },
  { name: 'Arancio', color: '#ea580c' },
]

export function BrandingSection({ ctx }: Props) {
  const [data, setData] = useState<BrandingData | null>(null)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Load from DATABASE via admin-service
  useEffect(() => {
    let active = true
    getBranding(ctx.restaurantId)
      .then((d) => {
        if (active) setData(d)
      })
      .catch((e) => {
        if (active) setError(e.message ?? 'Errore nel caricamento branding')
      })
    return () => {
      active = false
    }
  }, [ctx.restaurantId])

  function set<K extends keyof BrandingData>(field: K, value: string) {
    setData((prev) => (prev ? { ...prev, [field]: value } : prev))
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
        tagline: data.tagline,
        brand_color: data.brand_color,
        background_image_url: data.background_image_url,
        background_type: data.background_type,
        welcome_message: data.welcome_message,
        confirm_message: data.confirm_message,
        address: data.address,
        phone: data.phone,
        instagram: data.instagram,
        website: data.website,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2200)
    } catch (e: any) {
      setError(e.message ?? 'Errore nel salvataggio')
    } finally {
      setSaving(false)
    }
  }

  if (error) {
    return (
      <div className="grid place-items-center py-16 text-center">
        <AlertCircle className="mb-3 h-10 w-10 text-tt-danger" />
        <p className="text-sm font-bold text-tt-ink">Errore</p>
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
            <h2 className="font-serif text-xl font-extrabold text-tt-ink">Branding</h2>
            <p className="text-xs text-tt-muted">Personalizza l'identità del tuo ristorante</p>
          </div>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-brand-amber to-brand-terra px-4 py-2 text-sm font-bold text-white shadow-glow-amber transition hover:scale-105 disabled:opacity-60"
        >
          {saved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saved ? 'Salvato!' : saving ? 'Salvataggio…' : 'Salva modifiche'}
        </button>
      </div>

      {data.logo_url && (
        <div className="tt-card-pink rounded-2xl p-5 shadow-tt">
          <div className="flex items-center gap-4">
            <img src={data.logo_url} alt="logo" className="h-14 w-14 rounded-2xl bg-white/15 object-contain" />
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-serif text-lg font-extrabold text-tt-ink">{data.name}</h3>
              <p className="truncate text-sm text-tt-muted">{data.tagline}</p>
            </div>
            <span className="h-6 w-6 rounded-full border-2 border-white shadow" style={{ background: data.brand_color }} />
          </div>
        </div>
      )}

      <div className="tt-card rounded-2xl border border-tt-line p-5 shadow-tt">
        <p className="tt-section-title">Identità visiva</p>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-bold text-tt-ink">Nome ristorante</label>
            <input
              value={data.name}
              onChange={(e) => set('name', e.target.value)}
              className="w-full rounded-xl border border-tt-line bg-white px-3 py-2.5 text-sm text-tt-ink outline-none focus:border-tt-pink/40"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-tt-ink">Tagline</label>
            <input
              value={data.tagline}
              onChange={(e) => set('tagline', e.target.value)}
              className="w-full rounded-xl border border-tt-line bg-white px-3 py-2.5 text-sm text-tt-ink outline-none focus:border-tt-pink/40"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold text-tt-ink">Colore brand</label>
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

      <div className="tt-card rounded-2xl border border-tt-line p-5 shadow-tt">
        <p className="tt-section-title">Messaggi ai clienti</p>
        <div className="space-y-3">
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-bold text-tt-ink">
              <MessageSquare className="h-3.5 w-3.5 text-tt-pink" /> Messaggio di benvenuto
            </label>
            <textarea
              rows={2}
              value={data.welcome_message}
              onChange={(e) => set('welcome_message', e.target.value)}
              className="w-full resize-none rounded-xl border border-tt-line bg-white px-3 py-2.5 text-sm text-tt-ink outline-none focus:border-tt-pink/40"
            />
          </div>
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-bold text-tt-ink">
              <MessageSquare className="h-3.5 w-3.5 text-tt-pink" /> Messaggio di conferma ordine
            </label>
            <textarea
              rows={2}
              value={data.confirm_message}
              onChange={(e) => set('confirm_message', e.target.value)}
              className="w-full resize-none rounded-xl border border-tt-line bg-white px-3 py-2.5 text-sm text-tt-ink outline-none focus:border-tt-pink/40"
            />
          </div>
        </div>
      </div>

      <div className="tt-card rounded-2xl border border-tt-line p-5 shadow-tt">
        <p className="tt-section-title">Sfondo pagina cliente</p>
        <div className="space-y-3">

          {/* Scelta tipo */}
          <div className="flex flex-wrap gap-2">
            {(['gradient', 'image', 'color'] as const).map((t) => (
              <button
                key={t}
                onClick={() => set('background_type', t)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition border ${
                  data.background_type === t
                    ? 'bg-tt-ink text-white border-tt-ink'
                    : 'border-tt-line text-tt-muted hover:border-tt-ink/40'
                }`}
              >
                {t === 'gradient' ? 'Gradiente brand' : t === 'image' ? 'Immagine' : 'Colore solido'}
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
                    onClick={() => { set('background_image_url', ''); set('background_type', 'gradient') }}
                    className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/50 text-white hover:bg-black/70"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-tt-line bg-tt-surface py-8 transition hover:border-tt-ink/30">
                  <ImageIcon className="h-8 w-8 text-tt-muted" />
                  <span className="text-xs font-semibold text-tt-muted">Carica immagine sfondo</span>
                  <span className="text-[10px] text-tt-muted/60">JPG, PNG, WebP · max 5MB</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        try { await uploadBackground(file) }
                        catch (err: any) { setError(err.message ?? 'Errore upload') }
                      }
                    }}
                  />
                </label>
              )}
              <p className="text-[11px] text-tt-muted">
                L'immagine verrà usata come sfondo fisso nella pagina ordini del cliente.
              </p>
            </div>
          )}

          {/* Colore solido */}
          {data.background_type === 'color' && (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={data.background_image_url || '#f5f0e8'}
                  onChange={(e) => set('background_image_url', e.target.value)}
                  className="h-10 w-10 cursor-pointer rounded-lg border border-tt-line"
                />
                <span className="text-sm font-mono text-tt-muted">
                  {data.background_image_url || '#f5f0e8'}
                </span>
              </div>
              <p className="text-[11px] text-tt-muted">
                Verrà usato come colore di sfondo uniforme nella pagina ordini del cliente.
              </p>
            </div>
          )}

          {/* Gradiente brand */}
          {data.background_type === 'gradient' && (
            <p className="text-xs text-tt-muted">
              Verrà usato il gradiente generato automaticamente dal colore brand del ristorante.
            </p>
          )}

        </div>
      </div>

      <div className="tt-card rounded-2xl border border-tt-line p-5 shadow-tt">
        <p className="tt-section-title">Contatti e social</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {([
            { icon: MapPin, label: 'Indirizzo', field: 'address' as const },
            { icon: Phone, label: 'Telefono', field: 'phone' as const },
            { icon: Instagram, label: 'Instagram', field: 'instagram' as const },
            { icon: Globe, label: 'Sito web', field: 'website' as const },
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
'use client'

import { useEffect, useState } from 'react'
import { Plus, Search, Leaf, WheatOff, Pencil, Trash2, Utensils, AlertCircle, X, Check, Loader2, ImageIcon, Upload, ChevronDown } from 'lucide-react'
import type { RestaurantCtx, ThemeMode } from '../types'
import {
  getMenuItems,
  getMenuCategories,
  toggleMenuItemAvailability,
  createMenuItem,
  uploadMenuItemPhoto,
  type MenuItem,
  type MenuCategory,
} from '@/lib/admin-service'
import { useI18n } from '@/components/i18n/I18nProvider'

interface Props {
  ctx: RestaurantCtx
  theme: ThemeMode
}

export function MenuSection({ ctx }: Props) {
  const { tr } = useI18n()
  const t = tr.admin.menu
  const [q, setQ] = useState('')
  const [items, setItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    category_id: '',
    is_vegetarian: false,
    is_gluten_free: false,
  })
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string>('')

  useEffect(() => {
    let active = true
    Promise.all([getMenuItems(ctx.restaurantId), getMenuCategories(ctx.restaurantId)])
      .then(([data, cats]) => {
        if (active) {
          setItems(data)
          setCategories(cats)
          setLoading(false)
        }
      })
      .catch((e) => {
        if (active) {
          setError(e.message ?? t.errorLoad)
          setLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [ctx.restaurantId])

  const filtered = items.filter(
    (i) => i.name.toLowerCase().includes(q.toLowerCase()) || (i.category_id ?? '').toLowerCase().includes(q.toLowerCase())
  )

  const categoryName = (catId: string) => categories.find((c) => c.id === catId)?.name ?? t.noCategory

  async function toggleAvail(item: MenuItem) {
    const next = !item.is_available
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_available: next } : i)))
    try {
      await toggleMenuItemAvailability(item.id, next)
    } catch {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_available: item.is_available } : i)))
    }
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function handleCreate() {
    if (!form.name.trim() || !form.price) return
    setSaving(true)
    setError(null)
    try {
      const priceCents = Math.round(parseFloat(form.price.replace(',', '.')) * 100)
      if (isNaN(priceCents) || priceCents < 0) throw new Error(t.invalidPrice)

      let imageUrl: string | null = null
      if (photoFile) {
        try {
          imageUrl = await uploadMenuItemPhoto(photoFile, ctx.restaurantId)
        } catch {
          // storage may not be configured — continue without image
        }
      }

      const created = await createMenuItem({
        restaurant_id: ctx.restaurantId,
        category_id: form.category_id || (null as any),
        name: form.name.trim(),
        description: form.description.trim(),
        price_cents: priceCents,
        is_available: true,
        is_vegetarian: form.is_vegetarian,
        is_gluten_free: form.is_gluten_free,
        image_url: imageUrl,
      } as Omit<MenuItem, 'id' | 'created_at'>)
      setItems((prev) => [created, ...prev])
      setForm({ name: '', description: '', price: '', category_id: '', is_vegetarian: false, is_gluten_free: false })
      setPhotoFile(null)
      setPhotoPreview('')
      setShowForm(false)
    } catch (e: any) {
      setError(e.message ?? t.errorCreate)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-7 w-32 tt-skeleton rounded-full" />
        <div className="h-11 w-full tt-skeleton rounded-2xl" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="tt-card flex items-center gap-3 rounded-2xl border border-tt-line p-3 shadow-tt">
            <div className="h-12 w-12 tt-skeleton rounded-xl" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 tt-skeleton rounded-full" />
              <div className="h-3 w-1/4 tt-skeleton rounded-full" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error && items.length === 0) {
    return (
      <div className="grid place-items-center py-16 text-center">
        <AlertCircle className="mb-3 h-10 w-10 text-tt-danger" />
        <p className="text-sm font-bold text-tt-ink">{t.error}</p>
        <p className="mt-1 max-w-xs text-xs text-tt-muted">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-serif text-xl font-extrabold text-tt-ink">{t.title}</h2>
          <p className="text-xs text-tt-muted">
            {t.countF(items.length, items.filter((i) => i.is_available).length)}
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-brand-amber to-brand-terra px-4 py-2 text-sm font-bold text-white shadow-glow-amber transition hover:scale-105"
        >
          <Plus className="h-4 w-4" /> {t.newDish}
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-tt-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t.searchPlaceholder}
          className="w-full rounded-2xl border border-tt-line bg-white py-3 pl-10 pr-4 text-sm text-tt-ink outline-none focus:border-tt-pink/40"
        />
      </div>

      {/* Create dish form */}
      {showForm && (
        <div className="tt-card animate-ttFadeUp rounded-2xl border border-tt-line p-4 shadow-tt">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-tt-ink">{t.newDish}</h3>
            <button
              onClick={() => { setShowForm(false); setError(null); setPhotoFile(null); setPhotoPreview('') }}
              className="grid h-8 w-8 place-items-center rounded-full bg-tt-surfaceAlt2 text-tt-muted transition hover:text-tt-ink"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {/* Photo upload */}
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-bold text-tt-ink">{t.dishPhoto}</label>
              <div className="flex items-center gap-3">
                <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-dashed border-tt-line bg-tt-surfaceAlt">
                  {photoPreview ? (
                    <img src={photoPreview} alt="anteprima" className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-tt-muted opacity-50" />
                  )}
                </div>
                <label className="flex cursor-pointer items-center gap-1.5 rounded-full border border-tt-line bg-white px-3 py-2 text-xs font-semibold text-tt-muted transition hover:text-tt-ink">
                  <Upload className="h-3.5 w-3.5" />
                  {photoFile ? t.changePhoto : t.uploadPhoto}
                  <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                </label>
                {photoFile && (
                  <button
                    onClick={() => { setPhotoFile(null); setPhotoPreview('') }}
                    className="text-xs font-semibold text-tt-danger hover:underline"
                  >
                    {t.remove}
                  </button>
                )}
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-bold text-tt-ink">{t.name}</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t.namePlaceholder}
                className="w-full rounded-xl border border-tt-line bg-white px-3 py-2.5 text-sm text-tt-ink outline-none focus:border-tt-pink/40"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-tt-ink">{t.price}</label>
              <input
                inputMode="decimal"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder={t.pricePlaceholder}
                className="w-full rounded-xl border border-tt-line bg-white px-3 py-2.5 text-sm text-tt-ink outline-none focus:border-tt-pink/40"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-tt-ink">{t.category}</label>
              <div className="relative">
                <select
                  value={form.category_id}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  className="w-full appearance-none rounded-xl border border-tt-line bg-white px-3 py-2.5 pr-9 text-sm text-tt-ink outline-none focus:border-tt-pink/40"
                >
                  <option value="">{t.selectCategory}</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}{c.is_drink ? ' 🥤' : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tt-muted" />
              </div>
              {categories.length === 0 && (
                <p className="mt-1 text-[11px] text-tt-muted">{t.noCategoriesDb}</p>
              )}
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-bold text-tt-ink">{t.description}</label>
              <textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={t.descriptionPlaceholder}
                className="w-full resize-none rounded-xl border border-tt-line bg-white px-3 py-2.5 text-sm text-tt-ink outline-none focus:border-tt-pink/40"
              />
            </div>
            <div className="flex flex-wrap gap-4 sm:col-span-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-tt-ink">
                <input
                  type="checkbox"
                  checked={form.is_vegetarian}
                  onChange={(e) => setForm({ ...form, is_vegetarian: e.target.checked })}
                  className="h-4 w-4 accent-emerald-600"
                />
                <Leaf className="h-4 w-4 text-emerald-600" /> {t.vegetarian}
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-tt-ink">
                <input
                  type="checkbox"
                  checked={form.is_gluten_free}
                  onChange={(e) => setForm({ ...form, is_gluten_free: e.target.checked })}
                  className="h-4 w-4 accent-amber-600"
                />
                <WheatOff className="h-4 w-4 text-amber-600" /> {t.glutenFree}
              </label>
            </div>
          </div>
          {error && (
            <p className="mt-3 rounded-lg bg-tt-danger/10 px-3 py-2 text-xs text-tt-danger">{error}</p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={handleCreate}
              disabled={saving || !form.name.trim() || !form.price}
              className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-brand-amber to-brand-terra px-5 py-2.5 text-sm font-bold text-white shadow-glow-amber transition hover:scale-105 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {t.createDish}
            </button>
            <button
              onClick={() => { setShowForm(false); setError(null); setPhotoFile(null); setPhotoPreview('') }}
              className="rounded-full border border-tt-line bg-white px-4 py-2.5 text-sm font-bold text-tt-muted transition hover:text-tt-ink"
            >
              {t.cancel}
            </button>
          </div>
        </div>
      )}

      {/* Items list — mobile: image + content stack, cleaner layout */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-tt-muted">
          <Utensils className="mx-auto mb-2 h-8 w-8 opacity-40" />
          {t.emptyDb}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((it) => (
            <div key={it.id} className="tt-card flex flex-col gap-3 overflow-hidden rounded-2xl border border-tt-line p-3 shadow-tt sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl">
                  {it.image_url ? (
                    <img src={it.image_url} alt={it.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className={`grid h-full w-full place-items-center text-sm font-bold ${it.is_available ? 'bg-tt-pink/10 text-tt-pink' : 'bg-tt-surfaceAlt2 text-tt-muted'}`}>
                      <Utensils className="h-5 w-5" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h3 className="truncate text-sm font-bold text-tt-ink">{it.name}</h3>
                    {it.is_vegetarian && (
                      <span className="grid h-4 w-4 shrink-0 place-items-center rounded bg-emerald-100 text-emerald-700">
                        <Leaf className="h-2.5 w-2.5" />
                      </span>
                    )}
                    {it.is_gluten_free && (
                      <span className="grid h-4 w-4 shrink-0 place-items-center rounded bg-amber-100 text-amber-700">
                        <WheatOff className="h-2.5 w-2.5" />
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-tt-muted">
                    {categoryName(it.category_id)} · {(it.price_cents / 100).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                <button
                  onClick={() => toggleAvail(it)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition ${it.is_available ? 'bg-tt-success/15 text-tt-success' : 'bg-tt-muted/15 text-tt-muted'}`}
                >
                  {it.is_available ? t.available : t.soldOut}
                </button>
                <button className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-tt-muted transition hover:bg-tt-surfaceAlt2 hover:text-tt-ink">
                  <Pencil className="h-4 w-4" />
                </button>
                <button className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-tt-muted transition hover:bg-tt-danger/10 hover:text-tt-danger">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

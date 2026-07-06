'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, Leaf, WheatOff, Pencil, Trash2, Utensils, AlertCircle, X, Check, Loader2, ImageIcon, Upload, ChevronDown, FileJson, UploadCloud, ShieldAlert } from 'lucide-react'
import type { RestaurantCtx, ThemeMode } from '../types'
import {
  getMenuItems,
  getMenuCategories,
  toggleMenuItemAvailability,
  createMenuItem,
  createMenuCategory,
  uploadMenuItemPhoto,
  deleteAllMenuItems,
  updateMenuItem,
  deleteMenuItem,
  type MenuItem,
  type MenuCategory,
} from '@/lib/admin-service'
import { useI18n } from '@/components/i18n/I18nProvider'

interface Props {
  ctx: RestaurantCtx
  theme: ThemeMode
}

function AnimatedCheckbox({
  checked,
  onChange,
  icon,
  label,
  activeBoxClass,
  activeTextClass,
}: {
  checked: boolean
  onChange: () => void
  icon: React.ReactNode
  label: string
  activeBoxClass: string
  activeTextClass: string
}) {
  return (
    <label className="flex cursor-pointer select-none items-center gap-2 text-sm">
      <span className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="absolute inset-0 z-10 cursor-pointer opacity-0"
        />
        <motion.span
          animate={{ scale: checked ? 1 : 1 }}
          whileTap={{ scale: 0.85 }}
          transition={{ type: 'spring', stiffness: 500, damping: 28 }}
          className={`h-5 w-5 rounded-md border-2 transition-colors duration-200 ${
            checked ? activeBoxClass : 'border-tt-line bg-white'
          }`}
        />
        <AnimatePresence>
          {checked && (
            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 550, damping: 24 }}
              className="pointer-events-none absolute inset-0 grid place-items-center text-white"
            >
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
            </motion.span>
          )}
        </AnimatePresence>
      </span>
      <span className={`flex items-center gap-1 transition-colors duration-200 ${checked ? activeTextClass : 'text-tt-muted'}`}>
        {icon} {label}
      </span>
    </label>
  )
}

function CategorySelect({
  categories,
  value,
  onChange,
  placeholder,
}: {
  categories: MenuCategory[]
  value: string
  onChange: (id: string) => void
  placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const selected = categories.find((c) => c.id === value)

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-xl border border-tt-line bg-white px-3 py-2.5 text-left text-sm text-tt-ink outline-none transition focus:border-tt-pink/40"
      >
        <span className={selected ? 'text-tt-ink' : 'text-tt-muted'}>
          {selected ? selected.name : placeholder}
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.15 }}>
          <ChevronDown className="h-4 w-4 text-tt-muted" />
        </motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute z-20 mt-1.5 max-h-56 w-full overflow-y-auto rounded-xl border border-tt-line bg-white p-1 shadow-xl"
          >
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false) }}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition hover:bg-tt-surfaceAlt2 ${!value ? 'font-bold text-tt-pink' : 'text-tt-muted'}`}
            >
              {placeholder}
              {!value && <Check className="h-3.5 w-3.5" />}
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => { onChange(c.id); setOpen(false) }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition hover:bg-tt-surfaceAlt2 ${value === c.id ? 'font-bold text-tt-pink' : 'text-tt-ink'}`}
              >
                {c.name}
                {value === c.id && <Check className="h-3.5 w-3.5" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
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
    allergens: '',
  })
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string>('')
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    price: '',
    category_id: '',
    is_vegetarian: false,
    is_gluten_free: false,
    allergens: '',
  })
  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null)
  const [editPhotoPreview, setEditPhotoPreview] = useState<string>('')
  const [editPhotoRemoved, setEditPhotoRemoved] = useState(false)
  const [showRemovePhotoConfirm, setShowRemovePhotoConfirm] = useState(false)
  const [showPhotoZoom, setShowPhotoZoom] = useState(false)
  const [confirmDeleteItem, setConfirmDeleteItem] = useState<MenuItem | null>(null)
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null)
  const [deleteItemError, setDeleteItemError] = useState<string | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [importRowErrors, setImportRowErrors] = useState<string[]>([])
  const [importing, setImporting] = useState(false)
  const [importSuccess, setImportSuccess] = useState<number | null>(null)
  const [importDuplicates, setImportDuplicates] = useState<number>(0)
  const [showDeleteMenu, setShowDeleteMenu] = useState(false)
  const [deleteMenuConfirmName, setDeleteMenuConfirmName] = useState('')
  const [deletingMenu, setDeletingMenu] = useState(false)
  const [deleteMenuError, setDeleteMenuError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

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

  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  const MAX_IMAGE_BYTES = 5 * 1024 * 1024

  // Magic-byte signatures: the declared MIME type/extension can be spoofed, so we sniff the real header.
  async function sniffImageType(file: File): Promise<string | null> {
    const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer())
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
    if (hex.startsWith('ffd8ff')) return 'image/jpeg'
    if (hex.startsWith('89504e470d0a1a0a')) return 'image/png'
    if (hex.startsWith('47494638')) return 'image/gif'
    if (hex.startsWith('52494646') && hex.slice(16, 24) === '57454250') return 'image/webp'
    return null
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError(t.invalidImageType)
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError(t.imageTooLarge)
      return
    }
    const sniffed = await sniffImageType(file)
    if (!sniffed || sniffed !== file.type) {
      setError(t.invalidImageType)
      return
    }
    setError(null)
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
        allergens: form.allergens.split(',').map((a) => a.trim()).filter(Boolean),
        image_url: imageUrl,
      } as Omit<MenuItem, 'id' | 'created_at'>)
      setItems((prev) => [created, ...prev])
      setForm({ name: '', description: '', price: '', category_id: '', is_vegetarian: false, is_gluten_free: false, allergens: '' })
      setPhotoFile(null)
      setPhotoPreview('')
      setShowForm(false)
    } catch (e: any) {
      setError(e.message ?? t.errorCreate)
    } finally {
      setSaving(false)
    }
  }

  function openEdit(it: MenuItem) {
    setEditingItem(it)
    setEditError(null)
    setEditPhotoFile(null)
    setEditPhotoPreview(it.image_url || '')
    setEditPhotoRemoved(false)
    setEditForm({
      name: it.name ?? '',
      description: it.description ?? '',
      price: (it.price_cents / 100).toFixed(2).replace('.', ','),
      category_id: it.category_id ?? '',
      is_vegetarian: !!it.is_vegetarian,
      is_gluten_free: !!it.is_gluten_free,
      allergens: (it.allergens ?? []).join(', '),
    })
  }

  function closeEdit() {
    setEditingItem(null)
    setEditPhotoFile(null)
    setEditPhotoPreview('')
    setEditError(null)
  }

  async function handleEditPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setEditError(t.invalidImageType)
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setEditError(t.imageTooLarge)
      return
    }
    const sniffed = await sniffImageType(file)
    if (!sniffed || sniffed !== file.type) {
      setEditError(t.invalidImageType)
      return
    }
    setEditError(null)
    setEditPhotoFile(file)
    setEditPhotoPreview(URL.createObjectURL(file))
    setEditPhotoRemoved(false)
  }

  function confirmRemoveEditPhoto() {
    setEditPhotoFile(null)
    setEditPhotoPreview('')
    setEditPhotoRemoved(true)
    setShowRemovePhotoConfirm(false)
  }

  async function handleSaveEdit() {
    if (!editingItem) return
    if (!editForm.name.trim() || !editForm.price) return
    setEditSaving(true)
    setEditError(null)
    try {
      const priceCents = Math.round(parseFloat(editForm.price.replace(',', '.')) * 100)
      if (isNaN(priceCents) || priceCents < 0) throw new Error(t.invalidPrice)

      let imageUrl = editPhotoRemoved ? null : editingItem.image_url ?? null
      if (editPhotoFile) {
        try {
          imageUrl = await uploadMenuItemPhoto(editPhotoFile, ctx.restaurantId)
        } catch {
          // storage may not be configured — keep previous image
        }
      }

      const updates = {
        category_id: editForm.category_id || (null as any),
        name: editForm.name.trim(),
        description: editForm.description.trim(),
        price_cents: priceCents,
        is_vegetarian: editForm.is_vegetarian,
        is_gluten_free: editForm.is_gluten_free,
        allergens: editForm.allergens.split(',').map((a) => a.trim()).filter(Boolean),
        image_url: imageUrl,
      }

      await updateMenuItem(editingItem.id, updates)
      setItems((prev) => prev.map((i) => (i.id === editingItem.id ? { ...i, ...updates } : i)))
      closeEdit()
    } catch (e: any) {
      setEditError(e.message ?? t.errorUpdate)
    } finally {
      setEditSaving(false)
    }
  }

  async function handleDeleteItemConfirmed() {
    if (!confirmDeleteItem) return
    const id = confirmDeleteItem.id
    setDeletingItemId(id)
    setDeleteItemError(null)
    try {
      await deleteMenuItem(id)
      setItems((prev) => prev.filter((i) => i.id !== id))
      setConfirmDeleteItem(null)
    } catch (e: any) {
      setDeleteItemError(e.message ?? t.errorDeleteItem)
    } finally {
      setDeletingItemId(null)
    }
  }

  function resetImportState() {
    setImportFile(null)
    setImportError(null)
    setImportRowErrors([])
    setImportSuccess(null)
  }

  const deleteMenuConfirmPhrase = t.deleteMenuConfirmPhraseF(ctx.restaurantName.trim())

  async function handleDeleteMenu() {
    if (deleteMenuConfirmName.trim().toLowerCase() !== deleteMenuConfirmPhrase.toLowerCase()) {
      setDeleteMenuError(t.deleteMenuNameMismatch)
      return
    }
    setDeletingMenu(true)
    setDeleteMenuError(null)
    try {
      await deleteAllMenuItems(ctx.restaurantId)
      setItems([])
      setShowDeleteMenu(false)
      setDeleteMenuConfirmName('')
    } catch {
      setDeleteMenuError(t.deleteMenuErrorGeneric)
    } finally {
      setDeletingMenu(false)
    }
  }

  const MAX_IMPORT_BYTES = 2 * 1024 * 1024

  const ALLOWED_IMPORT_TYPES = ['application/json', 'application/pdf', 'image/jpeg', 'image/png', 'image/webp']
  const MAX_EXTRACT_BYTES = 15 * 1024 * 1024

  function handleImportFileSelect(file: File | null) {
    if (!file) return
    const isJson = file.type === 'application/json' || file.name.toLowerCase().endsWith('.json')
    const isAllowed = isJson || ALLOWED_IMPORT_TYPES.includes(file.type)
    if (!isAllowed) {
      setImportError(t.importInvalidFileType)
      setImportFile(null)
      return
    }
    const maxBytes = isJson ? MAX_IMPORT_BYTES : MAX_EXTRACT_BYTES
    if (file.size > maxBytes) {
      setImportError(isJson ? t.importFileTooLarge : t.importFileTooLargeExtract)
      setImportFile(null)
      return
    }
    setImportFile(file)
    setImportError(null)
    setImportRowErrors([])
    setImportSuccess(null)
  }

  async function handleImportSubmit() {
    if (!importFile) return
    setImporting(true)
    setImportError(null)
    setImportRowErrors([])
    setImportSuccess(null)
    setImportDuplicates(0)
    try {
      const isJsonFile = importFile.type === 'application/json' || importFile.name.toLowerCase().endsWith('.json')
      let rows: unknown

      if (isJsonFile) {
        const text = await importFile.text()
        try {
          rows = JSON.parse(text)
        } catch {
          throw new Error(t.importInvalidJson)
        }
        rows = Array.isArray(rows) ? rows : (rows as any)?.items
      } else {
        const body = new FormData()
        body.append('file', importFile)
        const res = await fetch('/api/menu/extract', { method: 'POST', body })
        const data = await res.json().catch(() => null)
        if (!res.ok || !data) {
          throw new Error(data?.error ?? t.importExtractFailed)
        }
        rows = data.items
      }
      if (!Array.isArray(rows) || rows.length === 0) {
        throw new Error(t.importEmptyArray)
      }
      if (rows.length > 500) {
        throw new Error(t.importTooManyRows)
      }
      if (!rows.every((r) => r !== null && typeof r === 'object' && !Array.isArray(r))) {
        throw new Error(t.importInvalidJson)
      }

      const categoryByName = new Map(categories.map((c) => [c.name.trim().toLowerCase(), c]))
      const existingNames = new Set(items.map((i) => i.name.trim().toLowerCase()))
      const rowErrors: string[] = []
      const created: MenuItem[] = []
      const newCategories: MenuCategory[] = []
      let duplicates = 0

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i] ?? {}
        const name = typeof row.name === 'string' ? row.name.trim() : ''
        if (!name) {
          rowErrors.push(t.importErrorRow(i + 1, t.importMissingName))
          continue
        }
        if (existingNames.has(name.toLowerCase())) {
          duplicates++
          continue
        }
        const priceValue = row.price_cents ?? row.price
        const priceCents =
          typeof row.price_cents === 'number'
            ? Math.round(row.price_cents)
            : Math.round(parseFloat(String(priceValue).replace(',', '.')) * 100)
        if (!priceValue || isNaN(priceCents) || priceCents < 0) {
          rowErrors.push(t.importErrorRow(i + 1, t.importMissingPrice))
          continue
        }

        let categoryId: string | null = null
        const categoryName = typeof row.category === 'string' ? row.category.trim() : ''
        if (categoryName) {
          const key = categoryName.toLowerCase()
          let cat = categoryByName.get(key)
          if (!cat) {
            cat = await createMenuCategory(ctx.restaurantId, categoryName, !!row.is_drink)
            categoryByName.set(key, cat)
            newCategories.push(cat)
          }
          categoryId = cat.id
        }

        try {
          const item = await createMenuItem({
            restaurant_id: ctx.restaurantId,
            category_id: categoryId as any,
            name,
            description: typeof row.description === 'string' ? row.description.trim() : '',
            price_cents: priceCents,
            is_available: true,
            is_vegetarian: !!row.is_vegetarian,
            is_gluten_free: !!row.is_gluten_free,
            allergens: Array.isArray(row.allergens)
              ? row.allergens.map((a: unknown) => String(a).trim()).filter(Boolean)
              : typeof row.allergens === 'string'
                ? row.allergens.split(',').map((a) => a.trim()).filter(Boolean)
                : [],
            image_url: null,
          } as Omit<MenuItem, 'id' | 'created_at'>)
          created.push(item)
          existingNames.add(name.toLowerCase())
        } catch (e: any) {
          rowErrors.push(t.importErrorRow(i + 1, e.message ?? ''))
        }
      }

      if (newCategories.length > 0) setCategories((prev) => [...prev, ...newCategories])
      if (created.length > 0) setItems((prev) => [...created, ...prev])
      setImportRowErrors(rowErrors)
      setImportSuccess(created.length)
      setImportDuplicates(duplicates)
      if (created.length > 0 && rowErrors.length === 0 && duplicates === 0) {
        setImportFile(null)
      }
    } catch (e: any) {
      setImportError(e.message ?? t.errorCreate)
    } finally {
      setImporting(false)
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
    <div className="relative space-y-4">
      <button
        onClick={() => {
          setDeleteMenuConfirmName('')
          setDeleteMenuError(null)
          setShowDeleteMenu(true)
        }}
        title={t.deleteMenuButton}
        className="absolute right-0 top-0 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-tt-danger/30 text-tt-danger transition hover:bg-tt-danger/10"
      >
        <ShieldAlert className="h-4 w-4" />
      </button>
      <div className="flex flex-wrap items-center justify-between gap-2 pr-11">
        <div>
          <h2 className="font-serif text-xl font-extrabold text-tt-ink">{t.title}</h2>
          <p className="text-xs text-tt-muted">
            {t.countF(items.length, items.filter((i) => i.is_available).length)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { resetImportState(); setShowImport(true) }}
            className="flex items-center gap-1.5 rounded-full border border-tt-line bg-white px-4 py-2 text-sm font-bold text-tt-ink transition hover:bg-tt-surfaceAlt2"
          >
            <FileJson className="h-4 w-4" /> {t.import}
          </button>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-brand-amber to-brand-terra px-4 py-2 text-sm font-bold text-white shadow-glow-amber transition hover:scale-105"
          >
            <Plus className="h-4 w-4" /> {t.newDish}
          </button>
        </div>
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
              <CategorySelect
                categories={categories}
                value={form.category_id}
                onChange={(id) => setForm({ ...form, category_id: id })}
                placeholder={t.selectCategory}
              />
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
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-bold text-tt-ink">{t.allergens}</label>
              <input
                value={form.allergens}
                onChange={(e) => setForm({ ...form, allergens: e.target.value })}
                placeholder={t.allergensPlaceholder}
                className="w-full rounded-xl border border-tt-line bg-white px-3 py-2.5 text-sm text-tt-ink outline-none focus:border-tt-pink/40"
              />
            </div>
            <div className="flex flex-wrap gap-4 sm:col-span-2">
              <AnimatedCheckbox
                checked={form.is_vegetarian}
                onChange={() => setForm({ ...form, is_vegetarian: !form.is_vegetarian })}
                icon={<Leaf className="h-4 w-4 text-emerald-600" />}
                label={t.vegetarian}
                activeBoxClass="border-emerald-600 bg-emerald-600"
                activeTextClass="text-emerald-700"
              />
              <AnimatedCheckbox
                checked={form.is_gluten_free}
                onChange={() => setForm({ ...form, is_gluten_free: !form.is_gluten_free })}
                icon={<WheatOff className="h-4 w-4 text-amber-600" />}
                label={t.glutenFree}
                activeBoxClass="border-amber-600 bg-amber-600"
                activeTextClass="text-amber-700"
              />
            </div>
          </div>
          {error && (
            <p className="mt-3 rounded-lg bg-tt-danger/10 px-3 py-2 text-xs text-tt-danger">{error}</p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => { setShowForm(false); setError(null); setPhotoFile(null); setPhotoPreview('') }}
              className="rounded-full border border-tt-line bg-white px-4 py-2.5 text-sm font-bold text-tt-muted transition hover:text-tt-ink"
            >
              {t.back}
            </button>
            <button
              onClick={handleCreate}
              disabled={saving || !form.name.trim() || !form.price}
              className="flex items-center gap-1.5 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {t.createDish}
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
            <div
              key={it.id}
              className="tt-card flex flex-col gap-3 overflow-hidden rounded-2xl border border-tt-line p-3 shadow-tt transition-colors sm:flex-row sm:items-center"
              style={!it.is_available ? { background: 'oklch(0.88 0.005 60)' } : undefined}
            >
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
                  {it.allergens?.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {it.allergens.map((a) => (
                        <span key={a} className="rounded-full bg-tt-surfaceAlt2 px-2 py-0.5 text-[10px] font-semibold text-tt-muted">
                          {a}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                <button
                  onClick={() => toggleAvail(it)}
                  title={it.is_available ? t.available : t.soldOut}
                  aria-pressed={it.is_available}
                  className={`relative flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${it.is_available ? 'bg-tt-success' : 'bg-tt-muted/40'}`}
                >
                  <motion.span
                    layout
                    transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                    className="h-5 w-5 rounded-full bg-white shadow"
                    style={{ marginLeft: it.is_available ? 'calc(100% - 1.25rem)' : '0.125rem' }}
                  />
                </button>
                <button
                  onClick={() => openEdit(it)}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-tt-muted transition hover:bg-tt-surfaceAlt2 hover:text-tt-ink"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => { setDeleteItemError(null); setConfirmDeleteItem(it) }}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-tt-muted transition hover:bg-tt-danger/10 hover:text-tt-danger"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Import menu modal */}
      <AnimatePresence>
        {showImport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={() => setShowImport(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              className="tt-scroll flex w-full max-w-lg flex-col overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl max-h-[90vh]"
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-serif text-lg font-extrabold text-tt-ink">{t.importTitle}</h3>
                <button
                  onClick={() => setShowImport(false)}
                  className="grid h-8 w-8 place-items-center rounded-full bg-tt-surfaceAlt2 text-tt-muted transition hover:text-tt-ink"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="text-xs text-tt-muted">{t.importHint}</p>

              <div className="mt-3 rounded-xl border border-tt-line bg-tt-surfaceAlt p-3">
                <p className="mb-1.5 text-[11px] font-bold text-tt-ink">{t.importFormatTitle}</p>
                <pre className="tt-scroll overflow-x-auto text-[11px] leading-relaxed text-tt-muted">
{`[
  {
    "name": "Margherita",
    "description": "Pomodoro, mozzarella, basilico",
    "price": 8.5,
    "category": "Pizze",
    "is_vegetarian": true,
    "is_gluten_free": false,
    "allergens": ["glutine", "latte"]
  }
]`}
                </pre>
              </div>

              <label
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setDragOver(false)
                  handleImportFileSelect(e.dataTransfer.files?.[0] ?? null)
                }}
                className={`mt-3 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition ${
                  dragOver ? 'border-tt-pink bg-tt-pink/5' : 'border-tt-line bg-white'
                }`}
              >
                <UploadCloud className="h-6 w-6 text-tt-muted" />
                <p className="text-xs font-semibold text-tt-ink">
                  {importFile ? t.importSelected(importFile.name) : t.importDropzone}
                </p>
                {importFile && <span className="text-[11px] font-semibold text-tt-pink underline">{t.importChangeFile}</span>}
                <input
                  type="file"
                  accept="application/json,.json,application/pdf,.pdf,image/jpeg,image/png,image/webp"
                  onChange={(e) => handleImportFileSelect(e.target.files?.[0] ?? null)}
                  className="hidden"
                />
              </label>

              {importError && (
                <p className="mt-3 rounded-lg bg-tt-danger/10 px-3 py-2 text-xs text-tt-danger">{importError}</p>
              )}
              {importRowErrors.length > 0 && (
                <div className="tt-scroll mt-3 max-h-28 space-y-1 overflow-y-auto rounded-lg bg-tt-danger/10 px-3 py-2 text-xs text-tt-danger">
                  {importRowErrors.map((msg, i) => (
                    <p key={i}>{msg}</p>
                  ))}
                </div>
              )}
              {importSuccess !== null && importSuccess > 0 && (
                <p className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-tt-success/10 px-3 py-2 text-xs text-tt-success">
                  <span>{t.importSuccessF(importSuccess)}</span>
                  <button
                    onClick={() => setShowImport(false)}
                    className="shrink-0 font-bold underline underline-offset-2 hover:opacity-80"
                  >
                    {t.goCheck}
                  </button>
                </p>
              )}
              <AnimatePresence>
                {importDuplicates > 0 && (
                  <motion.p
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                    className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-600"
                  >
                    {t.importDuplicatesF(importDuplicates)}
                  </motion.p>
                )}
              </AnimatePresence>

              <div className="mt-5 flex items-center gap-2">
                <button
                  onClick={() => setShowImport(false)}
                  className="flex h-11 flex-1 items-center justify-center rounded-full border border-tt-line bg-white px-4 text-sm font-bold text-tt-muted transition hover:text-tt-ink"
                >
                  {t.back}
                </button>
                <button
                  onClick={handleImportSubmit}
                  disabled={!importFile || importing}
                  className="flex h-11 items-center justify-center gap-1.5 rounded-full bg-emerald-600 px-4 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-60"
                >
                  {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileJson className="h-3.5 w-3.5" />}
                  {importing
                    ? (importFile && !(importFile.type === 'application/json' || importFile.name.toLowerCase().endsWith('.json'))
                        ? t.importExtracting
                        : t.importing)
                    : t.importButton}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDeleteMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
            onClick={() => !deletingMenu && setShowDeleteMenu(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl"
            >
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-tt-danger/10 text-tt-danger">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <h3 className="font-serif text-lg font-extrabold text-tt-ink">{t.deleteMenuTitle}</h3>
              <p className="mt-1 text-sm text-tt-muted">{t.deleteMenuHint}</p>
              <p className="mt-2 text-xs font-bold text-tt-ink">{deleteMenuConfirmPhrase}</p>
              <input
                type="text"
                value={deleteMenuConfirmName}
                onChange={(e) => setDeleteMenuConfirmName(e.target.value)}
                placeholder={deleteMenuConfirmPhrase}
                className="mt-3 w-full rounded-xl border border-tt-line bg-tt-surfaceAlt px-3 py-2 text-sm text-tt-ink outline-none focus:border-tt-danger"
              />
              <AnimatePresence>
                {deleteMenuError && (
                  <motion.p
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="mt-2 text-xs font-semibold text-tt-danger"
                  >
                    {deleteMenuError}
                  </motion.p>
                )}
              </AnimatePresence>
              <div className="mt-5 flex items-center gap-2">
                <button
                  onClick={() => setShowDeleteMenu(false)}
                  disabled={deletingMenu}
                  className="flex h-11 flex-1 items-center justify-center rounded-full border border-tt-line bg-white px-4 text-sm font-bold text-tt-muted transition hover:text-tt-ink disabled:opacity-60"
                >
                  {t.back}
                </button>
                <button
                  onClick={handleDeleteMenu}
                  disabled={deletingMenu || !deleteMenuConfirmName.trim()}
                  className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-tt-danger px-4 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
                >
                  {deletingMenu ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  {t.deleteMenuConfirmButton}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={() => !editSaving && closeEdit()}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              className="tt-card max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-tt-line p-4 shadow-tt"
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-tt-ink">{t.editDish}</h3>
                <button
                  onClick={() => !editSaving && closeEdit()}
                  className="grid h-8 w-8 place-items-center rounded-full bg-tt-surfaceAlt2 text-tt-muted transition hover:text-tt-ink"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-bold text-tt-ink">{t.dishPhoto}</label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => editPhotoPreview && setShowPhotoZoom(true)}
                      disabled={!editPhotoPreview}
                      title={editPhotoPreview ? t.viewPhoto : undefined}
                      className="group relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-dashed border-tt-line bg-tt-surfaceAlt disabled:cursor-default"
                    >
                      {editPhotoPreview ? (
                        <img src={editPhotoPreview} alt="anteprima" className="h-full w-full object-cover transition group-hover:brightness-90" />
                      ) : (
                        <ImageIcon className="h-6 w-6 text-tt-muted opacity-50" />
                      )}
                    </button>
                    <label className="flex cursor-pointer items-center gap-1.5 rounded-full border border-tt-line bg-white px-3 py-2 text-xs font-semibold text-tt-muted transition hover:text-tt-ink">
                      <Upload className="h-3.5 w-3.5" />
                      {editPhotoFile ? t.changePhoto : t.uploadPhoto}
                      <input type="file" accept="image/*" onChange={handleEditPhotoChange} className="hidden" />
                    </label>
                    {editPhotoPreview && (
                      <button
                        type="button"
                        onClick={() => setShowRemovePhotoConfirm(true)}
                        title={t.removePhoto}
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-tt-danger/30 text-tt-danger transition hover:bg-tt-danger/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-bold text-tt-ink">{t.name}</label>
                  <input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder={t.namePlaceholder}
                    className="w-full rounded-xl border border-tt-line bg-white px-3 py-2.5 text-sm text-tt-ink outline-none focus:border-tt-pink/40"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-tt-ink">{t.price}</label>
                  <input
                    inputMode="decimal"
                    value={editForm.price}
                    onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                    placeholder={t.pricePlaceholder}
                    className="w-full rounded-xl border border-tt-line bg-white px-3 py-2.5 text-sm text-tt-ink outline-none focus:border-tt-pink/40"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-tt-ink">{t.category}</label>
                  <CategorySelect
                    categories={categories}
                    value={editForm.category_id}
                    onChange={(id) => setEditForm({ ...editForm, category_id: id })}
                    placeholder={t.selectCategory}
                  />
                  {categories.length === 0 && (
                    <p className="mt-1 text-[11px] text-tt-muted">{t.noCategoriesDb}</p>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-bold text-tt-ink">{t.description}</label>
                  <textarea
                    rows={2}
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    placeholder={t.descriptionPlaceholder}
                    className="w-full resize-none rounded-xl border border-tt-line bg-white px-3 py-2.5 text-sm text-tt-ink outline-none focus:border-tt-pink/40"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-bold text-tt-ink">{t.allergens}</label>
                  <input
                    value={editForm.allergens}
                    onChange={(e) => setEditForm({ ...editForm, allergens: e.target.value })}
                    placeholder={t.allergensPlaceholder}
                    className="w-full rounded-xl border border-tt-line bg-white px-3 py-2.5 text-sm text-tt-ink outline-none focus:border-tt-pink/40"
                  />
                </div>
                <div className="flex flex-wrap gap-4 sm:col-span-2">
                  <AnimatedCheckbox
                    checked={editForm.is_vegetarian}
                    onChange={() => setEditForm({ ...editForm, is_vegetarian: !editForm.is_vegetarian })}
                    icon={<Leaf className="h-4 w-4 text-emerald-600" />}
                    label={t.vegetarian}
                    activeBoxClass="border-emerald-600 bg-emerald-600"
                    activeTextClass="text-emerald-700"
                  />
                  <AnimatedCheckbox
                    checked={editForm.is_gluten_free}
                    onChange={() => setEditForm({ ...editForm, is_gluten_free: !editForm.is_gluten_free })}
                    icon={<WheatOff className="h-4 w-4 text-amber-600" />}
                    label={t.glutenFree}
                    activeBoxClass="border-amber-600 bg-amber-600"
                    activeTextClass="text-amber-700"
                  />
                </div>
              </div>
              {editError && (
                <p className="mt-3 rounded-lg bg-tt-danger/10 px-3 py-2 text-xs text-tt-danger">{editError}</p>
              )}
              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={() => !editSaving && closeEdit()}
                  className="flex h-11 flex-1 items-center justify-center rounded-full border border-tt-line bg-white px-4 text-sm font-bold text-tt-muted transition hover:text-tt-ink"
                >
                  {t.back}
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={editSaving || !editForm.name.trim() || !editForm.price}
                  className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-emerald-600 px-4 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
                >
                  {editSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {t.saveChanges}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmDeleteItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={() => !deletingItemId && setConfirmDeleteItem(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 16 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl"
            >
              <div className="relative mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-tt-danger/15 text-tt-danger">
                {deletingItemId === confirmDeleteItem.id ? (
                  <Loader2 className="h-7 w-7 animate-spin" />
                ) : (
                  <Trash2 className="h-7 w-7" />
                )}
              </div>
              <h3 className="font-serif text-lg font-extrabold text-tt-ink">{t.deleteItemTitle}</h3>
              <p className="mt-2 text-sm text-tt-muted">
                {t.deleteItemPrefix} <span className="font-bold text-tt-ink">{confirmDeleteItem.name}</span>.
                {t.deleteItemIrreversible}
              </p>
              {deleteItemError && (
                <p className="mt-2 rounded-lg bg-tt-danger/10 px-3 py-2 text-xs text-tt-danger">{deleteItemError}</p>
              )}
              <div className="mt-5 flex items-center gap-2">
                <button
                  onClick={() => setConfirmDeleteItem(null)}
                  disabled={deletingItemId === confirmDeleteItem.id}
                  className="flex h-11 flex-1 items-center justify-center rounded-full border border-tt-line bg-white px-4 text-sm font-bold text-tt-muted transition hover:text-tt-ink disabled:opacity-60"
                >
                  {t.back}
                </button>
                <button
                  onClick={handleDeleteItemConfirmed}
                  disabled={deletingItemId === confirmDeleteItem.id}
                  className="flex h-11 items-center justify-center gap-1.5 rounded-full bg-tt-danger px-4 text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-60"
                >
                  {deletingItemId === confirmDeleteItem.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  {t.deletePermanently}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPhotoZoom && editPhotoPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4"
            onClick={() => setShowPhotoZoom(false)}
          >
            <motion.img
              src={editPhotoPreview}
              alt="anteprima"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[85vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl"
            />
            <button
              onClick={() => setShowPhotoZoom(false)}
              className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRemovePhotoConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
            onClick={() => setShowRemovePhotoConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xs rounded-3xl bg-white p-6 text-center shadow-2xl"
            >
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-tt-danger/10 text-tt-danger">
                <Trash2 className="h-6 w-6" />
              </div>
              <h3 className="font-serif text-lg font-extrabold text-tt-ink">{t.removePhotoTitle}</h3>
              <p className="mt-1 text-sm text-tt-muted">{t.removePhotoHint}</p>
              <div className="mt-5 flex items-center gap-2">
                <button
                  onClick={() => setShowRemovePhotoConfirm(false)}
                  className="flex h-11 flex-1 items-center justify-center rounded-full border border-tt-line bg-white px-4 text-sm font-bold text-tt-muted transition hover:text-tt-ink"
                >
                  {t.back}
                </button>
                <button
                  onClick={confirmRemoveEditPhoto}
                  className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-tt-danger px-4 text-sm font-bold text-white transition hover:opacity-90"
                >
                  <Trash2 className="h-4 w-4" />
                  {t.deletePermanently}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

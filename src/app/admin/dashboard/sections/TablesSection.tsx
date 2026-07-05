'use client'

import { useEffect, useState } from 'react'
import { QrCode, Plus, Copy, Trash2, AlertCircle, Check, X, Loader2, Download, Printer } from 'lucide-react'
import type { RestaurantCtx, ThemeMode } from '../types'
import { getTables, createTable, deleteTable, setTableActive, type Table } from '@/lib/admin-service'
import { useI18n } from '@/components/i18n/I18nProvider'

interface Props {
  ctx: RestaurantCtx
  theme: ThemeMode
}

function generateCode(label: string): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const prefix = label.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'TAV'
  let suffix = ''
  for (let i = 0; i < 4; i++) suffix += chars[Math.floor(Math.random() * chars.length)]
  return `${prefix}-${suffix}`
}

function buildOrderUrl(code: string): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/scan/${code}`
  }
  return `/scan/${code}`
}

export function TablesSection({ ctx }: Props) {
  const { tr } = useI18n()
  const T = tr.admin.tables
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Table | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    getTables(ctx.restaurantId)
      .then((data) => {
        if (active) setTables(data)
      })
      .catch((e) => {
        if (active) setError(e.message ?? T.errorLoad)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [ctx.restaurantId])

  async function handleAdd() {
    const label = newLabel.trim()
    if (!label) return
    setSaving(true)
    setError(null)
    try {
      const code = generateCode(label)
      const created = await createTable(ctx.restaurantId, label, code)
      setTables((prev) => [...prev, created])
      setNewLabel('')
      setShowForm(false)
    } catch (e: any) {
      setError(e.message ?? T.errorCreate)
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive(t: Table) {
    const next = !t.is_active
    setTables((prev) => prev.map((x) => x.id === t.id ? { ...x, is_active: next } : x))
    try {
      await setTableActive(t.id, next)
    } catch (e: any) {
      setTables((prev) => prev.map((x) => x.id === t.id ? { ...x, is_active: !next } : x))
      setError(e?.message ?? 'Errore')
    }
  }

  async function handleDeleteConfirmed() {
    if (!confirmDelete) return
    const id = confirmDelete.id
    setDeletingId(id)
    setError(null)
    try {
      await deleteTable(id)
      setTables((prev) => prev.filter((t) => t.id !== id))
      setConfirmDelete(null)
    } catch (e: any) {
      setError(e.message ?? T.errorDelete)
    } finally {
      setDeletingId(null)
    }
  }

  async function copyCode(t: Table) {
    await navigator.clipboard.writeText(t.code)
    setCopiedId(t.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  async function downloadQR(t: Table) {
    setDownloadingId(t.id)
    try {
      const orderUrl = buildOrderUrl(t.code)
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=10&data=${encodeURIComponent(orderUrl)}`
      const res = await fetch(qrUrl)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `QR-${t.label.replace(/\s+/g, '-')}-${t.code}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e: any) {
      setError(T.errorQrDownload(e.message ?? ''))
    } finally {
      setDownloadingId(null)
    }
  }

  function printQR(t: Table) {
    const orderUrl = buildOrderUrl(t.code)
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&margin=10&data=${encodeURIComponent(orderUrl)}`
    const win = window.open('', '_blank', 'width=600,height=700')
    if (!win) return
    win.document.write(`
      <html>
        <head>
          <title>${T.printTitle(t.label)}</title>
          <style>
            body { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; font-family: sans-serif; }
            img { width: 350px; height: 350px; }
            h1 { margin-top: 16px; font-size: 20px; }
          </style>
        </head>
        <body>
          <img src="${qrUrl}" onload="window.print()" />
          <h1>${t.label}</h1>
        </body>
      </html>
    `)
    win.document.close()
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-7 w-32 tt-skeleton rounded-full" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="tt-card h-40 rounded-2xl border border-tt-line p-4 shadow-tt">
              <div className="mb-3 flex justify-between">
                <div className="h-5 w-20 tt-skeleton rounded-full" />
                <div className="h-5 w-16 tt-skeleton rounded-full" />
              </div>
              <div className="h-14 w-full tt-skeleton rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error && tables.length === 0) {
    return (
      <div className="grid place-items-center py-16 text-center">
        <AlertCircle className="mb-3 h-10 w-10 text-tt-danger" />
        <p className="text-sm font-bold text-tt-ink">{T.error}</p>
        <p className="mt-1 max-w-xs text-xs text-tt-muted">{error}</p>
      </div>
    )
  }

  const active = tables.filter((t) => t.is_active).length

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-serif text-xl font-extrabold text-tt-ink">{T.title}</h2>
          <p className="text-xs text-tt-muted">{T.countF(tables.length, active)}</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-brand-amber to-brand-terra px-4 py-2 text-sm font-bold text-white shadow-glow-amber transition hover:scale-105"
        >
          <Plus className="h-4 w-4" /> {T.addTable}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-tt-danger/30 bg-tt-danger/10 px-3 py-2 text-xs text-tt-danger">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="tt-card animate-ttFadeUp rounded-2xl border border-tt-line p-4 shadow-tt">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-bold text-tt-ink">{T.tableName}</label>
              <input
                autoFocus
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                placeholder={T.tableNamePlaceholder}
                className="w-full rounded-xl border border-tt-line bg-white px-3 py-2.5 text-sm text-tt-ink outline-none focus:border-tt-pink/40"
              />
              <p className="mt-1 text-[11px] text-tt-muted">{T.qrAutoNote}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                disabled={saving || !newLabel.trim()}
                className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-brand-amber to-brand-terra px-4 py-2.5 text-sm font-bold text-white shadow-glow-amber transition hover:scale-105 disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {T.create}
              </button>
              <button
                onClick={() => { setShowForm(false); setNewLabel('') }}
                className="grid h-10 w-10 place-items-center rounded-full border border-tt-line bg-white text-tt-muted transition hover:text-tt-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tables grid */}
      {tables.length === 0 ? (
        <div className="tt-card rounded-2xl border border-dashed border-tt-line p-10 text-center shadow-tt">
          <QrCode className="mx-auto mb-3 h-10 w-10 text-tt-muted opacity-50" />
          <p className="text-sm font-bold text-tt-ink">{T.emptyDb}</p>
          <p className="mt-1 text-xs text-tt-muted">{T.emptyDbHint}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tables.map((t) => (
            <div
              key={t.id}
              className={`tt-card rounded-2xl border-2 p-4 shadow-tt ${t.is_active ? 'border-tt-pink/20' : 'border-tt-line opacity-60'}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-bold text-tt-ink">{t.label}</p>
                  <p className="text-[11px] text-tt-muted">{t.is_active ? T.active : T.disabled}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleToggleActive(t)}
                    role="switch"
                    aria-checked={t.is_active}
                    title={t.is_active ? T.disabled : T.active}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition ${t.is_active ? 'bg-tt-pink' : 'bg-tt-line'}`}
                  >
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${t.is_active ? 'left-[22px]' : 'left-0.5'}`} />
                  </button>
                  <button
                    onClick={() => printQR(t)}
                    className="tt-pill bg-emerald-500 text-white hover:bg-emerald-600"
                  >
                    <Printer className="h-3 w-3" /> {T.printQr}
                  </button>
                  <span className="tt-pill bg-tt-pink/10 text-tt-pink">{T.table}</span>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2 rounded-xl bg-tt-surfaceAlt p-2">
                <QrCode className="h-8 w-8 shrink-0 text-tt-pink" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-xs font-bold text-tt-ink">{t.code}</p>
                  <p className="text-[10px] text-tt-muted">{T.orderCode}</p>
                </div>
                <button
                  onClick={() => copyCode(t)}
                  className="grid h-7 w-7 place-items-center rounded-lg text-tt-muted transition hover:bg-tt-surfaceAlt2 hover:text-tt-ink"
                  title={T.copyCode}
                >
                  {copiedId === t.id ? <Check className="h-3.5 w-3.5 text-tt-success" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  onClick={() => downloadQR(t)}
                  disabled={downloadingId === t.id}
                  className="flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-brand-amber to-brand-terra py-1.5 text-xs font-bold text-white shadow-glow-amber transition hover:scale-105 disabled:opacity-60"
                >
                  {downloadingId === t.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                  {T.downloadQr}
                </button>
                <button
                  onClick={() => setConfirmDelete(t)}
                  className="flex items-center justify-center gap-1.5 rounded-full border border-tt-danger/30 bg-tt-danger/5 py-1.5 text-xs font-bold text-tt-danger transition hover:bg-tt-danger/10"
                >
                  <Trash2 className="h-3 w-3" /> {T.delete}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl"
          >
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-tt-danger/15 text-tt-danger">
              <Trash2 className="h-7 w-7" />
            </div>
            <h3 className="font-serif text-lg font-extrabold text-tt-ink">{T.deleteTitle}</h3>
            <p className="mt-2 text-sm text-tt-muted">
              {T.deletePrefix} <span className="font-bold text-tt-ink">{confirmDelete.label}</span> ({confirmDelete.code}).
              {T.deleteIrreversible}
            </p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={handleDeleteConfirmed}
                disabled={deletingId === confirmDelete.id}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-tt-danger py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
              >
                {deletingId === confirmDelete.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {T.deletePermanently}
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
                className="rounded-full border border-tt-line bg-white px-4 py-2.5 text-sm font-bold text-tt-muted transition hover:text-tt-ink"
              >
                {T.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

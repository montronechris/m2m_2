'use client'

// Modale di configurazione delle integrazioni delivery, montata da
// SettingsSection. Il gestore del ristorante abilita ogni piattaforma e
// inserisce le credenziali (api key / store id). Il webhook URL + token
// generato qui va incollato nella dashboard partner della piattaforma.

import { useEffect, useState } from 'react'
import { X, Copy, RefreshCw, Check, Loader2, ChevronDown } from 'lucide-react'
import {
  getPlatformIntegrations,
  ensureIntegration,
  upsertPlatformIntegration,
  regenerateWebhookToken,
  type PlatformIntegration,
  type DeliveryPlatformId,
} from '@/lib/admin-service'
import { DELIVERY_PLATFORMS } from '@/lib/delivery/normalize'

const PLATFORM_LABEL: Record<DeliveryPlatformId, string> = {
  glovo: 'Glovo',
  deliveroo: 'Deliveroo',
  ubereats: 'Uber Eats',
  justeat: 'Just Eat',
  other: 'Altra piattaforma',
}

interface Copy {
  title: string
  intro: string
  enabled: string
  apiKey: string
  storeId: string
  autoAccept: string
  autoAcceptHint: string
  webhookUrl: string
  webhookToken: string
  copy: string
  copied: string
  regenerate: string
  save: string
  saving: string
  saved: string
  close: string
  optional: string
}

interface Props {
  restaurantId: string
  copy: Copy
  onClose: () => void
  onSaved?: (msg: string) => void
}

export function DeliveryIntegrationsModal({
  restaurantId,
  copy,
  onClose,
  onSaved,
}: Props) {
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [expanded, setExpanded] = useState<DeliveryPlatformId | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [byPlatform, setByPlatform] = useState<
    Record<string, PlatformIntegration>
  >({})

  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  useEffect(() => {
    ;(async () => {
      try {
        const rows = await getPlatformIntegrations(restaurantId)
        const map: Record<string, PlatformIntegration> = {}
        rows.forEach((r) => (map[r.platform] = r))
        setByPlatform(map)
      } finally {
        setLoading(false)
      }
    })()
  }, [restaurantId])

  const openPlatform = async (platform: DeliveryPlatformId) => {
    if (expanded === platform) {
      setExpanded(null)
      return
    }
    setExpanded(platform)
    // Crea la riga (con token) al primo accesso alla piattaforma.
    if (!byPlatform[platform]) {
      try {
        const created = await ensureIntegration(restaurantId, platform)
        setByPlatform((prev) => ({ ...prev, [platform]: created }))
      } catch {
        /* ignore */
      }
    }
  }

  const patchLocal = (platform: string, patch: Partial<PlatformIntegration>) =>
    setByPlatform((prev) => ({
      ...prev,
      [platform]: { ...prev[platform], ...patch },
    }))

  const save = async (platform: DeliveryPlatformId) => {
    const cur = byPlatform[platform]
    if (!cur) return
    setBusy(true)
    try {
      const updated = await upsertPlatformIntegration({
        restaurantId,
        platform,
        enabled: cur.enabled,
        apiKey: cur.apiKey,
        storeId: cur.storeId,
        autoAccept: cur.autoAccept,
      })
      setByPlatform((prev) => ({ ...prev, [platform]: updated }))
      onSaved?.(copy.saved)
    } finally {
      setBusy(false)
    }
  }

  const regenerate = async (platform: DeliveryPlatformId) => {
    setBusy(true)
    try {
      const token = await regenerateWebhookToken(restaurantId, platform)
      patchLocal(platform, { webhookToken: token })
    } finally {
      setBusy(false)
    }
  }

  const doCopy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 1500)
    } catch {
      /* ignore */
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl animate-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between bg-gradient-to-r from-brand-amber to-brand-terra px-5 py-4 text-white">
          <h3 className="font-serif text-lg font-extrabold">{copy.title}</h3>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full bg-white/20"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-5">
          <p className="mb-4 text-sm text-tt-muted">{copy.intro}</p>

          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-12 animate-pulse rounded-2xl border border-tt-line bg-tt-surfaceAlt"
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {DELIVERY_PLATFORMS.map((platform) => {
                const cur = byPlatform[platform]
                const isOpen = expanded === platform
                const webhookUrl = cur
                  ? `${origin}/api/integrations/${platform}/webhook`
                  : ''
                return (
                  <div
                    key={platform}
                    className="overflow-hidden rounded-2xl border border-tt-line"
                  >
                    <button
                      onClick={() => openPlatform(platform)}
                      className="flex w-full items-center justify-between px-4 py-3 text-left"
                    >
                      <span className="flex items-center gap-2 font-bold text-tt-ink">
                        {PLATFORM_LABEL[platform]}
                        {cur?.enabled && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            ON
                          </span>
                        )}
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 text-tt-muted transition ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {isOpen && cur && (
                      <div className="space-y-3 border-t border-tt-line bg-tt-surfaceAlt/40 p-4">
                        {/* Enable toggle */}
                        <label className="flex items-center justify-between text-sm font-semibold text-tt-ink">
                          {copy.enabled}
                          <button
                            onClick={() =>
                              patchLocal(platform, { enabled: !cur.enabled })
                            }
                            className={`relative h-6 w-11 rounded-full transition ${
                              cur.enabled ? 'bg-emerald-500' : 'bg-neutral-300'
                            }`}
                          >
                            <span
                              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                                cur.enabled ? 'left-[22px]' : 'left-0.5'
                              }`}
                            />
                          </button>
                        </label>

                        {/* API key */}
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-tt-muted">
                            {copy.apiKey}{' '}
                            <span className="font-normal">({copy.optional})</span>
                          </label>
                          <input
                            type="text"
                            value={cur.apiKey ?? ''}
                            onChange={(e) =>
                              patchLocal(platform, { apiKey: e.target.value })
                            }
                            className="w-full rounded-xl border border-tt-line bg-white px-3 py-2 text-sm text-tt-ink"
                          />
                        </div>

                        {/* Store id */}
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-tt-muted">
                            {copy.storeId}{' '}
                            <span className="font-normal">({copy.optional})</span>
                          </label>
                          <input
                            type="text"
                            value={cur.storeId ?? ''}
                            onChange={(e) =>
                              patchLocal(platform, { storeId: e.target.value })
                            }
                            className="w-full rounded-xl border border-tt-line bg-white px-3 py-2 text-sm text-tt-ink"
                          />
                        </div>

                        {/* Auto accept */}
                        <label className="flex items-center justify-between text-sm font-semibold text-tt-ink">
                          <span>
                            {copy.autoAccept}
                            <span className="block text-[11px] font-normal text-tt-muted">
                              {copy.autoAcceptHint}
                            </span>
                          </span>
                          <button
                            onClick={() =>
                              patchLocal(platform, { autoAccept: !cur.autoAccept })
                            }
                            className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                              cur.autoAccept ? 'bg-emerald-500' : 'bg-neutral-300'
                            }`}
                          >
                            <span
                              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                                cur.autoAccept ? 'left-[22px]' : 'left-0.5'
                              }`}
                            />
                          </button>
                        </label>

                        {/* Webhook URL */}
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-tt-muted">
                            {copy.webhookUrl}
                          </label>
                          <div className="flex items-center gap-1.5">
                            <code className="flex-1 truncate rounded-xl border border-tt-line bg-white px-3 py-2 text-[11px] text-tt-ink">
                              {webhookUrl}
                            </code>
                            <button
                              onClick={() => doCopy(`url-${platform}`, webhookUrl)}
                              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-tt-line bg-white text-tt-muted hover:text-tt-ink"
                            >
                              {copiedKey === `url-${platform}` ? (
                                <Check className="h-4 w-4 text-emerald-600" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Webhook token */}
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-tt-muted">
                            {copy.webhookToken}
                          </label>
                          <div className="flex items-center gap-1.5">
                            <code className="flex-1 truncate rounded-xl border border-tt-line bg-white px-3 py-2 text-[11px] text-tt-ink">
                              {cur.webhookToken}
                            </code>
                            <button
                              onClick={() =>
                                doCopy(`tok-${platform}`, cur.webhookToken)
                              }
                              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-tt-line bg-white text-tt-muted hover:text-tt-ink"
                            >
                              {copiedKey === `tok-${platform}` ? (
                                <Check className="h-4 w-4 text-emerald-600" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </button>
                            <button
                              onClick={() => regenerate(platform)}
                              disabled={busy}
                              title={copy.regenerate}
                              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-tt-line bg-white text-tt-muted hover:text-tt-ink disabled:opacity-50"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        <button
                          onClick={() => save(platform)}
                          disabled={busy}
                          className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-amber to-brand-terra py-2.5 text-sm font-bold text-white shadow-glow-amber transition hover:opacity-90 disabled:opacity-60"
                        >
                          {busy ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                          {busy ? copy.saving : copy.save}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

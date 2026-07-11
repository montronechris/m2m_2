'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  Plus,
  Info,
  Leaf,
  WheatOff,
  Loader2,
  X,
  Sprout,
  AlertTriangle,
  ShoppingBag,
  ChefHat,
  Citrus,
} from 'lucide-react'
import React from 'react'
import type { Palette } from './palette'
import { restaurantAvatars } from '@/lib/restaurant-avatars'

export interface MenuItem {
  id: string
  name: string
  description?: string
  price_cents: number
  image_url?: string | null
  is_vegetarian?: boolean
  is_vegan?: boolean
  is_gluten_free?: boolean
  allergens?: string[]
  ingredients?: string[]
  story?: string | null
  category_id?: string
}

interface MenuItemCardProps {
  item: MenuItem
  onAdd: (item: MenuItem, originRect: DOMRect) => void
  isLoadingOptions?: boolean
  palette: Palette
  addLabel?: string
  restaurantName?: string
  restaurantLogoUrl?: string | null
  restaurantLogoIcon?: string | null
  restaurantLocation?: string | null
  tableCode?: string | null
  infoLabels?: {
    characteristics?: string
    ingredients?: string
    allergens?: string
    story?: string
    noInfo?: string
    addToCart?: string
    infoAria?: string
    price?: string
  }
}

export function MenuItemCard({
  item,
  onAdd,
  isLoadingOptions = false,
  palette: T,
  addLabel = 'Add',
  restaurantName,
  restaurantLogoUrl,
  restaurantLogoIcon,
  restaurantLocation,
  tableCode,
  infoLabels,
}: MenuItemCardProps) {
  const [showInfo, setShowInfo] = useState(false)
  const [animating, setAnimating] = useState(false)
  const [imgError, setImgError] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Cleanup di sicurezza: se il componente si smonta (es. cambio filtro
  // categoria) mentre il pannello info è ancora aperto, rimuove comunque
  // l'attributo da <body> — altrimenti resta bloccato per sempre e la
  // pagina non scrolla più con la rotellina del mouse.
  useEffect(() => {
    return () => {
      if (showInfo) {
        document.body.removeAttribute('data-panel-open')
      }
    }
  }, [showInfo])

  const IL = {
    characteristics: infoLabels?.characteristics ?? 'Caratteristiche',
    ingredients: infoLabels?.ingredients ?? 'Ingredienti',
    allergens: infoLabels?.allergens ?? 'Allergeni',
    story: infoLabels?.story ?? 'La storia del piatto',
    noInfo: infoLabels?.noInfo ?? 'Nessuna informazione aggiuntiva disponibile.',
    addToCart: infoLabels?.addToCart ?? 'Aggiungi al carrello',
    infoAria: infoLabels?.infoAria ?? 'Informazioni piatto',
    price: infoLabels?.price ?? 'Prezzo:',
  }

  const openInfo = () => {
    setShowInfo(true)
    setAnimating(false)
    document.body.setAttribute('data-panel-open', 'true')
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setAnimating(true))
    })
  }

  const closeInfo = () => {
    setAnimating(false)
    document.body.removeAttribute('data-panel-open')
    setTimeout(() => setShowInfo(false), 280)
  }

  const badges = [
    item.is_vegan && { label: 'Vegano', icon: <Sprout className="h-3.5 w-3.5" />, color: '#16a34a', bg: '#dcfce7' },
    item.is_vegetarian && { label: 'Vegetariano', icon: <Leaf className="h-3.5 w-3.5" />, color: '#15803d', bg: '#f0fdf4' },
    item.is_gluten_free && { label: 'Senza glutine', icon: <WheatOff className="h-3.5 w-3.5" />, color: '#b45309', bg: '#fffbeb' },
  ].filter(Boolean) as { label: string; icon: React.ReactNode; color: string; bg: string }[]

  return (
    <>
      {/* ── CARD ── */}
      <div className="lift-hover group relative flex flex-col overflow-hidden rounded-2xl border border-ink/5 bg-white/85 shadow-sm backdrop-blur transition hover:border-ink/10 hover:shadow-md">
        <button
          type="button"
          onClick={openInfo}
          aria-label={IL.infoAria}
          className="relative block h-44 w-full shrink-0 overflow-hidden bg-gray-50 sm:h-48"
        >
          {item.image_url && !imgError ? (
            <img
              src={item.image_url}
              alt={item.name}
              onError={() => setImgError(true)}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div
              className="grid h-full w-full place-items-center text-2xl font-black tabular"
              style={{ background: T.chipBg, color: T.brand }}
            >
              {(item.price_cents / 100).toFixed(0)}€
            </div>
          )}

          {(item.is_vegetarian || item.is_vegan || item.is_gluten_free) && (
            <div className="absolute left-2 top-2 flex items-center gap-1.5">
              {item.is_vegetarian && (
                <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-[12px] font-bold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-200">VEG</span>
              )}
              {item.is_vegan && (
                <span className="shrink-0 rounded-full bg-green-100 px-2.5 py-1 text-[12px] font-bold uppercase tracking-wide text-green-700 ring-1 ring-green-200">VEGAN</span>
              )}
              {item.is_gluten_free && (
                <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-[12px] font-bold uppercase tracking-wide text-amber-700 ring-1 ring-amber-200">GF</span>
              )}
            </div>
          )}
        </button>

        <div className="flex flex-1 flex-col gap-2.5 p-4">
          <h3 className="text-[15px] font-bold leading-snug text-ink">{item.name}</h3>

          <button
            type="button"
            onClick={openInfo}
            className="inline-flex w-fit items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition hover:opacity-80"
            style={{ borderColor: T.border, color: T.brand }}
          >
            <Info className="h-3 w-3" />
            {IL.allergens}
          </button>

          <div className="mt-auto flex items-end justify-between gap-3 pt-1">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{IL.price}</p>
              <p className="text-lg font-black tabular-nums" style={{ color: '#1F2937' }}>
                {(item.price_cents / 100).toFixed(2)}€
              </p>
            </div>

            <button
              onClick={(e) => {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                onAdd(item, rect)
              }}
              disabled={isLoadingOptions}
              aria-label={IL.addToCart}
              className="sheen grid h-11 w-11 shrink-0 place-items-center rounded-full text-white shadow-sm transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60"
              style={{
                background: isLoadingOptions ? `${T.brand}66` : T.btnBg,
                boxShadow: isLoadingOptions ? 'none' : T.btnShadow,
              }}
            >
              {isLoadingOptions ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* ── SIDE PANEL INFO (renderizzato in portal su document.body per evitare che il transform di Framer Motion sul motion.div genitore rompa il position:fixed) ── */}
      {showInfo && mounted && createPortal(
        <>
          <div
            onClick={closeInfo}
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm transition-opacity duration-300"
            style={{ opacity: animating ? 1 : 0 }}
          />

          <div
            className="fixed bottom-0 left-0 top-0 z-[101] flex flex-col overflow-hidden rounded-r-3xl bg-white shadow-2xl transition-transform duration-300 ease-out"
            style={{
              width: 'min(85vw, 520px)',
              transform: animating ? 'translateX(0)' : 'translateX(-100%)',
            }}
          >
            <div className="flex shrink-0 flex-col gap-1 p-3">
              <div className="flex min-w-0 items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  {(() => {
                    const avatar = restaurantAvatars.find((a) => a.id === restaurantLogoIcon)
                    if (avatar) {
                      return (
                        <div className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-black/5">
                          <avatar.Icon className="h-4 w-4" style={{ color: T.brand }} />
                        </div>
                      )
                    }
                    if (restaurantLogoUrl) {
                      return (
                        <div className="h-7 w-7 shrink-0 overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-black/5">
                          <img src={restaurantLogoUrl} alt={restaurantName ?? ''} className="h-full w-full object-cover" />
                        </div>
                      )
                    }
                    return null
                  })()}
                  {restaurantName && (
                    <span className="truncate text-sm font-bold text-ink">{restaurantName}</span>
                  )}
                  {restaurantLocation && (
                    <>
                      <span className="h-1 w-1 shrink-0 rounded-full bg-gray-300" />
                      <span className="truncate text-xs text-gray-500">{restaurantLocation}</span>
                    </>
                  )}
                </div>
                <button
                  onClick={closeInfo}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gray-100 text-gray-500 transition hover:bg-gray-200 hover:text-gray-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {tableCode && (
                <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  {tableCode.slice(0, 4)}
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {item.image_url && !imgError && (
                <div className="relative h-64 w-full overflow-hidden">
                  <img src={item.image_url} alt={item.name} onError={() => setImgError(true)} className="h-full w-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent to-white" />
                </div>
              )}

              <div className="px-6 pb-8 pt-5">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <h2 className="flex-1 text-xl font-bold text-ink">{item.name}</h2>
                  <span className="tabular whitespace-nowrap rounded-full px-3 py-1 text-lg font-black" style={{ color: T.brand, background: T.chipBg }}>
                    €{(item.price_cents / 100).toFixed(2)}
                  </span>
                </div>

                {item.description && <p className="mb-5 text-sm leading-relaxed text-gray-600">{item.description}</p>}

                {badges.length > 0 && (
                  <div className="mb-5">
                    <p className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-400">
                      <ChefHat className="h-3.5 w-3.5" /> {IL.characteristics}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {badges.map((b) => (
                        <span
                          key={b.label}
                          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold"
                          style={{ background: b.bg, color: b.color, border: `1px solid ${b.color}30` }}
                        >
                          {b.icon} {b.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {item.ingredients && item.ingredients.length > 0 && (
                  <div className="mb-5">
                    <p className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-400">
                      <Citrus className="h-3.5 w-3.5" /> {IL.ingredients}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {item.ingredients.map((ing, i) => (
                        <span
                          key={i}
                          className="rounded-full px-2.5 py-1 text-sm"
                          style={{ background: T.light100, color: T.text, border: `1px solid ${T.border}` }}
                        >
                          {ing}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {item.allergens && item.allergens.length > 0 && (
                  <div className="mb-5">
                    <p className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-orange-500">
                      <AlertTriangle className="h-3.5 w-3.5" /> {IL.allergens}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {item.allergens.map((al, i) => (
                        <span key={i} className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-sm text-orange-700">
                          <AlertTriangle className="h-3 w-3" /> {al}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {item.story ? (
                  <div className="mb-5">
                    <p className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-gray-400">{IL.story}</p>
                    <div className="relative overflow-hidden rounded-2xl p-4" style={{ background: T.light100, border: `1px solid ${T.border}` }}>
                      <span className="absolute left-3 top-1 select-none font-serif text-5xl" style={{ color: T.light300 }}>
                        ❝
                      </span>
                      <p className="relative pl-6 text-sm italic leading-relaxed text-gray-700">{item.story}</p>
                    </div>
                  </div>
                ) : (
                  badges.length === 0 &&
                  (!item.ingredients || item.ingredients.length === 0) &&
                  (!item.allergens || item.allergens.length === 0) && (
                    <div className="py-3 text-center text-sm text-gray-400">{IL.noInfo}</div>
                  )
                )}

                <button
                  onClick={(e) => {
                    closeInfo()
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                    onAdd(item, rect)
                  }}
                  disabled={isLoadingOptions}
                  className="sheen mt-2 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-base font-bold text-white transition hover:scale-[1.01] disabled:opacity-60"
                  style={{
                    background: isLoadingOptions ? `${T.brand}66` : T.btnBg,
                    boxShadow: isLoadingOptions ? 'none' : T.btnShadow,
                  }}
                >
                  <ShoppingBag className="h-[18px] w-[18px]" />
                  {IL.addToCart}
                </button>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  )
}
'use client'

// ==============================================================================
//  FILE UNICO — page.tsx
//  ──────────────────────────────────────────────────────────────────────────
//  TUTTI i componenti che la pagina importava sono INLINEATI qui:
//    - Button            (era @/components/ui/button)
//    - BurgerLoader      (era @/components/client/order/BurgerLoader)
//    - CategoryFilter    (era @/components/client/order/CategoryFilter)
//    - MenuItemCard      (era @/components/client/order/MenuItemCard)
//
//  NESSUNA modifica al backend:
//    - useOrderSession, useCartStore, useCartRealtime, buildPalette,
//      initFromDB, addCartItem, removeCartItem, updateCartQuantity → intatti.
//    - Eventi custom (waiter-status, call-waiter, cancel-waiter, open-chat) →
//      restano dispatchati dal frontend, la logica Supabase resta esterna.
//
//  Miglioramenti grafici applicati:
//    - Hero introduttivo in stile HeroCard (gradient + glow + motion blur/y).
//    - Cards (filtri, menu, footer) con motion in/out ease [0.22,1,0.36,1].
//    - Glassmorphism più spinto (backdrop-blur + border + shadow layered).
//    - Micro-interazioni hover/tap su bottoni e card.
//    - Sticky cart con header più "premium" (gradient subtle, shadow elevato).
//
//  Note sugli import:
//    - Si usa CheckCircle2 (NON CheckCircle) perché nelle versioni recenti di
//      lucide-react, CheckCircle è deprecato/rimosso → import undefined.
//    - Slot da @radix-ui/react-slot e cva da class-variance-authority sono già
//      dipendenze del progetto (le usa shadcn/ui).
// ==============================================================================

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, useMotionValue, animate, useAnimation } from 'framer-motion'

// ── Dipendenze esterne (UI/palette/i18n — NON backend) ────────────────────────
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import {
  AlertCircle,
  Search,
  ShoppingCart,
  Leaf,
  Wheat,
  X,
  Star,
  CheckCircle2,
  Plus,
  Minus,
  Trash2,
  UtensilsCrossed,
  MapPin,
  Phone,
  Instagram,
  Globe,
  Sparkles,
  ChefHat,
  // ── per MenuItemCard inline ──
  Info,
  WheatOff,
  Loader2,
  Sprout,
  AlertTriangle,
  ShoppingBag,
  Citrus,
} from 'lucide-react'

import { PageShell } from '@/components/landing/PageShell'
import { useI18n } from '@/components/i18n/I18nProvider'
import { cn } from '@/lib/utils'
import { ScanError } from '@/components/client/scan/ScanError'
import { buildPalette, DEFAULT_BRAND, type Palette } from '@/components/client/order/palette'
import { useOrderSession } from '@/hooks/useOrderSession'
import { useCartStore } from '@/stores/useCartStore'
import { useCartRealtime } from '@/hooks/useCartRealtime'
import { restaurantAvatars } from '@/lib/restaurant-avatars'

// ==============================================================================
// ─── INLINE: Button ───────────────────────────────────────────────────────────
// ==============================================================================

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*=\'size-\'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90',
        destructive:
          'bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
        outline:
          'border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50',
        secondary: 'bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5',
        lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
        icon: 'size-9',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'button'
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />
}

// ==============================================================================
// ─── INLINE: BurgerLoader ─────────────────────────────────────────────────────
// ==============================================================================

const BURGER_LAYERS = [
  { id: 'bottom-bun', delay: 0,    height: 14, color: '#D89856', borderRadius: '0 0 40px 40px' },
  { id: 'lettuce',    delay: 0.15, height: 8,  color: '#6FAF4A', borderRadius: '6px' },
  { id: 'cheese',     delay: 0.3,  height: 7,  color: '#F2C14E', borderRadius: '3px' },
  { id: 'patty',      delay: 0.45, height: 12, color: '#6B4226', borderRadius: '8px' },
  { id: 'tomato',     delay: 0.6,  height: 7,  color: '#D9534F', borderRadius: '50%' },
  { id: 'top-bun',    delay: 0.75, height: 18, color: '#E2A765', borderRadius: '40px 40px 8px 8px' },
]

const BURGER_MIN_DURATION = 1200

const BURGER_TOTAL_HEIGHT = BURGER_LAYERS.reduce((s, l) => s + l.height, 0) + (BURGER_LAYERS.length - 1) * 2

function BurgerLoader({
  isLoading,
  label = 'Caricamento',
  onDone,
  brandColor,
}: {
  isLoading: boolean
  label?: string
  onDone?: () => void
  brandColor?: string
}) {
  const barColor = brandColor && brandColor !== '#ffffff' ? brandColor : '#f59e0b'
  const [progress, setProgress] = useState(0)
  const [showing, setShowing] = useState(true)

  const isLoadingRef = useRef(isLoading)
  const mountTimeRef = useRef(Date.now())
  const doneRef = useRef(false)

  useEffect(() => {
    isLoadingRef.current = isLoading
  }, [isLoading])

  useEffect(() => {
    isLoadingRef.current = isLoading
    mountTimeRef.current = Date.now()
    doneRef.current = false

    const interval = setInterval(() => {
      const elapsed = Date.now() - mountTimeRef.current
      if (!isLoadingRef.current && elapsed >= BURGER_MIN_DURATION && !doneRef.current) {
        doneRef.current = true
        clearInterval(interval)
        setProgress(100)
        setTimeout(() => {
          setShowing(false)
          onDone?.()
        }, 400)
        return
      }
      setProgress((p) => {
        if (p >= 92) return p
        const step = p < 50 ? 6 : p < 75 ? 4 : 2
        return Math.min(92, p + step)
      })
    }, 120)

    return () => clearInterval(interval)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!showing) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
      <style>{`
        @keyframes dropIn {
          from { transform: translateY(-40px); opacity: 0; }
          to   { transform: translateY(0);     opacity: 1; }
        }
        .burger-loader-ingredient { animation: dropIn 1s cubic-bezier(0.34, 1.8, 0.64, 1) both; }
      `}</style>

      <div
        style={{
          width: 120,
          height: BURGER_TOTAL_HEIGHT,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          alignItems: 'center',
        }}
      >
        {[...BURGER_LAYERS].reverse().map((layer) => (
          <div
            key={layer.id}
            className="burger-loader-ingredient"
            style={{
              width: 104,
              height: layer.height,
              flexShrink: 0,
              background: layer.color,
              borderRadius: layer.borderRadius,
              marginTop: -2,
              animationDelay: `${layer.delay}s`,
            }}
          />
        ))}
      </div>

      <div style={{ width: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <div style={{ height: 6, width: '100%', borderRadius: 9999, overflow: 'hidden', background: 'rgba(0,0,0,0.1)' }}>
          <div
            style={{
              height: '100%',
              borderRadius: 9999,
              background: barColor,
              width: `${progress}%`,
              transition: 'width 300ms ease-out',
            }}
          />
        </div>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'rgba(0,0,0,0.45)' }}>
          {label} {Math.round(progress)}%
        </p>
      </div>
    </div>
  )
}

// ==============================================================================
// ─── INLINE: CategoryFilter ───────────────────────────────────────────────────
// ==============================================================================

interface CategoryFilterProps {
  categories: Array<{ id: string; name: string; emoji?: string; is_drink?: boolean }>
  activeCat: string
  onCategoryChange: (catId: string) => void
  palette: Palette
  allLabel?: string
}

function CategoryFilter({
  categories,
  activeCat,
  onCategoryChange,
  palette: T,
  allLabel = 'Tutti',
}: CategoryFilterProps) {
  const all = [{ id: 'all', name: allLabel }, ...categories]
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const rafRef = useRef<number | null>(null)

  const checkScroll = () => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }

  useEffect(() => {
    checkScroll()
    const el = scrollRef.current
    if (!el) return
    el.addEventListener('scroll', checkScroll, { passive: true })
    const ro = new ResizeObserver(checkScroll)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', checkScroll)
      ro.disconnect()
    }
  }, [categories])

  const startScroll = useCallback((direction: 1 | -1) => {
    const el = scrollRef.current
    if (!el) return
    const step = () => {
      el.scrollLeft += direction * 4
      rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
  }, [])

  const stopScroll = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  useEffect(() => stopScroll, [stopScroll])

  const arrowProps = (direction: 1 | -1, show: boolean, side: 'left' | 'right') => ({
    style: {
      opacity: show ? 1 : 0,
      pointerEvents: (show ? 'auto' : 'none') as React.CSSProperties['pointerEvents'],
      background:
        side === 'right'
          ? 'linear-gradient(to right, transparent, rgba(0,0,0,0.08) 50%, rgba(0,0,0,0.18))'
          : 'linear-gradient(to left, transparent, rgba(0,0,0,0.08) 50%, rgba(0,0,0,0.18))',
    },
    onMouseDown: () => startScroll(direction),
    onMouseUp: stopScroll,
    onMouseLeave: stopScroll,
    onTouchStart: () => startScroll(direction),
    onTouchEnd: stopScroll,
    role: 'button' as const,
    'aria-label': side === 'right' ? 'Scorri a destra' : 'Scorri a sinistra',
    className: `absolute top-0 h-full w-20 transition-opacity duration-300 ${
      side === 'right' ? 'right-0 rounded-r-full' : 'left-0 rounded-l-full'
    }`,
  })

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="flex gap-1.5 overflow-x-auto rounded-full border border-ink/5 bg-white/60 p-1.5 shadow-sm backdrop-blur-md scrollbar-none [touch-action:pan-x]"
      >
        {all.map((cat) => {
          const isActive = activeCat === cat.id
          return (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(cat.id)}
              className={cn(
                'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-semibold',
                'transition-[width,background,box-shadow] duration-[450ms] cubic-bezier(.22,1,.36,1)',
                isActive
                  ? 'w-[100px] px-4 py-2 text-white shadow-md'
                  : 'min-w-[52px] px-3 py-2 bg-white text-ink/55 shadow-sm hover:bg-white/90 hover:text-ink'
              )}
              style={isActive ? { background: T.btnBg } : undefined}
            >
              {cat.emoji && <span className="shrink-0 text-base leading-none">{cat.emoji}</span>}
              <span
                className="overflow-hidden whitespace-nowrap transition-[max-width,opacity,transform] duration-[450ms] ease-[cubic-bezier(.22,1,.36,1)]"
                style={{
                  maxWidth: isActive ? '100px' : '0px',
                  opacity: isActive ? 1 : 0,
                  transform: isActive ? 'translateX(0)' : 'translateX(-8px)',
                  marginLeft: isActive && cat.emoji ? '6px' : '0px',
                }}
              >
                {cat.name}
              </span>
              {!cat.emoji && !isActive && <span className="text-xs font-bold tracking-tight px-1">{cat.name}</span>}
            </button>
          )
        })}
      </div>

      <div {...arrowProps(-1, canScrollLeft, 'left')}>
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/60">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M13 4l-6 6 6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      <div {...arrowProps(1, canScrollRight, 'right')}>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/60">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M7 4l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  )
}

// ==============================================================================
// ─── INLINE: MenuItemCard + tipo MenuItem ─────────────────────────────────────
// ==============================================================================

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

function MenuItemCard({
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

  useEffect(() => {
    return () => {
      if (showInfo) document.body.removeAttribute('data-panel-open')
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
                <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-[12px] font-bold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-200">
                  VEG
                </span>
              )}
              {item.is_vegan && (
                <span className="shrink-0 rounded-full bg-green-100 px-2.5 py-1 text-[12px] font-bold uppercase tracking-wide text-green-700 ring-1 ring-green-200">
                  VEGAN
                </span>
              )}
              {item.is_gluten_free && (
                <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-[12px] font-bold uppercase tracking-wide text-amber-700 ring-1 ring-amber-200">
                  GF
                </span>
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

      {/* ── SIDE PANEL INFO (portal su document.body) ── */}
      {showInfo &&
        mounted &&
        createPortal(
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
                    {restaurantName && <span className="truncate text-sm font-bold text-ink">{restaurantName}</span>}
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
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{tableCode.slice(0, 4)}</span>
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
                    <span
                      className="tabular whitespace-nowrap rounded-full px-3 py-1 text-lg font-black"
                      style={{ color: T.brand, background: T.chipBg }}
                    >
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
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-sm text-orange-700"
                          >
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

// ==============================================================================
// ─── SKELETON DI CARICAMENTO (transizione tra pagine) ──────────────────────────
// ==============================================================================

function MenuSkeleton({ bg }: { bg: string | null }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 59,
        paddingTop: 80,
        background: bg ?? '#f5f3ec',
        overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes skeletonShimmer {
          0% { opacity: 0.55; }
          50% { opacity: 1; }
          100% { opacity: 0.55; }
        }
        .skeleton-pulse { animation: skeletonShimmer 1.4s ease-in-out infinite; }
      `}</style>

      <div className="mx-auto max-w-5xl px-4 pb-6 pt-32">
        <div className="rounded-3xl border border-black/10 bg-white/85 p-4 shadow-sm sm:p-5">
          <div className="skeleton-pulse mb-5 h-4 w-28 rounded-full bg-black/10" />
          <div className="mb-3 flex w-full items-center gap-3.5 rounded-full border border-ink/5 bg-white/80 p-4">
            <div className="skeleton-pulse h-11 w-11 shrink-0 rounded-full bg-black/10" />
            <div className="flex-1 space-y-2">
              <div className="skeleton-pulse h-3.5 w-2/3 rounded-full bg-black/10" />
              <div className="skeleton-pulse h-3 w-1/3 rounded-full bg-black/10" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {[72, 96, 84, 64, 100].map((w, i) => (
              <div key={i} className="skeleton-pulse h-8 rounded-full bg-black/10" style={{ width: w }} />
            ))}
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-black/10 bg-white/85 p-4 shadow-sm sm:p-5">
          <div className="skeleton-pulse mb-3 h-5 w-40 rounded-full bg-black/10" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-3 rounded-2xl border border-black/5 bg-white p-3">
                <div className="skeleton-pulse h-20 w-20 shrink-0 rounded-xl bg-black/10" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="skeleton-pulse h-3.5 w-3/4 rounded-full bg-black/10" />
                  <div className="skeleton-pulse h-3 w-full rounded-full bg-black/10" />
                  <div className="skeleton-pulse h-3 w-2/3 rounded-full bg-black/10" />
                  <div className="skeleton-pulse mt-2 h-3 w-16 rounded-full bg-black/10" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ==============================================================================
// ─── PAGINA PRINCIPALE ────────────────────────────────────────────────────────
// ==============================================================================

export default function OrderPage({ params }: { params: Promise<{ token: string }> }) {
  const { tr, lang } = useI18n()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [sessionId, setSessionId] = useState<string>('')
  useEffect(() => {
    params.then((p) => setSessionId(p.token))
  }, [params])

  // Su iOS Safari, il rubber-band overscroll a fine pagina fa sparire per un frame
  // gli elementi position:fixed (come la sticky cart bottom-sheet) — bug noto del
  // motore di scroll elastico, che non esiste su desktop/altri browser. Disattiviamo
  // il bounce verticale SOLO su iOS (rilevato via user-agent), per non intaccare lo
  // scroll con mouse/trackpad su PC (che overscroll-behavior può alterare a seconda
  // del browser/driver, come verificato).
  useEffect(() => {
    const isIOS = /iP(hone|od|ad)/.test(navigator.userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) // iPadOS 13+
    if (!isIOS) return
    const prevBody = document.body.style.overscrollBehaviorY
    const prevHtml = document.documentElement.style.overscrollBehaviorY
    document.body.style.overscrollBehaviorY = 'none'
    document.documentElement.style.overscrollBehaviorY = 'none'
    return () => {
      document.body.style.overscrollBehaviorY = prevBody
      document.documentElement.style.overscrollBehaviorY = prevHtml
    }
  }, [])

  const initialSlug = searchParams.get('slug') ?? ''

  // ── Sfondo cachato (per evitare il flash bianco durante la transizione) ────
  const [cachedBg, setCachedBg] = useState<string | null>(null)
  useEffect(() => {
    try {
      const pathParts = window.location.pathname.split('/')
      const urlSessionId = pathParts[pathParts.length - 1]
      if (!urlSessionId) return
      const stored = localStorage.getItem(`order_bg_${urlSessionId}`)
      if (stored) setCachedBg(stored)
    } catch {
      /* ignore */
    }
  }, [])

  // ── Dati reali dal database (ristorante, categorie, piatti) ────────────────
  const {
    restaurant,
    tableNumber,
    tableCode,
    tableId,
    restaurantId,
    categories: dbCategories,
    items: dbItems,
    loading: sessionLoading,
    error: sessionError,
  } = useOrderSession(sessionId, initialSlug)

  // ── Carrello reale (persistito su Supabase) ─────────────────────────────────
  const cartItems = useCartStore((s) => s.items)
  const cartTotalCents = useCartStore((s) => s.totalCents())
  const cartInitialized = useCartStore((s) => s.initialized)
  const cartLoading = useCartStore((s) => s.loading)
  const addCartItem = useCartStore((s) => s.addItem)
  const removeCartItem = useCartStore((s) => s.removeItem)
  const updateCartQuantity = useCartStore((s) => s.updateQuantity)
  const initFromDB = useCartStore((s) => s.initFromDB)

  useEffect(() => {
    if (!sessionId || !restaurantId) return
    if (cartInitialized || cartLoading) return
    initFromDB(tableId ?? null, restaurantId, restaurant?.slug ?? initialSlug, sessionId)
  }, [sessionId, restaurantId, tableId, restaurant?.slug, initialSlug, cartInitialized, cartLoading, initFromDB])

  // Sincronizzazione real-time del carrello tra dispositivi allo stesso tavolo
  useCartRealtime()

  // ── Palette dinamica dal brand_color reale del ristorante ───────────────────
  const T: Palette = useMemo(() => buildPalette(restaurant?.brand_color || DEFAULT_BRAND), [restaurant?.brand_color])

  // Appena i dati del ristorante sono pronti, li invia al layout (Navbar)
  // tramite evento custom — evita una seconda query Supabase dal layout.
  useEffect(() => {
    if (!restaurant || !sessionId) return
    window.dispatchEvent(
      new CustomEvent('restaurant-meta-ready', {
        detail: {
          name: restaurant.name,
          brandColor: (restaurant as any).brand_color ?? null,
          tableNumber: tableNumber ?? null,
        },
      })
    )
  }, [restaurant, sessionId, tableNumber])

  // Calcola lo sfondo finale (immagine / colore custom / gradiente brand di default)
  const resolvedBg = restaurant
    ? (restaurant as any).background_type === 'image' && (restaurant as any).background_image_url
      ? `url(${(restaurant as any).background_image_url}) center/cover no-repeat`
      : (restaurant as any).background_type === 'color' && (restaurant as any).background_image_url
      ? (restaurant as any).background_image_url
      : T.bgGradient
    : null

  // Salva lo sfondo in cache per il prossimo mount (transizione tra pagine senza flash bianco)
  useEffect(() => {
    if (!sessionId || !resolvedBg) return
    try {
      localStorage.setItem(`order_bg_${sessionId}`, resolvedBg)
    } catch {}
  }, [sessionId, resolvedBg])

  // ── State ──────────────────────────────────────────────────────────────────
  const fromScan = searchParams.get('from') === 'scan'
  const [loaderDone, setLoaderDone] = useState(!fromScan)
  const [activeCat, setActiveCat] = useState('all')
  const [flyingDot, setFlyingDot] = useState<{ x: number; y: number; id: number } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterVeg, setFilterVeg] = useState(false)
  const [filterGF, setFilterGF] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [qtyAnim, setQtyAnim] = useState<Record<string, { prevQty: number; direction: 1 | -1 }>>({})
  const qtyAnimTimers = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const triggerQtyAnim = (id: string, prevQty: number, direction: 1 | -1) => {
    if (qtyAnimTimers.current[id]) clearTimeout(qtyAnimTimers.current[id])
    setQtyAnim((prev) => ({ ...prev, [id]: { prevQty, direction } }))
    qtyAnimTimers.current[id] = setTimeout(() => {
      setQtyAnim((prev) => {
        const n = { ...prev }
        delete n[id]
        return n
      })
    }, 260)
  }
  const [reviewStars, setReviewStars] = useState(0)
  const [reviewHovered, setReviewHovered] = useState(0)
  const [reviewText, setReviewText] = useState('')
  const [reviewSubmitted, setReviewSubmitted] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  const [cartExpanded, setCartExpanded] = useState(false)
  const cartDetailRef = useRef<HTMLDivElement>(null)
  const cartDetailHeight = useMotionValue(0)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // ── Mappatura dati reali → tipi usati dalla UI ──────────────────────────────
  const categories = useMemo(
    () => {
      const map = tr.client.categoryNames as Record<string, string>
      const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
      return dbCategories.map((c) => ({
        id: c.id,
        name: map[norm(c.name)] ?? c.name,
        is_drink: c.is_drink,
      }))
    },
    [dbCategories, tr]
  )

  const [translations, setTranslations] = useState<Record<string, string>>({})

  useEffect(() => {
    if (lang === 'it') {
      setTranslations({})
      return
    }
    const texts = new Set<string>()
    for (const i of dbItems) {
      const rec = i as Record<string, unknown>
      const ing = rec.ingredients as string[] | undefined
      const alg = rec.allergens as string[] | undefined
      ing?.forEach((s) => s && texts.add(s))
      alg?.forEach((s) => s && texts.add(s))
      if (i.name) texts.add(i.name)
      if (i.description) texts.add(i.description)
      const story = rec.story as string | undefined
      if (story) texts.add(story)
    }
    if (texts.size === 0) return
    let cancelled = false
    fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts: Array.from(texts), sourceLang: 'it', targetLang: lang }),
    })
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled && json?.translations) setTranslations(json.translations)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [dbItems, lang])

  const txArr = useCallback((arr: string[] | undefined) => arr?.map((s) => translations[s] ?? s), [translations])

  const items: MenuItem[] = useMemo(
    () =>
      dbItems.map((i) => ({
        id: i.id,
        name: translations[i.name] ?? i.name,
        description: i.description ? translations[i.description] ?? i.description : i.description,
        price_cents: i.price_cents,
        image_url: i.image_url ?? null,
        is_vegetarian: (i as Record<string, unknown>).is_vegetarian as boolean | undefined,
        is_vegan: (i as Record<string, unknown>).is_vegan as boolean | undefined,
        is_gluten_free: (i as Record<string, unknown>).is_gluten_free as boolean | undefined,
        allergens: txArr((i as Record<string, unknown>).allergens as string[] | undefined),
        ingredients: txArr((i as Record<string, unknown>).ingredients as string[] | undefined),
        story: (() => {
          const s = (i as Record<string, unknown>).story as string | undefined
          return s ? translations[s] ?? s : s
        })(),
        category_id: i.category_id,
      })),
    [dbItems, txArr, translations]
  )

  // ── Parole chiave di ricerca (colonna search_keywords nel DB) ───────────────
  const keywordsByItemId = useMemo(() => {
    const map: Record<string, string[]> = {}
    for (const i of dbItems) {
      const kw = (i as Record<string, unknown>).search_keywords as string[] | undefined
      if (kw && kw.length) map[i.id] = kw
    }
    return map
  }, [dbItems])

  // ── Carrello: quantità per piatto + lookup orderItemId ──────────────────────
  const cartByMenuItem = useMemo(() => {
    const map: Record<string, { qty: number; orderItemId: string }> = {}
    for (const ci of cartItems) {
      if (!ci.orderItemId) continue
      if (map[ci.menuItemId]) {
        map[ci.menuItemId].qty += ci.quantity
      } else {
        map[ci.menuItemId] = { qty: ci.quantity, orderItemId: ci.orderItemId }
      }
    }
    return map
  }, [cartItems])

  const cartCount = cartItems.reduce((a, i) => a + i.quantity, 0)

  // Animazione icona carrello quando aumentano gli articoli
  const cartIconControls = useAnimation()
  const prevCartCountRef = useRef(cartCount)
  useEffect(() => {
    if (cartCount > prevCartCountRef.current) {
      cartIconControls.start({
        scale: [1, 1.45, 0.92, 1.18, 1],
        rotate: [0, -12, 12, -6, 0],
        transition: { duration: 0.48, times: [0, 0.18, 0.42, 0.72, 1], ease: 'easeOut' },
      })
    }
    prevCartCountRef.current = cartCount
  }, [cartCount, cartIconControls])

  function addToCart(item: MenuItem, originRect?: DOMRect) {
    addCartItem({
      menuItemId: item.id,
      name: item.name,
      basePriceCents: item.price_cents,
      customizations: [],
    })
    if (originRect) {
      setFlyingDot({ x: originRect.left + originRect.width / 2, y: originRect.top + originRect.height / 2, id: Date.now() })
      setTimeout(() => setFlyingDot(null), 1100)
    }
  }
  function clearCart() {
    for (const ci of cartItems) {
      if (ci.orderItemId) removeCartItem(ci.orderItemId)
    }
  }

  // ── Search ─────────────────────────────────────────────────────────────────
  const openSearch = () => {
    setSearchOpen(true)
    setTimeout(() => searchInputRef.current?.focus(), 50)
  }
  const closeSearch = (keepQuery = false) => {
    setSearchOpen(false)
    if (!keepQuery) setSearchQuery('')
  }
  const handleSuggestion = (word: string) => {
    setSearchQuery(word)
    setSearchOpen(false)
  }

  // search score
  const normalize = (str: string): string =>
    str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

  const filteredItems = useMemo(() => {
    const byCat = activeCat === 'all' ? items : items.filter((i) => i.category_id === activeCat)
    const q = normalize(searchQuery)
    return byCat
      .filter((i) => {
        if (filterVeg && !i.is_vegetarian && !i.is_vegan) return false
        if (filterGF && !i.is_gluten_free) return false
        return true
      })
      .filter((i) => {
        if (!q) return true
        return (
          normalize(i.name).includes(q) ||
          normalize(i.description ?? '').includes(q) ||
          (i.ingredients ?? []).some((ing) => normalize(ing).includes(q)) ||
          (keywordsByItemId[i.id] ?? []).some((kw) => normalize(kw).includes(q)) ||
          normalize(categories.find((c) => c.id === i.category_id)?.name ?? '').includes(q)
        )
      })
  }, [activeCat, items, searchQuery, filterVeg, filterGF, categories, keywordsByItemId])

  const suggestions = [
    { emoji: '🍝', label: 'Pasta' },
    { emoji: '🐟', label: 'Pesce' },
    { emoji: '🥩', label: 'Carne' },
    { emoji: '🍰', label: 'Dolce' },
    { emoji: '🥗', label: 'Verdure' },
    { emoji: '🍷', label: 'Vino' },
  ]

  // ── Review submit (mock — non esiste ancora una tabella recensioni) ─────────
  const handleReviewSubmit = () => {
    if (reviewStars === 0) return
    setReviewSubmitted(true)
    setTimeout(() => {
      setShowReviewModal(false)
      setTimeout(() => {
        setReviewStars(0)
        setReviewHovered(0)
        setReviewText('')
        setReviewSubmitted(false)
      }, 300)
    }, 2200)
  }

  const isEn = lang === 'en'
  const IL = {
    characteristics: isEn ? 'Characteristics' : 'Caratteristiche',
    ingredients: isEn ? 'Ingredients' : 'Ingredienti',
    allergens: isEn ? 'Allergens' : 'Allergeni',
    story: isEn ? 'The dish story' : 'La storia del piatto',
    noInfo: isEn ? 'No additional info available.' : 'Nessuna informazione aggiuntiva disponibile.',
    addToCart: isEn ? 'Add to cart' : 'Aggiungi al carrello',
    infoAria: isEn ? 'Dish info' : 'Informazioni piatto',
    price: isEn ? 'Price:' : 'Prezzo:',
  }

  const heroDesc = isEn
    ? 'Choose from our dishes made with passion. Fresh ingredients, traditional recipes and fast service straight to your table.'
    : 'Scegli tra i nostri piatti preparati con passione. Ingredienti freschi, ricette tradizionali e servizio veloce direttamente al tuo tavolo.'
  const partnerLabel = isEn ? 'Partner Restaurant' : 'Ristorante Partner'
  const searchTitle = isEn ? 'What are you in the mood for?' : 'Cosa hai voglia di mangiare?'
  const vegLabel = isEn ? 'Vegetarian' : 'Vegetariano'
  const gfLabel = isEn ? 'Gluten Free' : 'Senza Glutine'
  const removeFilters = isEn ? '✕ Clear filters' : '✕ Rimuovi filtri'
  const ideasLabel = isEn ? 'Ideas to get started' : 'Idee per iniziare'
  const noResults = isEn ? 'No dishes found.' : 'Nessun piatto trovato.'
  const cartLabel = isEn ? 'Cart' : 'Carrello'
  const orderNow = isEn ? 'Order now' : 'Ordina ora'
  const reviewTitle = isEn ? 'Leave a review' : 'Recensisci'
  const reviewQ = isEn ? 'How was your experience?' : "Com'è stata la tua esperienza?"
  const reviewMore = isEn ? 'Tell us more (optional)' : 'Raccontaci di più (opzionale)'
  const reviewPlaceholder = isEn ? 'What did you like? Anything to improve?' : 'Cosa ti è piaciuto? C\'è qualcosa da migliorare?'
  const reviewSubmitLabel = isEn ? 'Submit your review' : 'Invia la tua recensione'
  const reviewThanks = isEn ? 'Thank you! 🙏' : 'Grazie mille! 🙏'
  const reviewThanksBody = isEn ? 'Your review has been submitted.' : 'La tua recensione è stata inviata.'
  const ratings = isEn
    ? ['', 'Poor 😞', 'Fair 😕', 'Average 😐', 'Great 😊', 'Excellent 🤩']
    : ['', 'Pessima 😞', 'Scarsa 😕', 'Nella media 😐', 'Ottima 😊', 'Eccellente 🤩']

  // ── Stati di caricamento / errore ───────────────────────────────────────────
  if (!loaderDone) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'grid', placeItems: 'center', background: 'white' }}>
        <BurgerLoader
          isLoading={!sessionId || sessionLoading}
          onDone={() => setLoaderDone(true)}
          brandColor={restaurant?.brand_color ?? undefined}
        />
      </div>
    )
  }

  if (!sessionId || sessionLoading) {
    return <MenuSkeleton bg={cachedBg} />
  }

  if (sessionError || !restaurant) {
    return <ScanError error={sessionError} tableCode={tableCode ?? undefined} />
  }

  const isImageBg = (restaurant as any).background_type === 'image' && !!(restaurant as any).background_image_url

  // ── Varianti di animazione condivise (stile HeroCard di esempio.tsx) ────────
  const cardMotionProps = {
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 10 },
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  }

  return (
    <PageShell bare>
      {/* ── Stili globali (keyframes per pulse, qty slot, scrollbar custom) ── */}
      <style>{`
        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.5; transform: scale(1.25); }
        }
        @keyframes slot-out-up    { from { transform: translateY(0);     opacity: 1; } to { transform: translateY(-100%); opacity: 0; } }
        @keyframes slot-out-down  { from { transform: translateY(0);     opacity: 1; } to { transform: translateY(100%);  opacity: 0; } }
        @keyframes slot-in-top    { from { transform: translateY(100%);  opacity: 0; } to { transform: translateY(0);     opacity: 1; } }
        @keyframes slot-in-bottom { from { transform: translateY(-100%); opacity: 0; } to { transform: translateY(0);     opacity: 1; } }
        .qty-slot-digit.slot-out-up    { animation: slot-out-up    0.26s ease forwards; }
        .qty-slot-digit.slot-out-down  { animation: slot-out-down  0.26s ease forwards; }
        .qty-slot-digit.slot-in-top    { animation: slot-in-top    0.26s ease forwards; }
        .qty-slot-digit.slot-in-bottom { animation: slot-in-bottom 0.26s ease forwards; }

        /* Scrollbar custom per i pannelli a lista lunga */
        .tr-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
        .tr-scroll::-webkit-scrollbar-track { background: transparent; }
        .tr-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.12); border-radius: 9999px; }
        .tr-scroll::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.2); }
      `}</style>

      <div
        className="relative min-h-screen"
        style={
          {
            '--brand': T.brand,
            '--brand-text': T.textMuted,
            '--brand-dark': T.text,
            '--brand-border': T.border,
            background: isImageBg
              ? 'transparent'
              : (restaurant as any).background_type === 'color' && (restaurant as any).background_image_url
              ? (restaurant as any).background_image_url
              : T.bgGradient,
          } as React.CSSProperties
        }
      >
        {/* Sfondo immagine — div fixed separato per evitare bug zoom su mobile */}
        {isImageBg && (
          <div
            aria-hidden
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 0,
              backgroundImage: `url(${(restaurant as any).background_image_url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
        )}

        {/* Decorative blobs — nascosti se c'è uno sfondo immagine */}
        {!isImageBg && (
          <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
            <div className="absolute -top-24 left-1/4 h-80 w-80 rounded-full blur-2xl" style={{ background: `${T.brand}22` }} />
            <div className="absolute -top-10 right-0 h-64 w-64 rounded-full blur-xl" style={{ background: `${T.brand}14` }} />
            <div className="absolute bottom-1/4 -left-10 h-72 w-72 rounded-full blur-xl" style={{ background: `${T.brand}12` }} />
            <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full blur-2xl" style={{ background: `${T.brand}10` }} />
          </div>
        )}

        <div className="relative z-10 pt-36 sm:pt-40">
          <main className="mx-auto max-w-5xl px-4 pb-6">

            {/* ───────────────────────────────────────────────────────────────────
                CARD FILTRI + RICERCA (con motion in/out stile HeroCard)
                Glassmorphism spinto + micro-interazioni hover.
            ─────────────────────────────────────────────────────────────────── */}
            <motion.div
              {...cardMotionProps}
              transition={{ duration: 0.5, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
              className="mt-6 overflow-hidden rounded-3xl border border-black/10 bg-white/80 p-4 shadow-lg backdrop-blur-xl sm:p-5"
              style={{ boxShadow: '0 10px 40px -12px rgba(0,0,0,0.18), 0 1px 0 rgba(255,255,255,0.6) inset' }}
            >
              {/* Search bar */}
              <motion.button
                whileHover={{ scale: 1.005 }}
                whileTap={{ scale: 0.995 }}
                onClick={openSearch}
                className="mb-3 flex w-full items-center gap-3 rounded-full border border-ink/5 bg-white/80 px-4 py-3 text-left shadow-sm backdrop-blur transition hover:shadow-md"
              >
                <div
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full transition-transform"
                  style={{ background: T.chipBg }}
                >
                  <Search className="h-4 w-4" style={{ color: T.textSoft }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{searchTitle}</p>
                </div>
                <motion.div
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full"
                  style={{ background: T.chipBg }}
                >
                  <Plus className="h-3.5 w-3.5" style={{ color: T.textSoft }} />
                </motion.div>
              </motion.button>

              <CategoryFilter
                categories={categories}
                activeCat={activeCat}
                onCategoryChange={setActiveCat}
                palette={T}
                allLabel={isEn ? 'All' : 'Tutti'}
              />

              {/* Filters */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {searchQuery.trim() && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="flex items-center gap-1.5 rounded-full border-2 px-3.5 py-1.5 text-sm font-semibold transition hover:scale-105"
                    style={{ borderColor: T.brand, background: T.chipBg, color: T.textSoft }}
                  >
                    <Search className="h-3.5 w-3.5" /> {searchQuery}
                    <X className="h-3 w-3 opacity-60" />
                  </button>
                )}
                <button
                  onClick={() => setFilterVeg((v) => !v)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold shadow-sm transition hover:scale-105',
                    filterVeg
                      ? 'border border-emerald-400 bg-emerald-50 text-emerald-500'
                      : 'border border-emerald-300 bg-white text-emerald-400 hover:bg-emerald-50/60'
                  )}
                >
                  <Leaf className="h-4 w-4" /> {vegLabel} {filterVeg && '✓'}
                </button>
                <button
                  onClick={() => setFilterGF((v) => !v)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold shadow-sm transition hover:scale-105',
                    filterGF
                      ? 'border border-amber-500 bg-amber-50 text-amber-700'
                      : 'border border-amber-400 bg-white text-amber-600 hover:bg-amber-50/60'
                  )}
                >
                  <Wheat className="h-4 w-4" /> {gfLabel} {filterGF && '✓'}
                </button>
                {(filterVeg || filterGF) && (
                  <button
                    onClick={() => {
                      setFilterVeg(false)
                      setFilterGF(false)
                    }}
                    className="rounded-full border-2 border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
                  >
                    {removeFilters}
                  </button>
                )}
              </div>
            </motion.div>

            {/* ───────────────────────────────────────────────────────────────────
                MENU GRID CARD (con motion in/out stile HeroCard)
            ─────────────────────────────────────────────────────────────────── */}
            <motion.div
              {...cardMotionProps}
              transition={{ duration: 0.5, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="mt-6 overflow-hidden rounded-3xl border border-black/10 bg-white/80 p-4 shadow-lg backdrop-blur-xl sm:p-5"
              style={{ boxShadow: '0 10px 40px -12px rgba(0,0,0,0.18), 0 1px 0 rgba(255,255,255,0.6) inset' }}
            >
              {filteredItems.length === 0 && (
                <div className="py-12 text-center text-ink/50">
                  <AlertCircle className="mx-auto mb-3 h-10 w-10 opacity-40" />
                  <p className="text-lg">{noResults}</p>
                </div>
              )}

              {activeCat === 'all' ? (
                categories.map((cat, catIdx) => {
                  const catItems = filteredItems.filter((i) => i.category_id === cat.id)
                  if (catItems.length === 0) return null
                  return (
                    <div key={cat.id} className={catIdx === 0 ? '' : 'mt-8'}>
                      <motion.h2
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: 0.05 * catIdx }}
                        className="mb-3 flex items-center gap-2 font-serif text-xl font-bold tracking-tight text-ink"
                        style={{ borderBottom: `2px solid ${T.border}`, paddingBottom: '0.4rem' }}
                      >
                        <span
                          className="inline-block h-5 w-1.5 rounded-full"
                          style={{ background: `linear-gradient(180deg, ${T.brand}, ${T.brand}99)` }}
                        />
                        {cat.name}
                      </motion.h2>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <AnimatePresence mode="popLayout">
                          {catItems.map((item, i) => (
                            <motion.div
                              key={item.id}
                              layout
                              initial={{ opacity: 0, y: 16 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.96 }}
                              transition={{ delay: Math.min(i, 8) * 0.04, duration: 0.3 }}
                            >
                              <MenuItemCard
                                item={item}
                                onAdd={addToCart}
                                palette={T}
                                addLabel={isEn ? 'Add' : 'Aggiungi'}
                                restaurantName={restaurant.name}
                                restaurantLogoUrl={restaurant.logo_url}
                                restaurantLogoIcon={restaurant.logo_icon}
                                restaurantLocation={restaurant.address}
                                tableCode={tableCode}
                                infoLabels={IL}
                              />
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div>
                  {(() => {
                    const cat = categories.find((c) => c.id === activeCat)
                    return cat ? (
                      <motion.h2
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4 }}
                        className="mb-3 flex items-center gap-2 font-serif text-xl font-bold tracking-tight text-ink"
                        style={{ borderBottom: `2px solid ${T.border}`, paddingBottom: '0.4rem' }}
                      >
                        <span
                          className="inline-block h-5 w-1.5 rounded-full"
                          style={{ background: `linear-gradient(180deg, ${T.brand}, ${T.brand}99)` }}
                        />
                        {cat.name}
                      </motion.h2>
                    ) : null
                  })()}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <AnimatePresence mode="popLayout">
                      {filteredItems.map((item, i) => (
                        <motion.div
                          key={item.id}
                          layout
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.96 }}
                          transition={{ delay: Math.min(i, 8) * 0.04, duration: 0.3 }}
                        >
                          <MenuItemCard
                            item={item}
                            onAdd={addToCart}
                            palette={T}
                            addLabel={isEn ? 'Add' : 'Aggiungi'}
                            restaurantName={restaurant.name}
                            restaurantLogoUrl={restaurant.logo_url}
                            restaurantLogoIcon={restaurant.logo_icon}
                            restaurantLocation={restaurant.address}
                            tableCode={tableCode}
                            infoLabels={IL}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </motion.div>
          </main>

          {/* ───────────────────────────────────────────────────────────────────
              FOOTER — card contatti/recensioni, con motion in/out
          ─────────────────────────────────────────────────────────────────── */}
          <footer className="px-4 pt-0" style={{ paddingBottom: cartCount > 0 ? 160 : 32 }}>
            <div className="mx-auto max-w-xl">
              <motion.div
                {...cardMotionProps}
                transition={{ duration: 0.5, delay: 0.24, ease: [0.22, 1, 0.36, 1] }}
                className="lift-hover glass-card sheen relative overflow-hidden rounded-[2rem] p-8 text-center sm:p-10"
                style={{ boxShadow: `0 24px 60px -20px ${T.brand}45, 0 1px 0 rgba(255,255,255,0.7) inset` }}
              >
                <span aria-hidden className="divider-gradient absolute inset-x-10 top-0 h-px" />

                <h3 className="font-serif text-2xl font-bold text-ink">{restaurant.name}</h3>
                <p className="mx-auto mt-1.5 max-w-md text-sm text-ink/55">
                  {isEn ? 'Follow, call, or leave a review.' : 'Seguici, chiamaci o lascia una recensione.'}
                </p>
                {restaurant.address && (
                  <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-ink/45">
                    <MapPin className="h-3 w-3" style={{ color: T.brand }} /> {restaurant.address}
                  </p>
                )}

                <div className="mt-6 flex flex-wrap justify-center gap-2.5">
                  {restaurant.instagram && (
                    <a
                      href={`https://instagram.com/${restaurant.instagram.replace(/^@/, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Instagram"
                      className="lift-hover grid h-11 w-11 place-items-center rounded-full shadow-sm ring-1 ring-black/5"
                      style={{ background: 'radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)' }}
                    >
                      <Instagram className="h-5 w-5 text-white" />
                    </a>
                  )}
                  {(restaurant as Record<string, unknown>).tripadvisor as string | undefined ? (
                    <a
                      href={(restaurant as Record<string, unknown>).tripadvisor as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="TripAdvisor"
                      className="lift-hover grid h-11 w-11 place-items-center overflow-hidden rounded-full shadow-sm ring-1 ring-black/5"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/icons/tripadvisor-logo.png" alt="TripAdvisor" className="h-full w-full object-cover" />
                    </a>
                  ) : null}
                  {restaurant.phone && (
                    <a
                      href={`tel:${restaurant.phone.replace(/\s/g, '')}`}
                      aria-label="Phone"
                      className="lift-hover grid h-11 w-11 place-items-center rounded-full bg-white shadow-sm ring-1 ring-black/5"
                      style={{ color: '#22c55e' }}
                    >
                      <Phone className="h-5 w-5" />
                    </a>
                  )}
                  {restaurant.google_review_url && (
                    <a
                      href={restaurant.google_review_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={reviewTitle}
                      className="lift-hover grid h-11 w-11 place-items-center rounded-full bg-white shadow-sm ring-1 ring-black/5"
                      style={{ color: T.brand }}
                    >
                      <Star className="h-5 w-5" />
                    </a>
                  )}
                </div>

                <div className="mt-7 flex flex-wrap justify-center gap-2.5">
                  <Button
                    onClick={() => setShowReviewModal(true)}
                    className="sheen gap-2 rounded-full px-5 font-semibold text-white"
                    style={{ background: T.btnBg, boxShadow: T.btnShadow }}
                  >
                    <Star className="h-4 w-4 fill-current" /> {reviewTitle}
                  </Button>
                  {restaurant.website && (
                    <Button asChild variant="outline" className="gap-2 rounded-full px-5 font-semibold">
                      <a href={restaurant.website} target="_blank" rel="noopener noreferrer">
                        <Globe className="h-4 w-4" /> {isEn ? 'Website' : 'Sito web'}
                      </a>
                    </Button>
                  )}
                </div>

                <div className="mt-7 flex flex-col items-center gap-1">
                  <p className="text-[11px] font-semibold tracking-wide text-ink/40">
                    {isEn ? 'Powered by' : 'Powered by'}{' '}
                    <span
                      style={{ color: T.brand }}
                      className="font-bold cursor-pointer hover:underline"
                      onClick={() => router.push('/')}
                    >
                      Tavola Rapida
                    </span>
                  </p>
                  <p className="text-[10px] text-ink/30">
                    © {new Date().getFullYear()} Tavola Rapida. {isEn ? 'All rights reserved.' : 'Tutti i diritti riservati.'}
                  </p>
                </div>
              </motion.div>
            </div>
          </footer>

          {/* Sfumato bianco dietro la sticky cart bottom-sheet, per staccarla dallo sfondo (stesso effetto usato in /confirm) */}
          {cartCount > 0 && (
            <div
              aria-hidden
              className="fixed inset-x-0 bottom-0 z-30 pointer-events-none"
              style={{ height: 110, background: "linear-gradient(0deg, rgba(255,255,255,0.95) 55%, rgba(255,255,255,0) 100%)" }}
            />
          )}

          {/* ───────────────────────────────────────────────────────────────────
              STICKY CART BOTTOM-SHEET — drag handle follows finger
              Header più "premium": gradient subtle + shadow elevato.
          ─────────────────────────────────────────────────────────────────── */}
          <AnimatePresence>
            {cartCount > 0 && (
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="pointer-events-none fixed bottom-6 left-4 right-4 z-40 mx-auto max-w-sm"
              >
                {/* Tasto AI — destra */}
                <div className="pointer-events-none flex justify-end px-1 pb-2">
                  <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => window.dispatchEvent(new CustomEvent('open-chat'))}
                    aria-label="AIchat"
                    className="pointer-events-auto flex items-center justify-center shadow-lg transition hover:opacity-90"
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      flexShrink: 0,
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </motion.button>
                </div>

                <div
                  className="pointer-events-auto overflow-hidden rounded-2xl border border-black/8 bg-white shadow-2xl select-none touch-none"
                  style={{ touchAction: 'none', boxShadow: '0 20px 50px -12px rgba(0,0,0,0.25)' }}
                  onPointerDown={(e) => {
                    const target = e.target as HTMLElement
                    if (target.closest('button, a')) return
                    e.preventDefault()
                    e.stopPropagation()

                    const pointerId = e.pointerId
                    const targetEl = e.currentTarget as HTMLElement
                    const startY = e.clientY
                    const startH = (cartDetailRef.current?.scrollHeight ?? 240) + 16
                    const base = cartExpanded ? startH : 0
                    let dragging = false
                    targetEl.setPointerCapture(pointerId)

                    const onMove = (ev: PointerEvent) => {
                      const delta = startY - ev.clientY
                      if (!dragging) {
                        if (Math.abs(delta) < 6) return
                        dragging = true
                      }
                      ev.preventDefault()
                      const next = Math.max(0, Math.min(startH, base + delta))
                      cartDetailHeight.set(next)
                    }
                    const onUp = (ev: PointerEvent) => {
                      const delta = startY - ev.clientY
                      const fullH = (cartDetailRef.current?.scrollHeight ?? 240) + 16
                      const threshold = fullH * 0.35
                      if (dragging) {
                        if (!cartExpanded && delta > threshold) {
                          setCartExpanded(true)
                          animate(cartDetailHeight, fullH, { type: 'spring', stiffness: 400, damping: 35 })
                        } else if (cartExpanded && delta < -threshold) {
                          setCartExpanded(false)
                          animate(cartDetailHeight, 0, { type: 'spring', stiffness: 400, damping: 35 })
                        } else {
                          animate(cartDetailHeight, cartExpanded ? fullH : 0, { type: 'spring', stiffness: 400, damping: 35 })
                        }
                      }
                      window.removeEventListener('pointermove', onMove)
                      window.removeEventListener('pointerup', onUp)
                    }
                    window.addEventListener('pointermove', onMove)
                    window.addEventListener('pointerup', onUp)
                  }}
                >
                  {/* Drag handle */}
                  <div className="flex justify-center pt-2.5 pb-2 cursor-grab active:cursor-grabbing touch-none">
                    <div className="h-1 w-10 rounded-full bg-black/15" />
                  </div>

                  {/* Compact row */}
                  <div className="flex items-center gap-3 px-3 pb-3">
                    <motion.div
                      id="cart-icon"
                      animate={cartIconControls}
                      className="relative grid h-11 w-11 shrink-0 place-items-center rounded-xl"
                      style={{ background: `linear-gradient(135deg, ${T.brand}, ${T.brand}cc)`, boxShadow: `0 4px 12px -2px ${T.brand}55` }}
                    >
                      <ShoppingCart className="h-5 w-5 text-white" />
                      <motion.span
                        key={cartCount}
                        initial={{ scale: 1.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.25, ease: 'backOut' }}
                        className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-red-500 text-[10px] font-bold text-white"
                        style={{ boxShadow: '0 2px 8px rgba(239,68,68,0.4)' }}
                      >
                        {cartCount}
                      </motion.span>
                    </motion.div>
                    <div className="flex-1">
                      <p className="font-serif text-sm font-black uppercase tracking-wide text-ink">{cartLabel}</p>
                      <p className="text-xs font-bold tabular-nums" style={{ color: T.brand }}>
                        {(cartTotalCents / 100).toFixed(2)} €
                      </p>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => router.push(`/cart/${sessionId}`)}
                      className="sheen rounded-full px-5 py-2.5 text-sm font-bold text-white shrink-0"
                      style={{ background: T.btnBg, boxShadow: T.btnShadow }}
                    >
                      {orderNow}
                    </motion.button>
                  </div>

                  {/* Detail panel */}
                  <motion.div style={{ height: cartDetailHeight, overflow: 'hidden' }}>
                    <div ref={cartDetailRef} className="tr-scroll space-y-1.5 border-t border-black/6 px-3 pt-2.5 pb-3 max-h-72 overflow-y-auto">
                      {(() => {
                        const entries = Object.entries(cartByMenuItem)
                        const visible = entries.slice(0, 6)
                        const extra = entries.length - 6
                        return (
                          <>
                            {visible.map(([menuItemId, { qty, orderItemId }]) => {
                              const it = items.find((i) => i.id === menuItemId)
                              if (!it) return null
                              return (
                                <div key={menuItemId} className="flex items-center gap-2 text-sm text-ink flex-nowrap">
                                  <span className="min-w-0 flex-1 truncate text-base font-semibold">{it.name}</span>
                                  <div
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      background: '#f1f5f9',
                                      border: '1px solid #e2e8f0',
                                      borderRadius: 8,
                                      overflow: 'hidden',
                                      flexShrink: 0,
                                    }}
                                  >
                                    <button
                                      onClick={() => {
                                        triggerQtyAnim(menuItemId, qty, -1)
                                        updateCartQuantity(orderItemId, -1)
                                      }}
                                      style={{
                                        width: 24,
                                        height: 24,
                                        background: 'none',
                                        border: 'none',
                                        borderRight: '1px solid #e2e8f0',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#64748b',
                                      }}
                                    >
                                      <Minus className="h-3 w-3" />
                                    </button>
                                    <span
                                      style={{
                                        width: 22,
                                        height: 24,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 800,
                                        fontSize: 13,
                                        position: 'relative',
                                        overflow: 'hidden',
                                        color: '#1a2236',
                                      }}
                                    >
                                      {(() => {
                                        const anim = qtyAnim[menuItemId]
                                        if (!anim) return <span style={{ position: 'absolute' }}>{qty}</span>
                                        const outClass = anim.direction === 1 ? 'slot-out-down' : 'slot-out-up'
                                        const inClass = anim.direction === 1 ? 'slot-in-top' : 'slot-in-bottom'
                                        return (
                                          <>
                                            <span className={`qty-slot-digit ${outClass}`} style={{ position: 'absolute' }}>
                                              {anim.prevQty}
                                            </span>
                                            <span className={`qty-slot-digit ${inClass}`} style={{ position: 'absolute' }}>
                                              {qty}
                                            </span>
                                          </>
                                        )
                                      })()}
                                    </span>
                                    <button
                                      onClick={() => {
                                        triggerQtyAnim(menuItemId, qty, 1)
                                        addToCart(it)
                                      }}
                                      style={{
                                        width: 24,
                                        height: 24,
                                        background: 'none',
                                        border: 'none',
                                        borderLeft: '1px solid #e2e8f0',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#64748b',
                                      }}
                                    >
                                      <Plus className="h-3 w-3" />
                                    </button>
                                  </div>
                                  <span className="w-16 shrink-0 text-right font-serif text-sm font-black text-ink">
                                    {((it.price_cents * qty) / 100).toFixed(2)}€
                                  </span>
                                </div>
                              )
                            })}
                            {extra > 0 && (
                              <p className="text-xs font-semibold text-ink/50 pl-0.5">
                                … +{extra} {isEn ? 'more' : extra === 1 ? 'altro' : 'altri'}
                              </p>
                            )}
                          </>
                        )
                      })()}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginTop: 10,
                          paddingTop: 8,
                          borderTop: '1.5px solid rgba(0,0,0,0.08)',
                        }}
                      >
                        <button
                          onClick={() => setShowClearConfirm(true)}
                          className="flex items-center gap-1.5 text-sm font-semibold text-red-400 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" /> {isEn ? 'Clear cart' : 'Svuota carrello'}
                        </button>
                        <span style={{ fontSize: 16, fontWeight: 900, color: T.text, fontVariantNumeric: 'tabular-nums' }}>
                          {(cartTotalCents / 100).toFixed(2)} €
                        </span>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Flying dot to cart */}
          {flyingDot &&
            (() => {
              const cartEl = document.getElementById('cart-icon')
              const cartRect = cartEl?.getBoundingClientRect()
              const dx = cartRect ? cartRect.left + cartRect.width / 2 - flyingDot.x : 0
              const dy = cartRect ? cartRect.top + cartRect.height / 2 - flyingDot.y : 0
              return (
                <div
                  key={flyingDot.id}
                  style={{
                    position: 'fixed',
                    left: flyingDot.x - 14,
                    top: flyingDot.y - 14,
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: T.flyDot,
                    border: '2px solid rgba(255,255,255,0.6)',
                    boxShadow: T.flyGlow,
                    zIndex: 9999,
                    pointerEvents: 'none',
                    transition: 'transform 1.05s cubic-bezier(0.25,0.46,0.45,0.94), opacity 1.05s ease',
                    transform: `translate(${dx}px, ${dy}px) scale(0.4)`,
                    opacity: 0,
                  }}
                />
              )
            })()}

          {/* ───────────────────────────────────────────────────────────────────
              AI SEARCH OVERLAY
          ─────────────────────────────────────────────────────────────────── */}
          <AnimatePresence>
            {searchOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => closeSearch(true)}
                className="fixed inset-0 z-[80] grid place-items-center bg-black/60 p-4 backdrop-blur-xl"
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.9, opacity: 0, y: 20 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-lg overflow-hidden rounded-3xl border bg-white/95 shadow-2xl backdrop-blur"
                  style={{ borderColor: T.borderMid }}
                >
                  <div className="mb-5 flex items-center gap-3 px-7 pt-7">
                    <motion.div
                      initial={{ rotate: -10, scale: 0.8 }}
                      animate={{ rotate: 0, scale: 1 }}
                      transition={{ duration: 0.4, delay: 0.1, ease: [0.34, 1.56, 0.64, 1] }}
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-full"
                      style={{ background: T.btnBg, boxShadow: T.btnShadow }}
                    >
                      <Search className="h-5 w-5 text-white" />
                    </motion.div>
                    <p className="flex-1 text-lg font-bold text-ink">{searchTitle}</p>
                    <button onClick={() => closeSearch(true)} className="grid h-8 w-8 place-items-center rounded-full bg-ink/5 text-ink/60 transition hover:bg-ink/10">
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="px-7 pb-7">
                    <div className="relative mb-5">
                      <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2" style={{ color: T.brand }} />
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') closeSearch(true)
                        }}
                        placeholder={isEn ? 'e.g. pizza, truffle pasta…' : 'es. pizza, pasta al tartufo…'}
                        className="w-full rounded-2xl border-2 bg-white/90 py-3.5 pl-11 pr-11 text-base font-medium text-ink outline-none transition focus:border-current"
                        style={{ borderColor: T.borderStrong }}
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute right-3.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full"
                          style={{ background: T.chipBg, color: T.textSoft }}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide" style={{ color: T.border }}>
                      {ideasLabel}
                    </p>
                    <div className="flex flex-wrap gap-2.5">
                      {suggestions.map(({ emoji, label }, i) => (
                        <motion.button
                          key={label}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.05 * i }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleSuggestion(label.toLowerCase())}
                          className="flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold text-ink/70 shadow-sm transition"
                          style={{ borderColor: T.border, background: T.light200 }}
                        >
                          <span>{emoji}</span> {label}
                        </motion.button>
                      ))}
                    </div>

                    {searchQuery.trim() && (
                      <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => closeSearch(true)}
                        className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 font-bold text-white"
                        style={{ background: T.btnBg, boxShadow: T.btnShadow }}
                      >
                        <Sparkles className="h-4 w-4" />
                        {isEn ? `Search "${searchQuery}"` : `Cerca "${searchQuery}"`}
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ───────────────────────────────────────────────────────────────────
              REVIEW MODAL
          ─────────────────────────────────────────────────────────────────── */}
          <AnimatePresence>
            {showReviewModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowReviewModal(false)}
                className="fixed inset-0 z-[200] grid place-items-center bg-black/65 p-4 backdrop-blur-xl"
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.9, opacity: 0, y: 20 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-sm overflow-hidden rounded-3xl bg-white/95 shadow-2xl backdrop-blur"
                >
                  <div className="relative px-8 py-7 text-center" style={{ background: T.btnBg }}>
                    <button
                      onClick={() => setShowReviewModal(false)}
                      className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-white/20 text-white transition hover:bg-white/30"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-white/65">{reviewTitle}</p>
                    <h2 className="font-serif text-2xl font-extrabold text-white">{restaurant.name}</h2>
                  </div>

                  <div className="px-8 py-8">
                    {reviewSubmitted ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
                        className="text-center"
                      >
                        <motion.div
                          initial={{ scale: 0, rotate: -20 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ duration: 0.5, delay: 0.1, ease: [0.34, 1.56, 0.64, 1] }}
                          className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full"
                          style={{ background: T.chipBg }}
                        >
                          <CheckCircle2 className="h-8 w-8" style={{ color: T.brand }} />
                        </motion.div>
                        <h3 className="mb-2 text-xl font-bold text-ink">{reviewThanks}</h3>
                        <p className="text-sm text-ink/60">{reviewThanksBody}</p>
                      </motion.div>
                    ) : (
                      <>
                        <div className="mb-6 text-center">
                          <p className="mb-3.5 text-xs font-bold uppercase tracking-wide text-ink/50">{reviewQ}</p>
                          <div className="flex justify-center gap-2.5">
                            {[1, 2, 3, 4, 5].map((n) => {
                              const filled = n <= (reviewHovered || reviewStars)
                              return (
                                <motion.button
                                  key={n}
                                  whileHover={{ scale: 1.15 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => setReviewStars(n)}
                                  onMouseEnter={() => setReviewHovered(n)}
                                  onMouseLeave={() => setReviewHovered(0)}
                                  className={cn('p-1 transition', filled && 'scale-110')}
                                >
                                  <Star
                                    className="h-9 w-9"
                                    fill={filled ? T.brand : 'none'}
                                    stroke={filled ? T.brand : '#d4c5b0'}
                                    strokeWidth={1.5}
                                  />
                                </motion.button>
                              )
                            })}
                          </div>
                          {reviewStars > 0 && (
                            <p className="mt-2.5 text-sm font-semibold" style={{ color: T.brand }}>
                              {ratings[reviewStars]}
                            </p>
                          )}
                        </div>

                        <div className="mb-5">
                          <label className="mb-2.5 block text-xs font-bold uppercase tracking-wide text-ink/50">{reviewMore}</label>
                          <textarea
                            rows={4}
                            value={reviewText}
                            onChange={(e) => setReviewText(e.target.value)}
                            placeholder={reviewPlaceholder}
                            className="w-full resize-none rounded-2xl border-2 p-3.5 text-sm leading-relaxed text-ink outline-none transition focus:border-current"
                            style={{ borderColor: T.border, background: T.chipBg }}
                          />
                        </div>

                        <Button
                          onClick={handleReviewSubmit}
                          disabled={reviewStars === 0}
                          className="w-full gap-2 rounded-2xl py-3.5 font-bold text-white disabled:opacity-50"
                          style={{ background: T.btnBg }}
                        >
                          <Star className="h-4 w-4 fill-current" /> {reviewSubmitLabel}
                        </Button>
                      </>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ───────────────────────────────────────────────────────────────────
              CLEAR CART CONFIRM MODAL
          ─────────────────────────────────────────────────────────────────── */}
          <AnimatePresence>
            {showClearConfirm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowClearConfirm(false)}
                className="fixed inset-0 z-[300] grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
              >
                <motion.div
                  initial={{ scale: 0.85, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.85, opacity: 0, y: 20 }}
                  transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-xs overflow-hidden rounded-3xl bg-white shadow-2xl"
                >
                  <div className="flex flex-col items-center px-8 py-8 text-center">
                    <motion.div
                      initial={{ scale: 0, rotate: -10 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ duration: 0.5, delay: 0.1, ease: [0.34, 1.56, 0.64, 1] }}
                      className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-red-50"
                    >
                      <Trash2 className="h-7 w-7 text-red-500" />
                    </motion.div>
                    <h3 className="mb-1.5 font-serif text-xl font-extrabold text-ink">
                      {isEn ? 'Clear cart?' : 'Svuota il carrello?'}
                    </h3>
                    <p className="mb-7 text-sm text-ink/55">
                      {isEn
                        ? 'All items will be removed. This action cannot be undone.'
                        : 'Tutti i piatti verranno rimossi. L\'operazione non è reversibile.'}
                    </p>
                    <div className="flex w-full gap-3">
                      <button
                        onClick={() => setShowClearConfirm(false)}
                        className="flex-1 rounded-2xl border-2 border-ink/10 py-3 text-sm font-bold text-ink/60 transition hover:border-ink/20 hover:text-ink"
                      >
                        {isEn ? 'Cancel' : 'Annulla'}
                      </button>
                      <button
                        onClick={() => {
                          clearCart()
                          setShowClearConfirm(false)
                        }}
                        className="flex-1 rounded-2xl bg-red-500 py-3 text-sm font-bold text-white transition hover:bg-red-600 active:scale-95"
                      >
                        {isEn ? 'Clear' : 'Svuota'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </PageShell>
  )
}

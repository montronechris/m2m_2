'use client'

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence, useMotionValue, useTransform, animate, useAnimation } from 'framer-motion'
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
  ArrowLeft,
  UtensilsCrossed,
  MapPin,
  Phone,
  Instagram,
  Globe,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageShell } from '@/components/landing/PageShell'
import { useI18n } from '@/components/i18n/I18nProvider'
import { cn } from '@/lib/utils'
import { CategoryFilter } from '@/components/client/order/CategoryFilter'
import { ScanError } from '@/components/client/scan/ScanError'
import { MenuItemCard, type MenuItem } from '@/components/client/order/MenuItemCard'
import { buildPalette, DEFAULT_BRAND, type Palette } from '@/components/client/order/palette'
import { useOrderSession } from '@/hooks/useOrderSession'
import { useCartStore } from '@/stores/useCartStore'
import { useCartRealtime } from '@/hooks/useCartRealtime'
import { BurgerLoader } from '@/components/client/order/BurgerLoader'

// ─── SKELETON DI CARICAMENTO (transizione tra pagine) ──────────────────────────
// Ricalca la struttura reale della pagina menù (card filtri + griglia card piatto)
// così la transizione resta visivamente coerente invece di uno schermo vuoto.

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
        {/* Card filtri */}
        <div className="rounded-3xl border border-black/10 bg-white/85 p-4 shadow-sm sm:p-5">
          <div className="skeleton-pulse mb-5 h-4 w-28 rounded-full bg-black/10" />
          {/* Search bar skeleton */}
          <div className="mb-3 flex w-full items-center gap-3.5 rounded-full border border-ink/5 bg-white/80 p-4">
            <div className="skeleton-pulse h-11 w-11 shrink-0 rounded-full bg-black/10" />
            <div className="flex-1 space-y-2">
              <div className="skeleton-pulse h-3.5 w-2/3 rounded-full bg-black/10" />
              <div className="skeleton-pulse h-3 w-1/3 rounded-full bg-black/10" />
            </div>
          </div>
          {/* Category pills skeleton */}
          <div className="flex flex-wrap gap-2">
            {[72, 96, 84, 64, 100].map((w, i) => (
              <div
                key={i}
                className="skeleton-pulse h-8 rounded-full bg-black/10"
                style={{ width: w }}
              />
            ))}
          </div>
        </div>

        {/* Card griglia piatti */}
        <div className="mt-6 rounded-3xl border border-black/10 bg-white/85 p-4 shadow-sm sm:p-5">
          <div className="skeleton-pulse mb-3 h-5 w-40 rounded-full bg-black/10" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex gap-3 rounded-2xl border border-black/5 bg-white p-3"
              >
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

export default function OrderPage({ params }: { params: Promise<{ token: string }> }) {
  const { tr, lang } = useI18n()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [sessionId, setSessionId] = useState<string>('')
  useEffect(() => {
    params.then((p) => setSessionId(p.token))
  }, [params])

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
    } catch { /* ignore */ }
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
  const T: Palette = useMemo(
    () => buildPalette(restaurant?.brand_color || DEFAULT_BRAND),
    [restaurant?.brand_color]
  )

  // Appena i dati del ristorante sono pronti, li invia al layout (Navbar)
  // tramite evento custom — evita una seconda query Supabase dal layout.
  useEffect(() => {
    if (!restaurant || !sessionId) return
    window.dispatchEvent(new CustomEvent('restaurant-meta-ready', {
      detail: {
        name: restaurant.name,
        brandColor: (restaurant as any).brand_color ?? null,
        tableNumber: tableNumber ?? null,
      }
    }))
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
const [loaderDone, setLoaderDone] = useState(!fromScan);  const [activeCat, setActiveCat] = useState('all')
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
    setQtyAnim(prev => ({ ...prev, [id]: { prevQty, direction } }))
    qtyAnimTimers.current[id] = setTimeout(() => {
      setQtyAnim(prev => { const n = { ...prev }; delete n[id]; return n })
    }, 260)
  }
  const [reviewStars, setReviewStars] = useState(0)
  const [reviewHovered, setReviewHovered] = useState(0)
  const [reviewText, setReviewText] = useState('')
  const [reviewSubmitted, setReviewSubmitted] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [waiterStatus, setWaiterStatus] = useState<'idle' | 'pending' | 'acknowledged'>('idle')
  useEffect(() => {
    const handler = (e: Event) => setWaiterStatus((e as CustomEvent).detail)
    window.addEventListener('waiter-status', handler)
    return () => window.removeEventListener('waiter-status', handler)
  }, [])
  const [cartExpanded, setCartExpanded] = useState(false)
  const cartDetailRef = useRef<HTMLDivElement>(null)
  const cartDetailHeight = useMotionValue(0)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // ── Mappatura dati reali → tipi usati dalla UI ──────────────────────────────
  const categories = useMemo(
    () => {
      const map = tr.client.categoryNames as Record<string, string>
      const norm = (s: string) =>
        s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
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

  const txArr = useCallback(
    (arr: string[] | undefined) => arr?.map((s) => translations[s] ?? s),
    [translations]
  )

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
  const cartTotal = cartTotalCents / 100

  // Animazione icona carrello quando aumentano gli articoli
  const cartIconControls = useAnimation()
  const prevCartCountRef = useRef(cartCount)
  useEffect(() => {
    if (cartCount > prevCartCountRef.current) {
      cartIconControls.start({
        scale:    [1, 1.45, 0.92, 1.18, 1],
        rotate:   [0, -12,  12,  -6,   0],
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
  function removeFromCart(menuItemId: string) {
    const entry = cartByMenuItem[menuItemId]
    if (!entry) return
    updateCartQuantity(entry.orderItemId, -1)
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
      .replace(/[̀-ͯ]/g, '')
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
  }

  const heroDesc = isEn
    ? 'Choose from our dishes made with passion. Fresh ingredients, traditional recipes and fast service straight to your table.'
    : 'Scegli tra i nostri piatti preparati con passione. Ingredienti freschi, ricette tradizionali e servizio veloce direttamente al tuo tavolo.'
  const partnerLabel = isEn ? 'Partner Restaurant' : 'Ristorante Partner'
  const searchTitle = isEn ? 'What are you in the mood for?' : 'Cosa hai voglia di mangiare?'
  const searchSub = isEn ? 'Search by dish, ingredient or category…' : 'Cerca per piatto, ingrediente o categoria…'
  const vegLabel = isEn ? 'Vegetarian' : 'Vegetariano'
  const gfLabel = isEn ? 'Gluten Free' : 'Senza Glutine'
  const removeFilters = isEn ? '✕ Clear filters' : '✕ Rimuovi filtri'
  const ideasLabel = isEn ? 'Ideas to get started' : 'Idee per iniziare'
  const noResults = isEn ? 'No dishes found.' : 'Nessun piatto trovato.'
  const cartLabel = isEn ? 'Cart' : 'Carrello'
  const orderNow = isEn ? 'Order now' : 'Ordina ora'
  const reviewTitle = isEn ? 'Leave a review' : 'Recensisci'
  const reviewQ = isEn ? 'How was your experience?' : 'Com\'è stata la tua esperienza?'
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

  // sessionId non è ancora pronto (params Promise non risolta) o la sessione
  // sta ancora caricando: NON è un errore, è solo uno stato transitorio.
  // Niente BurgerLoader qui: quello compare solo arrivando da /scan (vedi sopra).
  // Mostriamo lo skeleton della pagina menù sopra lo sfondo cachato, così la
  // transizione resta fluida invece di un flash bianco o vuoto.
  if (!sessionId || sessionLoading) {
    return <MenuSkeleton bg={cachedBg} />
  }

  if (sessionError || !restaurant) {
    return <ScanError error={sessionError} tableCode={tableCode ?? undefined} />
  }

  const isImageBg =
    (restaurant as any).background_type === 'image' &&
    !!(restaurant as any).background_image_url

  return (
    <PageShell bare>
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
              : (restaurant as any).background_type === 'color' &&
                (restaurant as any).background_image_url
              ? (restaurant as any).background_image_url
              : T.bgGradient,
          } as React.CSSProperties
        }
      >
        {/* Sfondo immagine — usa un div fixed separato per evitare il bug
            di zoom su mobile causato da background-attachment:fixed */}
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
            {/* Filtri + ricerca card (tutto unito) */}
            <div
className="mt-6 rounded-3xl border border-black/10 bg-white/85 p-4 shadow-sm backdrop-blur-md sm:p-5"
              style={{ boxShadow: '0 6px 24px -10px rgba(0,0,0,0.20)' }}
            >
<p className="mb-5 mt-0 text-base font-bold text-ink/70">{tr.client.order.filterCategory}</p>
              {/* Search bar */}
              <button
                onClick={openSearch}
  className="flex w-full items-center gap-3.5 rounded-full border border-ink/5 bg-white/80 p-4 text-left shadow-sm backdrop-blur transition hover:shadow-md mb-3"
              >
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full" style={{ background: T.chipBg }}>
                  <Search className="h-5 w-5" style={{ color: T.textSoft }} />
                </div>
                <div className="flex-1">
                  <p className="text-base font-semibold text-ink">{searchTitle}</p>
                  <p className="text-xs" style={{ color: '#6b7280' }}>
                    {searchSub}
                  </p>
                </div>
              </button>

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
                    className="flex items-center gap-1.5 rounded-full border-2 px-3.5 py-1.5 text-sm font-semibold"
                    style={{ borderColor: T.brand, background: T.chipBg, color: T.textSoft }}
                  >
                    <Search className="h-3.5 w-3.5" /> {searchQuery}
                    <X className="h-3 w-3 opacity-60" />
                  </button>
                )}
                <button
                  onClick={() => setFilterVeg((v) => !v)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold shadow-sm transition',
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
                    'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold shadow-sm transition',
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
                    className="rounded-full border-2 border-red-200 px-3 py-1.5 text-xs font-medium text-red-600"
                  >
                    {removeFilters}
                  </button>
                )}
              </div>
            </div>

            {/* Menu grid card */}
            <div
className="mt-6 rounded-3xl border border-black/10 bg-white/85 p-4 shadow-sm backdrop-blur-md sm:p-5"
              style={{ boxShadow: '0 6px 24px -10px rgba(0,0,0,0.20)' }}
            >
              {filteredItems.length === 0 && (
                <div className="py-12 text-center text-ink/50">
                  <AlertCircle className="mx-auto mb-3 h-10 w-10 opacity-40" />
                  <p className="text-lg">{noResults}</p>
                </div>
              )}

              {activeCat === 'all' ? (
                /* Grouped by category */
                categories.map((cat, catIdx) => {
                  const catItems = filteredItems.filter((i) => i.category_id === cat.id)
                  if (catItems.length === 0) return null
                  return (
                    <div key={cat.id} className={catIdx === 0 ? '' : 'mt-8'}>
                      <h2
                        className="mb-3 font-serif text-xl font-bold tracking-tight text-ink"
                        style={{ borderBottom: `2px solid ${T.border}`, paddingBottom: '0.4rem' }}
                      >
                        {cat.name}
                      </h2>
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
                /* Single category */
                <div>
                {(() => {
                  const cat = categories.find((c) => c.id === activeCat)
                  return cat ? (
                    <h2
                      className="mb-3 font-serif text-xl font-bold tracking-tight text-ink"
                      style={{ borderBottom: `2px solid ${T.border}`, paddingBottom: '0.4rem' }}
                    >
                      {cat.name}
                    </h2>
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
                          infoLabels={IL}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
                </div>
              )}
            </div>

          </main>

          {/* Footer — card contatti/recensioni, sotto i piatti disponibili */}
          <footer className="px-4 pb-8 pt-0">
            <div className="mx-auto max-w-xl">
              <div
                className="lift-hover glass-card sheen relative overflow-hidden rounded-[2rem] p-8 text-center sm:p-10"
                style={{ boxShadow: `0 24px 60px -20px ${T.brand}45, 0 1px 0 rgba(255,255,255,0.7) inset` }}
              >
                {/* filo decorativo in alto, dal sistema globale */}
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
                      <img
                        src="/icons/tripadvisor-logo.png"
                        alt="TripAdvisor"
                        className="h-full w-full object-cover"
                      />
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
                    © {new Date().getFullYear()} Tavola Rapida.{' '}
                    {isEn ? 'All rights reserved.' : 'Tutti i diritti riservati.'}
                  </p>
                </div>
              </div>
            </div>
          </footer>

          {/* Sticky cart bottom-sheet — drag handle follows finger */}
          <AnimatePresence>
            {cartCount > 0 && (
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="fixed bottom-6 left-4 right-4 z-40 mx-auto max-w-sm"
              >
                {/* Tasto AI — destra */}
                <div className="flex justify-end px-1 pb-2">
                  <button
                    onClick={() => window.dispatchEvent(new CustomEvent('open-chat'))}
                    aria-label="AIchat"
                    className="flex items-center justify-center shadow-lg transition hover:opacity-90"
                    style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', flexShrink: 0 }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </button>
                </div>

                <div className="rounded-2xl border border-black/8 bg-white shadow-2xl overflow-hidden">
                  {/* Drag handle — gesture area */}
                  <div
                    className="flex justify-center pt-2.5 pb-2 cursor-grab active:cursor-grabbing select-none touch-none"
                    onPointerDown={(e) => {
                      e.currentTarget.setPointerCapture(e.pointerId)
                      const startY = e.clientY
                      const startH = (cartDetailRef.current?.scrollHeight ?? 240) + 16
                      const base = cartExpanded ? startH : 0

                      const onMove = (ev: PointerEvent) => {
                        const delta = startY - ev.clientY
                        const next = Math.max(0, Math.min(startH, base + delta))
                        cartDetailHeight.set(next)
                      }
                      const onUp = (ev: PointerEvent) => {
                        const delta = startY - ev.clientY
                        const fullH = (cartDetailRef.current?.scrollHeight ?? 240) + 16
                        const threshold = fullH * 0.35
                        if (!cartExpanded && delta > threshold) {
                          setCartExpanded(true)
                          animate(cartDetailHeight, fullH, { type: 'spring', stiffness: 400, damping: 35 })
                        } else if (cartExpanded && delta < -threshold) {
                          setCartExpanded(false)
                          animate(cartDetailHeight, 0, { type: 'spring', stiffness: 400, damping: 35 })
                        } else {
                          animate(cartDetailHeight, cartExpanded ? fullH : 0, { type: 'spring', stiffness: 400, damping: 35 })
                        }
                        window.removeEventListener('pointermove', onMove)
                        window.removeEventListener('pointerup', onUp)
                      }
                      window.addEventListener('pointermove', onMove)
                      window.addEventListener('pointerup', onUp)
                    }}
                  >
                    <div className="h-1 w-10 rounded-full bg-black/15" />
                  </div>

                  {/* Always-visible compact row */}
                  <div className="flex items-center gap-3 px-3 pb-3">
                    <motion.div
                      id="cart-icon"
                      animate={cartIconControls}
                      className="relative grid h-11 w-11 shrink-0 place-items-center rounded-xl"
                      style={{ background: T.brand }}
                    >
                      <ShoppingCart className="h-5 w-5 text-white" />
                      <motion.span
                        key={cartCount}
                        initial={{ scale: 1.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.25, ease: 'backOut' }}
                        className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-red-500 text-[10px] font-bold text-white"
                      >
                        {cartCount}
                      </motion.span>
                    </motion.div>
                    <div className="flex-1">
                      <p className="font-serif text-sm font-black uppercase tracking-wide text-ink">{cartLabel}</p>
                      <p className="text-xs font-bold tabular-nums" style={{ color: T.brand }}>{(cartTotalCents / 100).toFixed(2)} €</p>
                    </div>
                    <button
                      onClick={() => router.push(`/cart/${sessionId}`)}
                      className="rounded-full px-5 py-2.5 text-sm font-bold text-white shrink-0"
                      style={{ background: T.btnBg }}
                    >
                      {orderNow}
                    </button>
                  </div>

                  {/* Detail panel — height driven by motionValue */}
                  <motion.div style={{ height: cartDetailHeight, overflow: 'hidden' }}>
                    <div ref={cartDetailRef} className="space-y-1.5 border-t border-black/6 px-3 pt-2.5 pb-3">
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
                                  <span className="min-w-0 flex-1 truncate font-medium">{it.name}</span>
                                  <div style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
                                    <button
                                      onClick={() => { triggerQtyAnim(menuItemId, qty, -1); updateCartQuantity(orderItemId, -1) }}
                                      style={{ width: 24, height: 24, background: 'none', border: 'none', borderRight: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}
                                    >
                                      <Minus className="h-3 w-3" />
                                    </button>
                                    <span style={{ width: 22, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, position: 'relative', overflow: 'hidden', color: '#1a2236' }}>
                                      {(() => {
                                        const anim = qtyAnim[menuItemId]
                                        if (!anim) return <span style={{ position: 'absolute' }}>{qty}</span>
                                        const outClass = anim.direction === 1 ? 'slot-out-down' : 'slot-out-up'
                                        const inClass  = anim.direction === 1 ? 'slot-in-top'   : 'slot-in-bottom'
                                        return (
                                          <>
                                            <span className={`qty-slot-digit ${outClass}`} style={{ position: 'absolute' }}>{anim.prevQty}</span>
                                            <span className={`qty-slot-digit ${inClass}`} style={{ position: 'absolute' }}>{qty}</span>
                                          </>
                                        )
                                      })()}
                                    </span>
                                    <button
                                      onClick={() => { triggerQtyAnim(menuItemId, qty, 1); addToCart(it) }}
                                      style={{ width: 24, height: 24, background: 'none', border: 'none', borderLeft: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}
                                    >
                                      <Plus className="h-3 w-3" />
                                    </button>
                                  </div>
                                  <span className="w-16 shrink-0 text-right font-serif text-sm font-black text-ink">{((it.price_cents * qty) / 100).toFixed(2)}€</span>
                                </div>
                              )
                            })}
                            {extra > 0 && (
                              <p className="text-xs font-semibold text-ink/50 pl-0.5">… +{extra} {isEn ? 'more' : extra === 1 ? 'altro' : 'altri'}</p>
                            )}
                          </>
                        )
                      })()}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 8, borderTop: '1.5px solid rgba(0,0,0,0.08)' }}>
                        <button
                          onClick={() => setShowClearConfirm(true)}
                          className="flex items-center gap-1 text-[10px] text-red-400 hover:text-red-500"
                        >
                          <Trash2 className="h-2.5 w-2.5" /> {isEn ? 'Clear cart' : 'Svuota carrello'}
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

          {/* AI Search Overlay */}
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
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-lg rounded-3xl border bg-white/95 p-7 shadow-2xl backdrop-blur"
                  style={{ borderColor: T.borderMid }}
                >
                  <div className="mb-5 flex items-center gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full" style={{ background: T.btnBg }}>
                      <Search className="h-5 w-5 text-white" />
                    </div>
                    <p className="flex-1 text-lg font-bold text-ink">{searchTitle}</p>
                    <button onClick={() => closeSearch(true)} className="grid h-8 w-8 place-items-center rounded-full bg-ink/5 text-ink/60">
                      <X className="h-4 w-4" />
                    </button>
                  </div>

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
                      className="w-full rounded-2xl border-2 bg-white/90 py-3.5 pl-11 pr-11 text-base font-medium text-ink outline-none"
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
                    {suggestions.map(({ emoji, label }) => (
                      <button
                        key={label}
                        onClick={() => handleSuggestion(label.toLowerCase())}
                        className="flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold text-ink/70 shadow-sm transition hover:scale-105"
                        style={{ borderColor: T.border, background: T.light200 }}
                      >
                        <span>{emoji}</span> {label}
                      </button>
                    ))}
                  </div>

                  {searchQuery.trim() && (
                    <button
                      onClick={() => closeSearch(true)}
                      className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 font-bold text-white"
                      style={{ background: T.btnBg }}
                    >
                      <Sparkles className="h-4 w-4" />
                      {isEn ? `Search "${searchQuery}"` : `Cerca "${searchQuery}"`}
                    </button>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Review Modal */}
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
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-sm overflow-hidden rounded-3xl bg-white/95 shadow-2xl backdrop-blur"
                >
                  <div className="relative px-8 py-7 text-center" style={{ background: T.btnBg }}>
                    <button
                      onClick={() => setShowReviewModal(false)}
                      className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-white/20 text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-white/65">{reviewTitle}</p>
                    <h2 className="font-serif text-2xl font-extrabold text-white">{restaurant.name}</h2>
                  </div>

                  <div className="px-8 py-8">
                    {reviewSubmitted ? (
                      <div className="text-center">
                        <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full" style={{ background: T.chipBg }}>
                          <CheckCircle2 className="h-8 w-8" style={{ color: T.brand }} />
                        </div>
                        <h3 className="mb-2 text-xl font-bold text-ink">{reviewThanks}</h3>
                        <p className="text-sm text-ink/60">{reviewThanksBody}</p>
                      </div>
                    ) : (
                      <>
                        <div className="mb-6 text-center">
                          <p className="mb-3.5 text-xs font-bold uppercase tracking-wide text-ink/50">{reviewQ}</p>
                          <div className="flex justify-center gap-2.5">
                            {[1, 2, 3, 4, 5].map((n) => {
                              const filled = n <= (reviewHovered || reviewStars)
                              return (
                                <button
                                  key={n}
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
                                </button>
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
                            className="w-full resize-none rounded-2xl border-2 p-3.5 text-sm leading-relaxed text-ink outline-none"
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
          {/* Clear cart confirm modal */}
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
                    <div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-red-50">
                      <Trash2 className="h-7 w-7 text-red-500" />
                    </div>
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
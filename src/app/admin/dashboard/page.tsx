'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { hasUnsavedChanges, setUnsavedChanges } from '@/lib/unsaved-changes'
import {
  LayoutDashboard,
  ShoppingCart,
  Utensils,
  QrCode,
  BarChart3,
  Users,
  Palette,
  UtensilsCrossed,
  History,
  CalendarDays,
  Bell,
  BellOff,
  Store,
  X,
  LogOut,
  MoreHorizontal,
  Settings,
  ChefHat,
  AlertTriangle,
} from 'lucide-react'
import { NAV_ITEMS, WAITER_KITCHEN_GROUP_IDS, OPERATIONS_GROUP_IDS, MANAGEMENT_GROUP_IDS } from './nav-config'
import type { RestaurantCtx, SectionId, ThemeMode } from './types'
import { supabase } from '@/lib/supabase'
import { getRestaurantByUser, signOut } from '@/lib/admin-service'
import { isRestaurantActive } from '@/lib/check-access'
import { isNotificationSoundMuted, setNotificationSoundMuted } from '@/lib/notificationSound'
import { useI18n } from '@/components/i18n/I18nProvider'

function navLabel(tr: ReturnType<typeof useI18n>['tr'], id: SectionId): string {
  return (tr.admin.nav as Record<string, string>)[id] ?? id
}

import { DashboardSection } from './sections/DashboardSection'
import { OrdersSection } from './sections/OrdersSection'
import { MenuSection } from './sections/MenuSection'
import { TablesSection } from './sections/TablesSection'
import { AnalyticsSection } from './sections/AnalyticsSection'
import { BrandingSection } from './sections/BrandingSection'
import { StaffSection } from './sections/StaffSection'
import { SettingsSection } from './sections/SettingsSection'
import { WaiterSection } from './sections/WaiterSection'
import { HistorySection } from './sections/HistorySection'
import { PlaceholderSection } from './sections/PlaceholderSection'
import { AIAssistantOverlay } from './components/AIAssistantOverlay'

// ─── Section renderer ────────────────────────────────────────────────────────

function SectionRenderer({
  section,
  ctx,
  theme,
  onSectionChange,
}: {
  section: SectionId
  ctx: RestaurantCtx
  theme: ThemeMode
  onSectionChange: (s: SectionId) => void
}) {
  switch (section) {
    case 'dashboard':
      return <DashboardSection ctx={ctx} theme={theme} onSectionChange={onSectionChange} />
    case 'orders':
      return <OrdersSection ctx={ctx} theme={theme} />
    case 'menu':
      return <MenuSection ctx={ctx} theme={theme} />
    case 'tables':
      return <TablesSection ctx={ctx} theme={theme} />
    case 'analytics':
      return <AnalyticsSection ctx={ctx} theme={theme} onSectionChange={onSectionChange} />
    case 'branding':
      return <BrandingSection ctx={ctx} theme={theme} />
    case 'staff':
      return <StaffSection ctx={ctx} theme={theme} />
    case 'settings':
      return <SettingsSection ctx={ctx} theme={theme} />
    case 'waiter':
      return <WaiterSection ctx={ctx} theme={theme} />
    case 'history':
      return <HistorySection ctx={ctx} theme={theme} />
    case 'calendar':
      return <PlaceholderSection id="calendar" theme={theme} />
  }
}

// ─── Bottom nav item (mobile) ────────────────────────────────────────────────

function BottomNavItem({
  item,
  isActive,
  onClick,
  badge,
}: {
  item: { id: SectionId; label: string; icon: React.ComponentType<{ isActive?: boolean }> }
  isActive: boolean
  onClick: () => void
  badge?: number
}) {
  const Icon = item.icon
  const { tr } = useI18n()
  return (
    <button
      onClick={onClick}
      className="relative flex flex-1 min-w-0 flex-col items-center justify-center gap-0.5 px-2 py-2"
    >
      {isActive && (
        <motion.span
          layoutId="bottomNavPill"
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          className="absolute inset-x-1 inset-y-0.5 rounded-2xl bg-tt-pink/10"
        />
      )}
      <motion.div
        className="relative flex items-center justify-center"
        animate={{ scale: isActive ? 1.08 : 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 24 }}
      >
        <Icon isActive={isActive} />
        {badge !== undefined && badge > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-tt-pink px-1 text-[10px] font-bold text-white">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </motion.div>
      <span className={`relative max-w-full truncate text-[10px] transition-colors duration-200 ${
        isActive ? 'text-tt-ink font-bold' : 'text-tt-muted font-medium'
      }`}>{navLabel(tr, item.id)}</span>
    </button>
  )
}

// ─── More drawer (mobile) ────────────────────────────────────────────────────

function MoreDrawer({
  open,
  onClose,
  activeSection,
  onSelect,
}: {
  open: boolean
  onClose: () => void
  activeSection: SectionId
  onSelect: (s: SectionId) => void
}) {
  const { tr } = useI18n()
  const [dragY, setDragY] = useState(0)
  const [dragging, setDragging] = useState(false)
  const dragStartY = useRef<number | null>(null)

  const handleHandlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragStartY.current = e.clientY
    setDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const handleHandlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartY.current === null) return
    setDragY(Math.max(0, e.clientY - dragStartY.current))
  }
  const handleHandlePointerUp = () => {
    if (dragStartY.current === null) return
    if (dragY > 120) onClose()
    setDragY(0)
    setDragging(false)
    dragStartY.current = null
  }

  const waiterKitchenItems = NAV_ITEMS.filter((i) => WAITER_KITCHEN_GROUP_IDS.includes(i.id))
  const operationsItems = NAV_ITEMS.filter((i) => OPERATIONS_GROUP_IDS.includes(i.id))
  const managementItems = NAV_ITEMS.filter((i) => MANAGEMENT_GROUP_IDS.includes(i.id))
  const otherItems = NAV_ITEMS.filter(
    (i) =>
      i.id !== 'dashboard' &&
      !WAITER_KITCHEN_GROUP_IDS.includes(i.id) &&
      !OPERATIONS_GROUP_IDS.includes(i.id) &&
      !MANAGEMENT_GROUP_IDS.includes(i.id)
  )

  const handleSelect = (id: SectionId) => {
    onSelect(id)
    onClose()
  }

  const GroupBlock = ({ label, items }: { label: string; items: typeof NAV_ITEMS }) => {
    if (items.length === 0) return null
    return (
      <div className="mb-4">
        <p className="tt-section-title">{label}</p>
        <div className="overflow-hidden rounded-2xl border border-tt-line bg-white">
          {items.map((item, idx) => {
            const Icon = item.icon
            const isActive = activeSection === item.id
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`flex w-full items-center gap-3 px-4 py-3.5 transition-colors duration-150 ${
                  idx > 0 ? 'border-t border-tt-line' : ''
                } ${isActive ? 'bg-tt-pink/10' : 'hover:bg-tt-surfaceAlt2'}`}
              >
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                    isActive ? 'text-white' : 'bg-tt-surfaceAlt2 text-tt-ink'
                  }`}
                  style={isActive ? { background: 'var(--color-tt-gradient)' } : undefined}
                >
                  <Icon isActive={isActive} />
                </div>
                <span className={`flex-1 text-left text-sm font-semibold ${isActive ? 'text-tt-pink' : 'text-tt-ink'}`}>
                  {navLabel(tr, item.id)}
                </span>
                {isActive && <span className="h-2 w-2 animate-pulse rounded-full bg-tt-pink" />}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-tt-surfaceAlt shadow-2xl lg:hidden ${
          open ? 'translate-y-0' : 'translate-y-full'
        } ${dragging ? '' : 'transition-transform duration-300 ease-out'}`}
        style={{ maxHeight: '85vh', transform: open ? `translateY(${dragY}px)` : undefined }}
      >
        <div
          className="flex touch-none justify-center pb-1 pt-3"
          onPointerDown={handleHandlePointerDown}
          onPointerMove={handleHandlePointerMove}
          onPointerUp={handleHandlePointerUp}
          onPointerCancel={handleHandlePointerUp}
        >
          <div className="h-1.5 w-10 rounded-full bg-tt-line" />
        </div>
        <div className="flex items-center justify-between border-b border-tt-line px-5 py-3">
          <h2 className="text-lg font-bold text-tt-ink">{tr.admin.layout.allSections}</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-tt-surfaceAlt2 text-tt-muted hover:text-tt-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="tt-scroll overflow-y-auto px-4 py-4" style={{ maxHeight: 'calc(85vh - 80px)' }}>
          <div className="mb-4">
            <p className="tt-section-title">{tr.admin.layout.main}</p>
            <div className="overflow-hidden rounded-2xl border border-tt-line bg-white">
              {(() => {
                const item = NAV_ITEMS.find((i) => i.id === 'dashboard')!
                const Icon = item.icon
                const isActive = activeSection === 'dashboard'
                return (
                  <button
                    onClick={() => handleSelect('dashboard')}
                    className={`flex w-full items-center gap-3 px-4 py-3.5 transition-colors duration-150 ${
                      isActive ? 'bg-tt-pink/10' : 'hover:bg-tt-surfaceAlt2'
                    }`}
                  >
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-xl ${isActive ? 'text-white' : 'bg-tt-surfaceAlt2 text-tt-ink'}`}
                      style={isActive ? { background: 'var(--color-tt-gradient)' } : undefined}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className={`flex-1 text-left text-sm font-semibold ${isActive ? 'text-tt-pink' : 'text-tt-ink'}`}>
                      {navLabel(tr, item.id)}
                    </span>
                    {isActive && <span className="h-2 w-2 animate-pulse rounded-full bg-tt-pink" />}
                  </button>
                )
              })()}
            </div>
          </div>
          <GroupBlock label={tr.admin.layout.waiterKitchen} items={waiterKitchenItems} />
          <GroupBlock label={tr.admin.layout.operations} items={operationsItems} />
          <GroupBlock label={tr.admin.layout.management} items={managementItems} />
          <GroupBlock label={tr.admin.layout.other} items={otherItems} />
          <div className="mb-4">
            <p className="tt-section-title">{tr.admin.layout.system}</p>
            <div className="overflow-hidden rounded-2xl border border-tt-line bg-white">
              <button
                onClick={() => handleSelect('settings')}
                className={`flex w-full items-center gap-3 px-4 py-3.5 transition-colors duration-150 ${
                  activeSection === 'settings' ? 'bg-tt-pink/10' : 'hover:bg-tt-surfaceAlt2'
                }`}
              >
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl ${activeSection === 'settings' ? 'text-white' : 'bg-tt-surfaceAlt2 text-tt-ink'}`}
                  style={activeSection === 'settings' ? { background: 'var(--color-tt-gradient)' } : undefined}
                >
                  <Settings className="h-5 w-5" />
                </div>
                <span className={`flex-1 text-left text-sm font-semibold ${activeSection === 'settings' ? 'text-tt-pink' : 'text-tt-ink'}`}>
                  {tr.admin.nav.settings}
                </span>
                {activeSection === 'settings' && <span className="h-2 w-2 animate-pulse rounded-full bg-tt-pink" />}
              </button>
              <button
                onClick={() => handleSelect('calendar')}
                className={`flex w-full items-center gap-3 border-t border-tt-line px-4 py-3.5 transition-colors duration-150 ${
                  activeSection === 'calendar' ? 'bg-tt-pink/10' : 'hover:bg-tt-surfaceAlt2'
                }`}
              >
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl ${activeSection === 'calendar' ? 'text-white' : 'bg-tt-surfaceAlt2 text-tt-ink'}`}
                  style={activeSection === 'calendar' ? { background: 'var(--color-tt-gradient)' } : undefined}
                >
                  <CalendarDays className="h-5 w-5" />
                </div>
                <span className={`flex-1 text-left text-sm font-semibold ${activeSection === 'calendar' ? 'text-tt-pink' : 'text-tt-ink'}`}>
                  {tr.admin.layout.comingSoon}
                </span>
                {activeSection === 'calendar' && <span className="h-2 w-2 animate-pulse rounded-full bg-tt-pink" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Desktop sidebar item ────────────────────────────────────────────────────

function SidebarItem({
  item,
  isActive,
  onClick,
  badge,
}: {
  item: { id: SectionId; label: string; icon: React.ComponentType<{ className?: string }> }
  isActive: boolean
  onClick: () => void
  badge?: number
}) {
  const Icon = item.icon
  const { tr } = useI18n()
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-150 ${
        isActive
          ? 'bg-gradient-to-r from-brand-amber to-brand-terra text-white shadow-glow-amber'
          : 'text-tt-muted hover:bg-tt-surfaceAlt2 hover:text-tt-ink'
      }`}
    >
      <div className="relative">
        <Icon className="h-5 w-5" />
        {badge !== undefined && badge > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[14px] items-center justify-center rounded-full bg-tt-pinkSoft px-1 text-[9px] font-bold text-white">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </div>
      <span className="flex-1 text-left">{navLabel(tr, item.id)}</span>
    </button>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const router = useRouter()
  const { tr, lang } = useI18n()

  useEffect(() => {
    if (sessionStorage.getItem('tt-already-has-restaurant')) {
      sessionStorage.removeItem('tt-already-has-restaurant')
      setNotifToast('restaurant')
    }
  }, [])

  const [activeSection, setActiveSection] = useState<SectionId>(() => {
    if (typeof window === 'undefined') return 'dashboard'
    return (sessionStorage.getItem('tt-admin-active-section') as SectionId | null) ?? 'dashboard'
  })

  useEffect(() => {
    sessionStorage.setItem('tt-admin-active-section', activeSection)
  }, [activeSection])

  const [pendingSection, setPendingSection] = useState<SectionId | null>(null)

  const changeSection = (id: SectionId) => {
    if (hasUnsavedChanges()) {
      setPendingSection(id)
      return
    }
    setActiveSection(id)
  }

  const confirmLeaveWithoutSaving = () => {
    setUnsavedChanges(false)
    if (pendingSection) setActiveSection(pendingSection)
    setPendingSection(null)
  }
  const [moreDrawerOpen, setMoreDrawerOpen] = useState(false)
  const [soundMuted, setSoundMuted] = useState(false)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [logoutClosing, setLogoutClosing] = useState(false)
  const closeLogoutConfirm = () => {
    setLogoutClosing(true)
    setTimeout(() => { setConfirmLogout(false); setLogoutClosing(false) }, 200)
  }
  const [isLoading, setIsLoading] = useState(true)
  const [ctx, setCtx] = useState<RestaurantCtx | null>(null)
  const [activeOrdersCount, setActiveOrdersCount] = useState(0)
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0)
  const [pendingWaiterCount, setPendingWaiterCount] = useState(0)
  const [brandColor, setBrandColor] = useState('#10b981')
  const theme: ThemeMode = 'light'

  // Notification sound mute (persistent, like the original)
  useEffect(() => {
    setSoundMuted(isNotificationSoundMuted())
  }, [])

  const [notifToast, setNotifToast] = useState<'on' | 'off' | 'restaurant' | null>(null)

  const toggleSoundMuted = () => {
    setSoundMuted((prev) => {
      const next = !prev
      setNotificationSoundMuted(next)
      setNotifToast(next ? 'off' : 'on')
      return next
    })
  }

  useEffect(() => {
    if (!notifToast) return
    const timer = setTimeout(() => setNotifToast(null), notifToast === 'restaurant' ? 4000 : 2000)
    return () => clearTimeout(timer)
  }, [notifToast])

  const handleLogout = async () => {
    try {
      await signOut()
    } catch {
      /* noop */
    }
    router.push('/login')
  }

  // Load context + active orders count from DATABASE (Supabase) — same logic
  // as the original m2m page.tsx: auth.getUser() → profiles → restaurants +
  // orders count in pending/confirmed/preparing/cooking/ready.
  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        const restaurant = await getRestaurantByUser()

        // Gate abbonamento: se l'account è sospeso dalla piattaforma o
        // l'abbonamento è scaduto, non caricare la dashboard e reindirizza
        // alla pagina dedicata. (Prima non veniva mai verificato: isRestaurantActive
        // era codice morto e nulla puntava a /abbonamento-scaduto.)
        if (!isRestaurantActive({
          id: restaurant.id,
          status: restaurant.status,
          access_expires_at: restaurant.access_expires_at,
        })) {
          if (active) router.replace('/abbonamento-scaduto')
          return
        }

        // active orders count — stessa logica di OrdersSection: escludi
        // 'pending' (carrello cliente ancora aperto), oltre a stati finali.
        const { count } = await supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('restaurant_id', restaurant.id)
          .not('status', 'in', '("pending","served","delivered","cancelled","expired")')

        if (!active) return

        if (restaurant.brand_color) setBrandColor(restaurant.brand_color)
        setCtx({
          restaurantId: restaurant.id,
          restaurantName: restaurant.name,
          logoUrl: restaurant.logo_url,
          plan: restaurant.plan,
          accessExpiresAt: restaurant.access_expires_at,
          maxStaff: restaurant.max_staff,
          userId: user.id,
          userFirstName: restaurant.userName.split(' ')[0] ?? '',
          userLastName: restaurant.userName.split(' ').slice(1).join(' ') ?? '',
          userAvatarUrl: restaurant.avatarUrl,
          userEmail: user.email ?? '',
          role: restaurant.userRole,
          rolePermissions: null,
          notificationPrefs: { admin: true, cameriere: true },
        })
        setActiveOrdersCount(count ?? 0)
        // Badge pagamenti pendenti
        supabase.from('waiter_calls').select('id', { count: 'exact', head: true })
          .eq('restaurant_id', restaurant.id).eq('type', 'payment').eq('status', 'pending')
          .then(({ count: c }) => setPendingPaymentsCount(c ?? 0))
      } catch {
        // Nessun profilo/ristorante associato all'utente — non è un errore
        // applicativo, riportiamo alla scelta post-login con un avviso.
        if (active) router.push('/login?error=no-restaurant')
      } finally {
        if (active) setIsLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [router])

  // Realtime refresh dei badge (ordini + richieste pagamento)
  useEffect(() => {
    if (!ctx) return
    const restaurantId = ctx.restaurantId
    const refreshOrders = async () => {
      const { count } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .not('status', 'in', '("pending","served","delivered","cancelled","expired")')
      setActiveOrdersCount(count ?? 0)
    }
    const refreshPayments = async () => {
      const { count } = await supabase
        .from('waiter_calls')
        .select('id', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .eq('type', 'payment')
        .eq('status', 'pending')
      setPendingPaymentsCount(count ?? 0)
    }
    // Waiter badge = ordini pronti da consegnare + tutte le richieste al tavolo pendenti
    const refreshWaiter = async () => {
      const [{ count: ready }, { count: calls }] = await Promise.all([
        supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('restaurant_id', restaurantId)
          .eq('status', 'ready'),
        supabase
          .from('waiter_calls')
          .select('id', { count: 'exact', head: true })
          .eq('restaurant_id', restaurantId)
          .eq('status', 'pending'),
      ])
      setPendingWaiterCount((ready ?? 0) + (calls ?? 0))
    }
    refreshWaiter()
    const channel = supabase
      .channel(`dashboard-badges-${restaurantId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` }, () => { refreshOrders(); refreshWaiter() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'waiter_calls', filter: `restaurant_id=eq.${restaurantId}` }, () => { refreshPayments(); refreshWaiter() })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [ctx])

  const userInitials = useMemo(() => {
    if (!ctx) return 'TR'
    const fn = ctx.userFirstName.trim()
    const ln = ctx.userLastName.trim()
    if (fn && ln) return (fn[0] + ln[0]).toUpperCase()
    return 'TR'
  }, [ctx])

  const activeLabel = navLabel(tr, activeSection)

  const now = new Date()

  // ── Loading skeleton (like the original page) ──────────────────────────────
  if (isLoading || !ctx) {
    return (
      <div className="flex min-h-screen flex-col bg-tt-surfaceAlt">
        <div className="border-b border-tt-line bg-white px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-5 w-28 tt-skeleton rounded-full" />
              <div className="h-3 w-36 tt-skeleton rounded-full" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 tt-skeleton rounded-full" />
              <div className="h-9 w-9 tt-skeleton rounded-full" />
              <div className="h-9 w-9 tt-skeleton rounded-full" />
            </div>
          </div>
        </div>
        <div className="mx-auto w-full max-w-2xl px-4 py-5">
          <div className="tt-card-pink mb-4 flex items-center gap-4 rounded-3xl p-5">
            <div className="h-14 w-14 tt-skeleton rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-40 tt-skeleton rounded-full" />
              <div className="h-3 w-56 tt-skeleton rounded-full" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="tt-card rounded-3xl border border-tt-line p-4 shadow-tt">
                <div className="mb-3 flex justify-between">
                  <div className="h-9 w-9 tt-skeleton rounded-xl" />
                  <div className="h-5 w-12 tt-skeleton rounded-full" />
                </div>
                <div className="h-6 w-16 tt-skeleton rounded-full" />
                <div className="mt-1 h-3 w-20 tt-skeleton rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Bottom nav slots (mobile): Dashboard + 3 priority + Altro
  const bottomNavSlots: { item: (typeof NAV_ITEMS)[number] | null; isMore?: boolean }[] = []
  bottomNavSlots.push({ item: NAV_ITEMS.find((i) => i.id === 'dashboard') ?? null })
  for (const id of ['orders', 'waiter', 'tables'] as SectionId[]) {
    const it = NAV_ITEMS.find((i) => i.id === id)
    if (it) bottomNavSlots.push({ item: it })
  }
  bottomNavSlots.push({ item: null, isMore: true })

  const isSectionInBottomNav = (id: SectionId) => bottomNavSlots.some((s) => s.item?.id === id)

  // Desktop sidebar groups
  const waiterKitchenItems = NAV_ITEMS.filter((i) => WAITER_KITCHEN_GROUP_IDS.includes(i.id))
  const operationsItems = NAV_ITEMS.filter((i) => OPERATIONS_GROUP_IDS.includes(i.id))
  const managementItems = NAV_ITEMS.filter((i) => MANAGEMENT_GROUP_IDS.includes(i.id))

  return (
    <div className="flex min-h-screen bg-tt-surfaceAlt">
      <AnimatePresence>
        {notifToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            transition={{ duration: 0.3 }}
            className="fixed left-1/2 top-4 z-[100] flex items-center gap-2 rounded-full bg-tt-ink px-4 py-2.5 text-sm font-medium text-white shadow-lg"
          >
            {notifToast === 'restaurant' ? (
              <Store className="h-4 w-4" />
            ) : notifToast === 'off' ? (
              <BellOff className="h-4 w-4" />
            ) : (
              <Bell className="h-4 w-4" />
            )}
            {notifToast === 'restaurant'
              ? tr.auth.create.alreadyRegisteredTitle
              : notifToast === 'off'
                ? tr.admin.home.recentOrders.notificationsOff
                : tr.admin.home.recentOrders.notificationsOn}
          </motion.div>
        )}
      </AnimatePresence>
      {/* ════════════════════════════════════════════════════════════════════
          DESKTOP SIDEBAR (lg+) — fixed left, full nav grouped
          ════════════════════════════════════════════════════════════════════ */}
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-64 flex-col border-r border-tt-line bg-white/95 backdrop-blur-xl lg:flex">
        {/* Logo / restaurant */}
        <div className="flex items-center gap-2.5 border-b border-tt-line px-5 py-4">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-amber to-brand-terra text-white shadow-glow-amber">
            <ChefHat className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-tt-ink">
              m<span className="text-gradient-warm">2</span>m
            </p>
            <p className="truncate text-[11px] text-tt-muted">{ctx.restaurantName}</p>
          </div>
        </div>

        {/* Nav scroll */}
        <nav className="tt-scroll flex-1 overflow-y-auto px-3 py-4">
          <div className="mb-4">
            <p className="tt-section-title px-2">{tr.admin.layout.main}</p>
            <div className="space-y-1">
              <SidebarItem
                item={NAV_ITEMS.find((i) => i.id === 'dashboard')!}
                isActive={activeSection === 'dashboard'}
                onClick={() => changeSection('dashboard')}
              />
            </div>
          </div>
          <div className="mb-4">
            <p className="tt-section-title px-2">{tr.admin.layout.waiterKitchen}</p>
            <div className="space-y-1">
              {waiterKitchenItems.map((it) => (
                <SidebarItem
                  key={it.id}
                  item={it}
                  isActive={activeSection === it.id}
                  onClick={() => changeSection(it.id)}
                  badge={it.id === 'orders' ? activeOrdersCount : it.id === 'waiter' ? pendingWaiterCount : undefined}
                />
              ))}
            </div>
          </div>
          <div className="mb-4">
            <p className="tt-section-title px-2">{tr.admin.layout.operations}</p>
            <div className="space-y-1">
              {operationsItems.map((it) => (
                <SidebarItem
                  key={it.id}
                  item={it}
                  isActive={activeSection === it.id}
                  onClick={() => changeSection(it.id)}
                />
              ))}
            </div>
          </div>
          <div className="mb-4">
            <p className="tt-section-title px-2">{tr.admin.layout.management}</p>
            <div className="space-y-1">
              {managementItems.map((it) => (
                <SidebarItem
                  key={it.id}
                  item={it}
                  isActive={activeSection === it.id}
                  onClick={() => changeSection(it.id)}
                />
              ))}
            </div>
          </div>
          <div>
            <p className="tt-section-title px-2">{tr.admin.layout.system}</p>
            <div className="space-y-1">
              <SidebarItem
                item={{ id: 'settings', label: 'Impostazioni', icon: Settings }}
                isActive={activeSection === 'settings'}
                onClick={() => changeSection('settings')}
              />
              <SidebarItem
                item={{ id: 'calendar', label: tr.admin.layout.comingSoon, icon: CalendarDays }}
                isActive={activeSection === 'calendar'}
                onClick={() => changeSection('calendar')}
              />
            </div>
          </div>
        </nav>

        {/* User card */}
        <div className="border-t border-tt-line p-3">
          <div className="flex items-center gap-2.5 rounded-xl bg-tt-surfaceAlt px-3 py-2.5">
            <span className="tt-avatar h-9 w-9 text-sm shadow-tt">{userInitials}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-tt-ink">{ctx.userFirstName} {ctx.userLastName}</p>
              <p className="truncate text-[11px] text-tt-muted">{ctx.userEmail}</p>
            </div>
            <button className="grid h-8 w-8 place-items-center rounded-lg text-tt-muted transition hover:bg-tt-danger/10 hover:text-tt-danger" title={tr.admin.layout.logout}>
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ════════════════════════════════════════════════════════════════════
          MAIN COLUMN (offset by sidebar on desktop)
          ════════════════════════════════════════════════════════════════════ */}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col lg:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-30 grid grid-cols-[auto_1fr_auto] items-center gap-2 border-b border-tt-line bg-white/95 px-4 py-3 backdrop-blur-xl lg:px-6">
          <button
            onClick={() => setConfirmLogout(true)}
            title={tr.admin.layout.logout}
            className="flex h-9 w-9 items-center justify-center rounded-full text-tt-muted transition hover:bg-tt-danger/10 hover:text-tt-danger"
          >
            <LogOut className="h-5 w-5" />
          </button>

          <div className="min-w-0 text-center">
            <h1 className="truncate text-lg font-extrabold leading-tight text-tt-ink lg:text-xl">
              {activeLabel}
            </h1>
            <p className="truncate text-xs capitalize text-tt-muted">
              {now.toLocaleDateString(lang === 'en' ? 'en-US' : 'it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              onClick={toggleSoundMuted}
              title={soundMuted ? 'Attiva suono' : 'Disattiva suono'}
              className="relative flex h-9 w-9 items-center justify-center rounded-full text-tt-muted transition hover:bg-tt-surfaceAlt2 hover:text-tt-ink"
            >
              {soundMuted ? <BellOff className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
            </button>
            <button
              onClick={() => changeSection('settings')}
              className="h-9 w-9 overflow-hidden rounded-full border-2 border-tt-pink shadow-tt transition hover:scale-105"
            >
              {ctx.userAvatarUrl ? (
                <img src={ctx.userAvatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="tt-avatar flex h-full w-full items-center justify-center text-sm">{userInitials}</span>
              )}
            </button>
          </div>
        </header>

        {confirmLogout && (
          <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm ${logoutClosing ? 'animate-ttFadeOut' : 'animate-ttFadeUp'}`} onClick={closeLogoutConfirm}>
            <div className={`w-full max-w-sm rounded-2xl border border-tt-line bg-white p-5 shadow-tt ${logoutClosing ? 'animate-ttFadeOut' : ''}`} onClick={(e) => e.stopPropagation()}>
              <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-tt-danger/10 text-tt-danger">
                <LogOut className="h-5 w-5" />
              </div>
              <h3 className="mb-1 font-serif text-lg font-extrabold text-tt-ink">
                {lang === 'en' ? 'Log out?' : 'Uscire dal profilo?'}
              </h3>
              <p className="mb-4 text-sm text-tt-muted">
                {lang === 'en' ? 'Are you sure you want to log out of your account?' : 'Sei sicuro di voler uscire dal tuo profilo?'}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={closeLogoutConfirm}
                  className="h-11 flex-1 rounded-full border border-tt-line bg-white text-sm font-bold text-tt-muted transition hover:text-tt-ink"
                >
                  {lang === 'en' ? 'Cancel' : 'Annulla'}
                </button>
                <button
                  onClick={() => { setConfirmLogout(false); handleLogout() }}
                  className="flex h-11 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-tt-danger px-3 text-sm font-bold text-white shadow-tt transition hover:scale-105"
                >
                  <LogOut className="h-4 w-4" />
                  <span>{tr.admin.layout.logout}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        <AnimatePresence>
          {pendingSection && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
              onClick={() => setPendingSection(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.94, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 12 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="w-full max-w-sm rounded-2xl border border-tt-line bg-white p-5 shadow-tt"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-tt-danger/10 text-tt-danger">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <h3 className="mb-1 font-serif text-lg font-extrabold text-tt-ink">
                  {lang === 'en' ? 'Unsaved changes' : 'Modifiche non salvate'}
                </h3>
                <p className="mb-4 text-sm text-tt-muted">
                  {lang === 'en'
                    ? 'You have unsaved changes. Are you sure you want to leave without saving?'
                    : 'Hai delle modifiche non salvate. Sei sicuro di voler uscire senza salvare?'}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPendingSection(null)}
                    className="h-11 flex-1 rounded-full border border-tt-line bg-white text-sm font-bold text-tt-muted transition hover:text-tt-ink"
                  >
                    {lang === 'en' ? 'Stay' : 'Rimani'}
                  </button>
                  <button
                    onClick={confirmLeaveWithoutSaving}
                    className="flex h-11 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-tt-danger px-3 text-sm font-bold text-white shadow-tt transition hover:scale-105"
                  >
                    {lang === 'en' ? 'Leave' : 'Esci senza salvare'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto tt-scroll" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
          <div className="mx-auto max-w-5xl px-4 py-5 lg:px-6 lg:py-7">
            <div key={activeSection} className="animate-ttFadeUp">
              <SectionRenderer
                section={activeSection}
                ctx={ctx}
                theme={theme}
                onSectionChange={changeSection}
              />
            </div>
          </div>
        </main>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          BOTTOM NAV (mobile only)
          ════════════════════════════════════════════════════════════════════ */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex items-stretch border-t border-tt-line bg-white px-1 pb-1 pt-1 backdrop-blur-xl lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)', borderTop: `2px solid ${brandColor}` }}
      >
        {bottomNavSlots.map((slot) => {
          if (slot.isMore) {
            return (
              <BottomNavItem
                key="more"
                item={{ id: 'settings', label: 'Altro', icon: ({ isActive }: { isActive?: boolean }) => <MoreHorizontal size={22} strokeWidth={1.8} color={isActive ? '#1a1a1a' : '#9ca3af'} /> }}
                isActive={moreDrawerOpen || (!isSectionInBottomNav(activeSection) && activeSection !== 'settings')}
                onClick={() => setMoreDrawerOpen(true)}
              />
            )
          }
          if (!slot.item) return null
          const showBadge = slot.item.id === 'orders' ? activeOrdersCount : slot.item.id === 'waiter' ? pendingWaiterCount : undefined
          return (
            <BottomNavItem
              key={slot.item.id}
              item={slot.item}
              isActive={activeSection === slot.item.id}
              onClick={() => changeSection(slot.item!.id)}
              badge={showBadge}
            />
          )
        })}
      </nav>

      {/* More drawer (mobile) */}
      <MoreDrawer
        open={moreDrawerOpen}
        onClose={() => setMoreDrawerOpen(false)}
        activeSection={activeSection}
        onSelect={(id) => changeSection(id)}
      />

      {/* AI Assistant overlay (all viewports) */}
      <AIAssistantOverlay ctx={ctx} theme={theme} />
    </div>
  )
}

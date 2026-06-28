'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
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
  X,
  LogOut,
  MoreHorizontal,
  Settings,
  ChefHat,
} from 'lucide-react'
import { NAV_ITEMS, OPERATIONS_GROUP_IDS, MANAGEMENT_GROUP_IDS } from './nav-config'
import type { RestaurantCtx, SectionId, ThemeMode } from './types'
import { supabase } from '@/lib/supabase'
import { getRestaurantByUser, signOut } from '@/lib/admin-service'
import { isNotificationSoundMuted, setNotificationSoundMuted } from '@/lib/notificationSound'

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
import { CalendarSection } from './sections/CalendarSection'
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
      return <CalendarSection ctx={ctx} theme={theme} />
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
  return (
    <button
      onClick={onClick}
      className="flex flex-1 min-w-0 flex-col items-center justify-center gap-0.5 px-2 py-2 transition-all duration-200"
    >
      <div className="relative flex items-center justify-center">
        <Icon isActive={isActive} />
        {badge !== undefined && badge > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-tt-pink px-1 text-[10px] font-bold text-white">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>
      <span className={`max-w-full truncate text-[10px] transition-colors duration-200 ${
        isActive ? 'text-tt-ink font-bold' : 'text-tt-muted font-medium'
      }`}>{item.label}</span>
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
  const operationsItems = NAV_ITEMS.filter((i) => OPERATIONS_GROUP_IDS.includes(i.id))
  const managementItems = NAV_ITEMS.filter((i) => MANAGEMENT_GROUP_IDS.includes(i.id))
  const otherItems = NAV_ITEMS.filter(
    (i) => i.id !== 'dashboard' && !OPERATIONS_GROUP_IDS.includes(i.id) && !MANAGEMENT_GROUP_IDS.includes(i.id)
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
                  {item.label}
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
        className={`fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-tt-surfaceAlt shadow-2xl transition-transform duration-300 ease-out lg:hidden ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ maxHeight: '85vh' }}
      >
        <div className="flex justify-center pb-1 pt-3">
          <div className="h-1.5 w-10 rounded-full bg-tt-line" />
        </div>
        <div className="flex items-center justify-between border-b border-tt-line px-5 py-3">
          <h2 className="text-lg font-bold text-tt-ink">Tutte le sezioni</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-tt-surfaceAlt2 text-tt-muted hover:text-tt-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="tt-scroll overflow-y-auto px-4 py-4" style={{ maxHeight: 'calc(85vh - 80px)' }}>
          <div className="mb-4">
            <p className="tt-section-title">Principale</p>
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
                      {item.label}
                    </span>
                    {isActive && <span className="h-2 w-2 animate-pulse rounded-full bg-tt-pink" />}
                  </button>
                )
              })()}
            </div>
          </div>
          <GroupBlock label="Operazioni" items={operationsItems} />
          <GroupBlock label="Gestione" items={managementItems} />
          <GroupBlock label="Altro" items={otherItems} />
          <div className="mb-4">
            <p className="tt-section-title">Sistema</p>
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
                  Impostazioni
                </span>
                {activeSection === 'settings' && <span className="h-2 w-2 animate-pulse rounded-full bg-tt-pink" />}
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
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>
      <span className="flex-1 text-left">{item.label}</span>
    </button>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const router = useRouter()
  const [activeSection, setActiveSection] = useState<SectionId>(() => {
    if (typeof window === 'undefined') return 'dashboard'
    return (sessionStorage.getItem('tt-admin-active-section') as SectionId | null) ?? 'dashboard'
  })

  useEffect(() => {
    sessionStorage.setItem('tt-admin-active-section', activeSection)
  }, [activeSection])
  const [moreDrawerOpen, setMoreDrawerOpen] = useState(false)
  const [soundMuted, setSoundMuted] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [ctx, setCtx] = useState<RestaurantCtx | null>(null)
  const [activeOrdersCount, setActiveOrdersCount] = useState(0)
  const theme: ThemeMode = 'light'

  // Notification sound mute (persistent, like the original)
  useEffect(() => {
    setSoundMuted(isNotificationSoundMuted())
  }, [])

  const toggleSoundMuted = () => {
    setSoundMuted((prev) => {
      const next = !prev
      setNotificationSoundMuted(next)
      return next
    })
  }

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

        // active orders count
        const { count } = await supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('restaurant_id', restaurant.id)
          .in('status', ['pending', 'preparing', 'ready'])

        if (!active) return

        setCtx({
          restaurantId: restaurant.id,
          restaurantName: restaurant.name,
          logoUrl: restaurant.logo_url,
          plan: null,
          accessExpiresAt: null,
          maxStaff: null,
          userId: user.id,
          userFirstName: restaurant.userName.split(' ')[0] ?? '',
          userLastName: restaurant.userName.split(' ').slice(1).join(' ') ?? '',
          userEmail: user.email ?? '',
          role: restaurant.userRole,
          rolePermissions: null,
          notificationPrefs: { admin: true, cameriere: true },
        })
        setActiveOrdersCount(count ?? 0)
      } catch (err) {
        console.error('Errore caricamento dashboard:', err)
        if (active) router.push('/login')
      } finally {
        if (active) setIsLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [router])

  const userInitials = useMemo(() => {
    if (!ctx) return 'TR'
    const fn = ctx.userFirstName.trim()
    const ln = ctx.userLastName.trim()
    if (fn && ln) return (fn[0] + ln[0]).toUpperCase()
    return 'TR'
  }, [ctx])

  const activeLabel =
    activeSection === 'settings'
      ? 'Impostazioni'
      : NAV_ITEMS.find((n) => n.id === activeSection)?.label ?? 'Home'

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
  const operationsItems = NAV_ITEMS.filter((i) => OPERATIONS_GROUP_IDS.includes(i.id))
  const managementItems = NAV_ITEMS.filter((i) => MANAGEMENT_GROUP_IDS.includes(i.id))

  return (
    <div className="flex min-h-screen bg-tt-surfaceAlt">
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
            <p className="tt-section-title px-2">Principale</p>
            <div className="space-y-1">
              <SidebarItem
                item={NAV_ITEMS.find((i) => i.id === 'dashboard')!}
                isActive={activeSection === 'dashboard'}
                onClick={() => setActiveSection('dashboard')}
              />
            </div>
          </div>
          <div className="mb-4">
            <p className="tt-section-title px-2">Operazioni</p>
            <div className="space-y-1">
              {operationsItems.map((it) => (
                <SidebarItem
                  key={it.id}
                  item={it}
                  isActive={activeSection === it.id}
                  onClick={() => setActiveSection(it.id)}
                  badge={it.id === 'orders' ? activeOrdersCount : undefined}
                />
              ))}
            </div>
          </div>
          <div className="mb-4">
            <p className="tt-section-title px-2">Gestione</p>
            <div className="space-y-1">
              {managementItems.map((it) => (
                <SidebarItem
                  key={it.id}
                  item={it}
                  isActive={activeSection === it.id}
                  onClick={() => setActiveSection(it.id)}
                />
              ))}
            </div>
          </div>
          <div>
            <p className="tt-section-title px-2">Sistema</p>
            <div className="space-y-1">
              <SidebarItem
                item={{ id: 'settings', label: 'Impostazioni', icon: Settings }}
                isActive={activeSection === 'settings'}
                onClick={() => setActiveSection('settings')}
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
            <button className="grid h-8 w-8 place-items-center rounded-lg text-tt-muted transition hover:bg-tt-danger/10 hover:text-tt-danger" title="Esci">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ════════════════════════════════════════════════════════════════════
          MAIN COLUMN (offset by sidebar on desktop)
          ════════════════════════════════════════════════════════════════════ */}
      <div className="flex min-h-screen flex-1 flex-col lg:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-tt-line bg-white/95 px-4 py-3 backdrop-blur-xl lg:px-6">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-extrabold leading-tight text-tt-ink lg:text-xl">
              {activeLabel}
            </h1>
            <p className="truncate text-xs capitalize text-tt-muted">
              {now.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
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
              onClick={handleLogout}
              title="Esci"
              className="flex h-9 w-9 items-center justify-center rounded-full text-tt-muted transition hover:bg-tt-danger/10 hover:text-tt-danger"
            >
              <LogOut className="h-5 w-5" />
            </button>
            <button
              onClick={() => setActiveSection('settings')}
              className="tt-avatar h-9 w-9 text-sm shadow-tt transition hover:scale-105"
            >
              {userInitials}
            </button>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto tt-scroll" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
          <div className="mx-auto max-w-5xl px-4 py-5 lg:px-6 lg:py-7">
            <div key={activeSection} className="animate-ttFadeUp">
              <SectionRenderer
                section={activeSection}
                ctx={ctx}
                theme={theme}
                onSectionChange={setActiveSection}
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
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
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
          const showBadge = slot.item.id === 'orders' ? activeOrdersCount : undefined
          return (
            <BottomNavItem
              key={slot.item.id}
              item={slot.item}
              isActive={activeSection === slot.item.id}
              onClick={() => setActiveSection(slot.item!.id)}
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
        onSelect={(id) => setActiveSection(id)}
      />

      {/* AI Assistant overlay (all viewports) */}
      <AIAssistantOverlay ctx={ctx} theme={theme} />
    </div>
  )
}

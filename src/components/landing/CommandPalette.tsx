'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Home,
  LogIn,
  UtensilsCrossed,
  ShieldCheck,
  Leaf,
  LayoutDashboard,
  Sparkles,
  ListChecks,
  Workflow,
  Tag,
  HelpCircle,
  Plug,
  Mail,
  ArrowUp,
  MessageCircle,
  Languages,
  Search,
  CornerDownLeft,
  type LucideIcon,
} from 'lucide-react'
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
} from '@/components/ui/command'
import { useI18n } from '@/components/i18n/I18nProvider'

/**
 * CommandPalette — Cmd+K / Ctrl+K command palette.
 *
 * - Listens globally for Cmd+K (Mac) / Ctrl+K (Win/Linux) to toggle.
 * - Also opens on "/" when not typing in an input/textarea/contenteditable.
 * - Uses the shadcn `Command` component (cmdk under the hood) for keyboard
 *   navigation (arrow up/down, enter to execute, filter-as-you-type).
 * - Wrapped in a custom framer-motion overlay (z-[70], above everything)
 *   so we can use a spring scale+fade entrance and stay above the chat widget
 *   (z-[60]) and cookie banner (z-[55]).
 * - Three groups: Navigazione, Sezioni landing, Azioni.
 * - Recent commands (last 3) shown at top, persisted in localStorage.
 * - Accessible: role="dialog" aria-modal, focus locked to input on open,
 *   Escape + backdrop click to close, body scroll locked while open.
 */
const RECENT_KEY = 'm2m-recent-cmds'
const MAX_RECENT = 3

type CmdId =
  | 'nav-home'
  | 'nav-login'
  | 'nav-demo'
  | 'nav-security'
  | 'nav-green'
  | 'nav-dashboard'
  | 'sec-hero'
  | 'sec-funzioni'
  | 'sec-come-funziona'
  | 'sec-prezzi'
  | 'sec-faq'
  | 'sec-integrazioni'
  | 'sec-newsletter'
  | 'act-top'
  | 'act-chat'
  | 'act-lang'

type Cmd = {
  id: CmdId
  label: string
  group: string
  icon: LucideIcon
  shortcut?: string
  keywords?: string
  run: () => void
}

export function CommandPalette() {
  const router = useRouter()
  const pathname = usePathname()
  const { lang, setLang } = useI18n()
  const [open, setOpen] = useState(false)
  const [recent, setRecent] = useState<CmdId[]>([])

  // Load recent commands from localStorage on mount.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(RECENT_KEY)
      if (raw) {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr)) {
          setRecent(arr.slice(0, MAX_RECENT) as CmdId[])
        }
      }
    } catch {
      /* noop */
    }
  }, [])

  // Global hotkeys: Cmd+K / Ctrl+K toggles; "/" opens when not in input.
  useEffect(() => {
    function isEditableTarget(t: EventTarget | null): boolean {
      if (!(t instanceof HTMLElement)) return false
      const tag = t.tagName.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return true
      if (t.isContentEditable) return true
      return false
    }
    function onKey(e: KeyboardEvent) {
      // Cmd+K / Ctrl+K toggles the palette.
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
        return
      }
      // "/" opens (when not typing in an input & no modifier keys held).
      if (
        e.key === '/' &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !e.shiftKey &&
        !isEditableTarget(e.target)
      ) {
        e.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Close on Escape + lock body scroll while open.
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open])

  const pushRecent = useCallback((id: CmdId) => {
    setRecent((prev) => {
      const next = [id, ...prev.filter((x) => x !== id)].slice(0, MAX_RECENT)
      try {
        window.localStorage.setItem(RECENT_KEY, JSON.stringify(next))
      } catch {
        /* noop */
      }
      return next
    })
  }, [])

  const run = useCallback(
    (cmd: Cmd) => {
      pushRecent(cmd.id)
      setOpen(false)
      // Defer execution to next tick so the palette's body-overflow lock
      // (set while open) is released before scroll/navigation runs.
      // Otherwise scrollIntoView / scrollTo would be a no-op against a
      // body still marked overflow:hidden during the exit animation.
      window.setTimeout(() => cmd.run(), 220)
    },
    [pushRecent]
  )

  // Build the command list. Memoized against router/lang/pathname.
  const allCommands: Cmd[] = useMemo(() => {
    const nav = (href: string) => () => router.push(href)
    const section = (id: string) => () => {
      // On home: smooth-scroll. Elsewhere: navigate home, then scroll.
      if (pathname === '/') {
        const el = document.getElementById(id)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' })
          return
        }
      }
      router.push(`/#${id}`)
    }
    const scrollToHero = () =>
      window.scrollTo({ top: 0, behavior: 'smooth' })
    const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })
    const openChat = () =>
      window.dispatchEvent(new CustomEvent('open-chat'))
    const toggleLang = () => setLang(lang === 'it' ? 'en' : 'it')

    return [
      {
        id: 'nav-home',
        label: 'Home',
        group: 'Navigazione',
        icon: Home,
        shortcut: '/',
        keywords: 'home pagina inizio',
        run: nav('/'),
      },
      {
        id: 'nav-login',
        label: 'Login',
        group: 'Navigazione',
        icon: LogIn,
        shortcut: '/login',
        keywords: 'login accedi auth admin',
        run: nav('/login'),
      },
      {
        id: 'nav-demo',
        label: 'Demo ordini',
        group: 'Navigazione',
        icon: UtensilsCrossed,
        shortcut: '/order',
        keywords: 'demo ordini menu qr ristorante',
        run: nav('/scan/TERR-HRVU'),
      },
      {
        id: 'nav-security',
        label: 'Sicurezza',
        group: 'Navigazione',
        icon: ShieldCheck,
        shortcut: '/security',
        keywords: 'sicurezza security gdpr privacy',
        run: nav('/security'),
      },
      {
        id: 'nav-green',
        label: 'Green',
        group: 'Navigazione',
        icon: Leaf,
        shortcut: '/green',
        keywords: 'green sostenibilita ambiente',
        run: nav('/green'),
      },
      {
        id: 'nav-dashboard',
        label: 'Dashboard admin',
        group: 'Navigazione',
        icon: LayoutDashboard,
        shortcut: '/admin',
        keywords: 'admin dashboard gestione',
        run: nav('/admin/dashboard'),
      },

      {
        id: 'sec-hero',
        label: "Vai all'Hero",
        group: 'Sezioni landing',
        icon: Sparkles,
        keywords: 'hero inizio top',
        run: scrollToHero,
      },
      {
        id: 'sec-funzioni',
        label: 'Funzioni',
        group: 'Sezioni landing',
        icon: ListChecks,
        keywords: 'funzioni features',
        run: section('funzioni'),
      },
      {
        id: 'sec-come-funziona',
        label: 'Come funziona',
        group: 'Sezioni landing',
        icon: Workflow,
        keywords: 'come funziona how it works',
        run: section('come-funziona'),
      },
      {
        id: 'sec-prezzi',
        label: 'Prezzi',
        group: 'Sezioni landing',
        icon: Tag,
        keywords: 'prezzi piani pricing',
        run: section('prezzi'),
      },
      {
        id: 'sec-faq',
        label: 'FAQ',
        group: 'Sezioni landing',
        icon: HelpCircle,
        keywords: 'faq domande faq',
        run: section('faq'),
      },
      {
        id: 'sec-integrazioni',
        label: 'Integrazioni',
        group: 'Sezioni landing',
        icon: Plug,
        keywords: 'integrazioni integrations stripe satispay',
        run: section('integrazioni'),
      },
      {
        id: 'sec-newsletter',
        label: 'Newsletter',
        group: 'Sezioni landing',
        icon: Mail,
        keywords: 'newsletter email iscriviti',
        run: section('newsletter'),
      },

      {
        id: 'act-top',
        label: 'Torna su',
        group: 'Azioni',
        icon: ArrowUp,
        keywords: 'torna su scroll top',
        run: scrollTop,
      },
      {
        id: 'act-chat',
        label: 'Apri chat',
        group: 'Azioni',
        icon: MessageCircle,
        keywords: 'chat assistente aiuto',
        run: openChat,
      },
      {
        id: 'act-lang',
        label:
          lang === 'it' ? 'Cambia lingua (EN)' : 'Switch language (IT)',
        group: 'Azioni',
        icon: Languages,
        keywords: 'lingua language english italiano',
        run: toggleLang,
      },
    ]
  }, [router, lang, setLang, pathname])

  const groupOrder: readonly string[] = useMemo(
    () => ['Navigazione', 'Sezioni landing', 'Azioni'],
    []
  )

  const recentCmds = useMemo(
    () =>
      recent
        .map((id) => allCommands.find((c) => c.id === id))
        .filter((c): c is Cmd => !!c),
    [recent, allCommands]
  )

  const grouped = useMemo(() => {
    const map = new Map<string, Cmd[]>()
    for (const cmd of allCommands) {
      const arr = map.get(cmd.group) ?? []
      arr.push(cmd)
      map.set(cmd.group, arr)
    }
    return map
  }, [allCommands])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="cmd-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
          className="fixed inset-0 z-[70] flex items-start justify-center bg-black/50 px-4 pt-[12vh] backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: -8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className="noise-overlay relative w-full max-w-xl overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-2xl"
          >
            <Command
              className="bg-white text-ink [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-ink/40"
              loop
            >
              <CommandInput
                placeholder="Cerca o esegui un comando..."
                className="text-ink"
              />
              <CommandList className="max-h-[55vh]">
                <CommandEmpty>
                  <div className="flex flex-col items-center gap-2 py-10 text-center">
                    <Search className="h-6 w-6 text-ink/30" />
                    <p className="text-sm text-ink/60">Nessun risultato</p>
                  </div>
                </CommandEmpty>

                {recentCmds.length > 0 && (
                  <CommandGroup heading="Recenti">
                    {recentCmds.map((cmd) => (
                      <CmdRow key={`recent-${cmd.id}`} cmd={cmd} onRun={run} />
                    ))}
                  </CommandGroup>
                )}

                {groupOrder.map((g) => {
                  const items = grouped.get(g) ?? []
                  if (items.length === 0) return null
                  return (
                    <CommandGroup key={g} heading={g}>
                      {items.map((cmd) => (
                        <CmdRow key={cmd.id} cmd={cmd} onRun={run} />
                      ))}
                    </CommandGroup>
                  )
                })}
              </CommandList>

              {/* Footer hint bar */}
              <div className="flex items-center justify-between gap-3 border-t border-ink/10 bg-ink/[0.02] px-4 py-2.5 text-[11px] text-ink/50">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <kbd className="rounded border border-ink/15 bg-white px-1 py-px text-[10px]">
                      ↑
                    </kbd>
                    <kbd className="rounded border border-ink/15 bg-white px-1 py-px text-[10px]">
                      ↓
                    </kbd>
                    <span className="hidden sm:inline">naviga</span>
                  </span>
                  <span className="hidden items-center gap-1 sm:flex">
                    <kbd className="rounded border border-ink/15 bg-white px-1 py-px text-[10px]">
                      ↵
                    </kbd>
                    esegui
                  </span>
                  <span className="hidden items-center gap-1 sm:flex">
                    <kbd className="rounded border border-ink/15 bg-white px-1 py-px text-[10px]">
                      esc
                    </kbd>
                    chiudi
                  </span>
                </div>
                <span className="flex items-center gap-1 font-medium text-ink/60">
                  <CornerDownLeft className="h-3 w-3" />
                  m2m palette
                </span>
              </div>
            </Command>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function CmdRow({ cmd, onRun }: { cmd: Cmd; onRun: (c: Cmd) => void }) {
  const Icon = cmd.icon
  return (
    <CommandItem
      value={`${cmd.label} ${cmd.group} ${cmd.keywords ?? ''}`}
      onSelect={() => onRun(cmd)}
      className="group flex cursor-default items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm text-ink data-[selected=true]:bg-transparent data-[selected=true]:bg-gradient-to-r data-[selected=true]:from-brand-amber/15 data-[selected=true]:to-brand-terra/10 data-[selected=true]:text-ink"
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ink/[0.04] text-ink/70 transition group-data-[selected=true]:bg-gradient-to-br group-data-[selected=true]:from-brand-amber group-data-[selected=true]:to-brand-terra group-data-[selected=true]:text-white">
        <Icon className="h-4 w-4" />
      </span>
      <span className="flex-1 truncate font-medium">{cmd.label}</span>
      {cmd.shortcut && (
        <CommandShortcut className="ml-auto shrink-0 rounded-md border border-ink/10 bg-white px-1.5 py-0.5 text-[10px] font-medium tracking-normal text-ink/50">
          {cmd.shortcut}
        </CommandShortcut>
      )}
    </CommandItem>
  )
}

'use client'

import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Timer, Gift, Sparkles, X } from 'lucide-react'

/**
 * PromoCountdown — dismissible promotional strip showing a live countdown.
 *
 * - Simulates an "offerta lancio" that always ends ~2 days from today's end
 *   (target = end-of-day + 2 days). When the calendar day rolls over, the
 *   target shifts forward, so the strip always shows ~2 days remaining — a
 *   classic urgency pattern.
 * - Each time unit is shown in a small card with .tabular numerals.
 * - Subtle gradient background (amber/rose) + .noise-overlay.
 * - Dismissible via the X button (state lives in component state).
 * - Numbers pulse on change (AnimatePresence keyed by value).
 * - Responsive: on mobile (< sm) only HH:MM:SS are shown.
 */
type TimeLeft = { days: number; hours: number; minutes: number; seconds: number }

function getTimeLeft(target: number): TimeLeft {
  const now = Date.now()
  const diff = Math.max(0, target - now)
  const totalSeconds = Math.floor(diff / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return { days, hours, minutes, seconds }
}

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

function TimeCard({
  value,
  label,
  accent,
}: {
  value: number
  label: string
  accent: string
}) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative min-w-[2.75rem] overflow-hidden rounded-2xl border border-ink/10 bg-white/70 px-2.5 py-1.5 shadow-sm backdrop-blur-sm sm:min-w-[3.25rem] sm:px-3 sm:py-2">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={value}
            initial={{ y: -8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 8, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className={`tabular block text-center text-lg font-bold leading-none sm:text-2xl ${accent}`}
          >
            {pad(value)}
          </motion.span>
        </AnimatePresence>
      </div>
      <span className="mt-1 text-[10px] uppercase tracking-wide text-ink/50 sm:text-[11px]">
        {label}
      </span>
    </div>
  )
}

export function PromoCountdown() {
  const [dismissed, setDismissed] = useState(false)
  const [target, setTarget] = useState<number | null>(null)
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 2,
    hours: 0,
    minutes: 0,
    seconds: 0,
  })

  // Compute target on the client (avoids SSR/CSR hydration mismatch).
  // Target = end-of-day + 2 days → always ~2 days from "now", resets daily.
  useEffect(() => {
    function computeTarget() {
      const end = new Date()
      end.setHours(23, 59, 59, 0)
      end.setDate(end.getDate() + 2)
      return end.getTime()
    }
    const t = computeTarget()
    setTarget(t)
    setTimeLeft(getTimeLeft(t))
  }, [])

  // Tick every second.
  useEffect(() => {
    if (target == null) return
    const id = window.setInterval(() => {
      setTimeLeft(getTimeLeft(target))
    }, 1000)
    return () => window.clearInterval(id)
  }, [target])

  // Optional subtle pulse on the Sparkles icon every few seconds.
  const sparkleVariants = useMemo(
    () => ({
      animate: {
        rotate: [0, 12, -8, 0],
        scale: [1, 1.15, 1],
        transition: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' },
      },
    }),
    []
  )

  if (dismissed || target == null) return null

  return (
    <div className="relative overflow-hidden border-b border-ink/5 bg-gradient-to-r from-brand-amber/10 via-brand-rose/5 to-brand-rose/10">
      <div className="noise-overlay absolute inset-0 pointer-events-none" />
      <div className="relative mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
        {/* Left: icon + label */}
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <span className="relative grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-amber to-brand-rose text-white shadow-sm">
            <motion.span variants={sparkleVariants} animate="animate">
              <Sparkles className="h-4 w-4" />
            </motion.span>
          </span>
          <div className="flex min-w-0 items-center gap-2">
            <Gift className="hidden h-4 w-4 shrink-0 text-brand-rose sm:block" />
            <p className="truncate text-xs font-medium text-ink/80 sm:text-sm">
              <span className="hidden sm:inline">Offerta lancio termina in</span>
              <span className="sm:hidden">Offerta lancio:</span>
            </p>
          </div>
        </div>

        {/* Center/right: countdown cards */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          <Timer className="hidden h-4 w-4 shrink-0 text-brand-terra md:block" />
          {/* Days — hidden on mobile (compact mode) */}
          <div className="hidden sm:block">
            <TimeCard
              value={timeLeft.days}
              label="giorni"
              accent="text-brand-amber"
            />
          </div>
          <TimeCard
            value={timeLeft.hours}
            label="ore"
            accent="text-brand-terra"
          />
          <TimeCard
            value={timeLeft.minutes}
            label="min"
            accent="text-brand-rose"
          />
          <TimeCard
            value={timeLeft.seconds}
            label="sec"
            accent="text-brand-violet"
          />
        </div>

        {/* Close button */}
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Chiudi offerta"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-ink/40 transition hover:bg-ink/5 hover:text-ink/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber/40"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

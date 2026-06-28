'use client'

import { cn } from '@/lib/utils'

type MarqueeProps = {
  children: React.ReactNode
  reverse?: boolean
  className?: string
  pauseOnHover?: boolean
}

/**
 * Infinite horizontal marquee.
 *
 * Uses a single animated track that contains TWO identical copies of the
 * content. The `marquee` keyframe translates the track by -50% (i.e. exactly
 * one copy width), so when the animation loops the second copy is perfectly
 * aligned with where the first copy started → a seamless, jump-free scroll.
 *
 * The second copy is wrapped in an aria-hidden div so screen readers don't
 * announce the duplicated content, and so React doesn't complain about
 * duplicated keys.
 */
export function Marquee({ children, reverse, className, pauseOnHover = true }: MarqueeProps) {
  return (
    <div className={cn('group relative flex overflow-hidden', className)}>
      {/* Edge fade masks */}
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[oklch(0.98_0.01_60)] to-transparent" />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[oklch(0.98_0.01_60)] to-transparent" />

      <div
        className={cn(
          'flex shrink-0 items-stretch',
          reverse ? 'animate-marquee-rev' : 'animate-marquee',
          pauseOnHover && 'group-hover:[animation-play-state:paused]'
        )}
      >
        <div className="flex shrink-0 items-center gap-6 pr-6">{children}</div>
        <div className="flex shrink-0 items-center gap-6 pr-6" aria-hidden>
          {children}
        </div>
      </div>
    </div>
  )
}

'use client'

import { cn } from '@/lib/utils'
import { useRef, useState, useEffect, useCallback } from 'react'
import type { Palette } from './palette'

interface CategoryFilterProps {
  categories: Array<{ id: string; name: string; emoji?: string }>
  activeCat: string
  onCategoryChange: (catId: string) => void
  palette: Palette
  allLabel?: string
}

export function CategoryFilter({
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
              {/* Emoji — sempre visibile */}
              {cat.emoji && (
                <span className="shrink-0 text-base leading-none">{cat.emoji}</span>
              )}

              {/* Label — si espande/contrae */}
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

              {/* Dot indicator when collapsed (no emoji) */}
              {!cat.emoji && !isActive && (
<span className="text-xs font-bold tracking-tight px-1">{cat.name}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Freccia sinistra */}
      <div {...arrowProps(-1, canScrollLeft, 'left')}>
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/60">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M13 4l-6 6 6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* Freccia destra */}
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
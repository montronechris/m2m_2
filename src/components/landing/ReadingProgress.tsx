'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Top-of-viewport scroll progress bar.
 *
 * - A thin (3px) gradient bar fixed at the very top of the viewport.
 * - Width scales with scroll progress (0 → 1) using CSS transform: scaleX().
 * - Hidden on /admin and /login pages (avoid double chrome).
 * - Uses a passive scroll listener + requestAnimationFrame for cheap updates.
 * - z-50 sits above page content; below ChatWidget panel (z-[60]).
 */
export function ReadingProgress() {
  const pathname = usePathname()
  const [progress, setProgress] = useState(0)

  // Hide on admin + login routes
  const hidden =
    !!pathname && (pathname.startsWith('/admin') || pathname.startsWith('/login'))

  useEffect(() => {
    let rafId: number | null = null

    function update() {
      const scrollTop = window.scrollY
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight
      const ratio = docHeight > 0 ? scrollTop / docHeight : 0
      setProgress(Math.min(1, Math.max(0, ratio)))
      rafId = null
    }

    function onScroll() {
      if (rafId == null) {
        rafId = window.requestAnimationFrame(update)
      }
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (rafId != null) window.cancelAnimationFrame(rafId)
    }
  }, [])

  if (hidden) return null

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed left-0 right-0 top-0 z-50 h-[3px] bg-transparent"
    >
      <div
        className="h-full origin-left bg-gradient-to-r from-brand-amber via-brand-terra to-brand-rose"
        style={{
          transform: `scaleX(${progress})`,
          transformOrigin: 'left center',
          transition: 'transform 90ms linear',
        }}
      />
    </div>
  )
}

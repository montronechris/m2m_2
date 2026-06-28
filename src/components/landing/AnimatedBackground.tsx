'use client'

/**
 * Animated gradient-mesh background.
 * Floating colored blobs that give depth and movement to every section,
 * deliberately breaking away from the flat light-yellow look.
 */
export function AnimatedBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Base warm wash (peach → cream, not pale yellow) */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_-10%,oklch(0.97_0.03_60)_0%,oklch(0.99_0.01_70)_45%,oklch(1_0_0)_100%)]" />

      {/* Floating color blobs (kept soft so foreground text always wins contrast) */}
      <div className="absolute -top-24 -left-24 h-[28rem] w-[28rem] rounded-full bg-brand-amber/25 blur-3xl animate-blob" />
      <div className="absolute top-1/3 -right-32 h-[32rem] w-[32rem] rounded-full bg-brand-rose/20 blur-3xl animate-blob-alt" />
      <div className="absolute bottom-0 left-1/4 h-[26rem] w-[26rem] rounded-full bg-brand-emerald/18 blur-3xl animate-blob" />
      <div className="absolute top-1/2 left-1/2 h-[22rem] w-[22rem] -translate-x-1/2 rounded-full bg-brand-violet/15 blur-3xl animate-blob-alt" />

      {/* Soft grid overlay */}
      <div className="absolute inset-0 bg-grid-soft [mask-image:radial-gradient(100%_60%_at_50%_0%,#000,transparent)]" />
    </div>
  )
}

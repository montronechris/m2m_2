'use client'

/**
 * Animated gradient-mesh background.
 * Reduced from 4 blobs → 2, blur-3xl → blur-2xl for GPU cost.
 * Blob animations are disabled under `prefers-reduced-motion: reduce`.
 */
export function AnimatedBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Base warm wash (peach → cream, not pale yellow) */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_-10%,oklch(0.97_0.03_60)_0%,oklch(0.99_0.01_70)_45%,oklch(1_0_0)_100%)]" />

      {/* Single static soft blob — no animation, cheaper blur-xl */}
      <div className="absolute -top-24 -left-24 h-[26rem] w-[26rem] rounded-full bg-brand-amber/20 blur-xl" />

      {/* Soft grid overlay */}
      <div className="absolute inset-0 bg-grid-soft [mask-image:radial-gradient(100%_60%_at_50%_0%,#000,transparent)]" />
    </div>
  )
}

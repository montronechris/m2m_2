'use client'

import { Header } from '@/components/landing/Header'
import { Footer } from '@/components/landing/Footer'

export function PageShell({
  children,
  bare = false,
}: {
  children: React.ReactNode
  bare?: boolean
}) {
  if (bare) {
    return <>{children}</>
  }

  return (
    <div className="relative flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
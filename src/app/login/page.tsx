'use client'

import { Suspense } from 'react'
import { AuthPage } from '@/components/auth/auth-page'
import { LangBanner } from '@/components/landing/LangBanner'

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LangBanner />
      <AuthPage />
    </Suspense>
  )
}

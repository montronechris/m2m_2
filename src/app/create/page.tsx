'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RestaurantCreationPage } from '@/components/auth/restaurant-creation-page'
import { getRestaurantByUser } from '@/lib/admin-service'
import { supabase } from '@/lib/supabase'
import { LangBanner } from '@/components/landing/LangBanner'
import { useI18n } from '@/components/i18n/I18nProvider'

export default function CreatePage() {
  const { tr } = useI18n()
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [hasRestaurant, setHasRestaurant] = useState(false)
  const [countdown, setCountdown] = useState(3)

  useEffect(() => {
    let cancelled = false

    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return
      if (!data.user) {
        router.replace('/login')
        return
      }
      getRestaurantByUser()
        .then(() => {
          if (!cancelled) setHasRestaurant(true)
        })
        .catch(() => {
          if (!cancelled) setHasRestaurant(false)
        })
        .finally(() => {
          if (!cancelled) setChecking(false)
        })
    })

    return () => {
      cancelled = true
    }
  }, [router])

  useEffect(() => {
    if (!hasRestaurant) return
    if (countdown === 0) {
      window.location.href = '/admin/dashboard'
      return
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [hasRestaurant, countdown])

  if (checking) return null

  if (hasRestaurant) {
    return (
      <main
        className="flex min-h-screen w-full flex-col items-center justify-center px-4 text-center"
        style={{
          background:
            'radial-gradient(1200px 600px at 15% 10%, #FFF7EE 0%, transparent 60%), radial-gradient(1000px 500px at 85% 90%, #FFE3D1 0%, transparent 55%), #F5F1E8',
        }}
      >
        <LangBanner />
        <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-xl ring-1 ring-black/5">
          <p className="text-lg font-semibold text-gray-900">
            {tr.auth.create.alreadyRegisteredTitle}
          </p>
          <p className="mt-2 text-sm text-gray-500">
            {tr.auth.create.alreadyRegisteredSubtitle}
          </p>
          <p className="mt-4 text-5xl font-bold" style={{ color: '#FF6B00' }}>
            {countdown}
          </p>
        </div>
      </main>
    )
  }

  return (
    <>
      <LangBanner />
      <RestaurantCreationPage onBack={() => router.push('/')} />
    </>
  )
}

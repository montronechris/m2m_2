'use client'

import { useEffect, useState } from 'react'
import { RestaurantCreationPage } from '@/components/auth/restaurant-creation-page'
import { getRestaurantByUser } from '@/lib/admin-service'
import { supabase } from '@/lib/supabase'

export default function CreatePage() {
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let cancelled = false

    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return
      if (!data.user) {
        setChecking(false)
        return
      }
      getRestaurantByUser()
        .then(() => {
          if (cancelled) return
          sessionStorage.setItem('tt-already-has-restaurant', '1')
          window.location.href = '/admin/dashboard'
        })
        .catch(() => {
          if (!cancelled) setChecking(false)
        })
    })

    return () => {
      cancelled = true
    }
  }, [])

  if (checking) return null

  return <RestaurantCreationPage />
}
'use client'

import { useState } from 'react'
import { LayoutDashboard, Store, Home, ChefHat, AlertTriangle } from 'lucide-react'
import { useI18n } from '@/components/i18n/I18nProvider'

const ORANGE = '#FF6B00'
const ORANGE_DEEP = '#FF3D00'
const INK = '#212121'
const GRAY = '#757575'

type Choice = 'dashboard' | 'create-restaurant' | 'home'

export function PostLoginChoice({
  name,
  onChoose,
  errorMessage,
}: {
  name: string | null
  onChoose: (choice: Choice) => void
  errorMessage?: string | null
}) {
  const { tr } = useI18n()
  const t = tr.auth.choice
  const [chosen, setChosen] = useState<Choice | null>(null)
  const [exiting, setExiting] = useState(false)

  const handleChoose = (choice: Choice) => {
    if (chosen) return
    setChosen(choice)
    // keep the picked option visible for a beat before leaving
    setTimeout(() => {
      setExiting(true)
      // let the exit transition play before the redirect fires
      setTimeout(() => onChoose(choice), 500)
    }, 1000)
  }

  const options: {
    id: Choice
    icon: React.ReactNode
    title: string
    description: string
  }[] = [
    {
      id: 'dashboard',
      icon: <LayoutDashboard className="h-6 w-6" />,
      title: t.dashboard,
      description: t.dashboardDesc,
    },
    {
      id: 'create-restaurant',
      icon: <Store className="h-6 w-6" />,
      title: t.createRestaurant,
      description: t.createRestaurantDesc,
    },
    {
      id: 'home',
      icon: <Home className="h-6 w-6" />,
      title: t.home,
      description: t.homeDesc,
    },
  ]

  return (
    <main
      className="flex min-h-screen w-full flex-col items-center justify-center px-4 py-8"
      style={{
        background:
          'radial-gradient(1200px 600px at 15% 10%, #FFF7EE 0%, transparent 60%), radial-gradient(1000px 500px at 85% 90%, #FFE3D1 0%, transparent 55%), #F5F1E8',
      }}
    >
      <div
        className={`post-login-card w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl shadow-[#FF3D00]/15 ring-1 ring-black/5 ${
          exiting ? 'post-login-card--exiting' : ''
        }`}
      >
        {/* Header with gradient */}
        <div
          className="relative px-8 py-10 text-center"
          style={{ background: `linear-gradient(135deg, ${ORANGE}, ${ORANGE_DEEP})` }}
        >
          {/* decorative floating dots */}
          <div
            className="auth-float absolute -right-3 top-4 h-16 w-16 rounded-full bg-white/15"
            style={{ filter: 'blur(2px)' }}
          />
          <div className="auth-float-slow absolute left-6 bottom-2 h-10 w-10 rounded-full bg-white/20" />
          <div className="relative">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
              <ChefHat className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">
              {t.greeting}{name ? `, ${name}` : ''}!
            </h1>
            <p className="mt-1.5 text-sm text-white/85">
              {t.subtitle}
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="mx-6 mt-6 flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
            <p className="text-sm font-medium text-red-700">{errorMessage}</p>
          </div>
        )}

        {/* Options */}
        <div className="space-y-3 p-6">
          {options.map((opt) => {
            const isChosen = chosen === opt.id
            const isDimmed = chosen !== null && !isChosen
            return (
              <button
                key={opt.id}
                type="button"
                disabled={chosen !== null}
                onClick={() => handleChoose(opt.id)}
                className={`group flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-300 active:scale-[0.99] ${
                  isChosen
                    ? 'border-[#FF6B00]/40 bg-[#FFF7EE] shadow-md'
                    : 'border-black/5 bg-white hover:border-[#FF6B00]/30 hover:bg-[#FFF7EE] hover:shadow-md'
                }`}
                style={{ opacity: isDimmed ? 0.4 : 1 }}
              >
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors duration-200"
                  style={{ background: 'rgba(255,107,0,0.1)', color: ORANGE }}
                >
                  {opt.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold" style={{ color: INK }}>
                    {opt.title}
                  </p>
                  <p className="mt-0.5 text-[13px]" style={{ color: GRAY }}>
                    {opt.description}
                  </p>
                </div>
                <span
                  className="text-lg transition-transform duration-200 group-hover:translate-x-1"
                  style={{ color: ORANGE }}
                >
                  {isChosen ? '✓' : '→'}
                </span>
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <div className="border-t border-black/5 px-6 py-4 text-center">
          <p className="text-xs" style={{ color: GRAY }}>
            © {new Date().getFullYear()} Tavola · Made with{' '}
            <span style={{ color: ORANGE }}>♥</span> in Italia
          </p>
        </div>
      </div>
    </main>
  )
}

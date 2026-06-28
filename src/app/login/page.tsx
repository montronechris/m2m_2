'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ChefHat,
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  Loader2,
  Sparkles,
  ShieldCheck,
  QrCode,
  TrendingUp,
  UtensilsCrossed,
  CheckCircle2,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Se già loggato, vai alla dashboard
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push('/admin/dashboard')
    })
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (signInError) throw new Error(signInError.message)
      router.push('/admin/dashboard')
    } catch (err: any) {
      setError(err.message ?? 'Errore di accesso')
    } finally {
      setLoading(false)
    }
  }

  const features = [
    { icon: QrCode, label: 'Menù QR istantanei' },
    { icon: TrendingUp, label: 'Analytics in tempo reale' },
    { icon: UtensilsCrossed, label: 'Gestione cucina live' },
  ]

  return (
    <div className="relative grid min-h-screen lg:grid-cols-2">
      {/* sfondo decorativo globale */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-20 left-1/4 h-72 w-72 rounded-full bg-brand-amber/25 blur-3xl animate-blob" />
        <div className="absolute bottom-1/4 right-0 h-80 w-80 rounded-full bg-brand-rose/20 blur-3xl animate-blob-alt" />
        <div className="absolute top-1/3 left-0 h-72 w-72 rounded-full bg-brand-terra/15 blur-3xl animate-float-soft" />
        <div className="absolute inset-0 bg-grid-soft opacity-60" />
      </div>

      {/* === LEFT: Brand panel (desktop only) === */}
      <aside className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between bg-gradient-to-br from-brand-amber via-brand-terra to-brand-rose p-12 text-white">
        {/* texture + blobs */}
        <div aria-hidden className="absolute inset-0 noise-overlay opacity-100" />
        <div aria-hidden className="pointer-events-none absolute -top-16 -left-16 h-72 w-72 rounded-full bg-white/15 blur-3xl animate-blob" />
        <div aria-hidden className="pointer-events-none absolute bottom-10 -right-10 h-80 w-80 rounded-full bg-brand-violet/30 blur-3xl animate-blob-alt" />

        {/* Logo + brand */}
        <div className="relative">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <span className="relative grid h-11 w-11 place-items-center rounded-2xl bg-white/15 backdrop-blur ring-1 ring-inset ring-white/30">
              <ChefHat className="h-6 w-6" />
              <Sparkles className="absolute -right-1 -top-1 h-3.5 w-3.5 text-white animate-sparkle-spin" />
            </span>
            <span className="font-serif text-2xl font-black tracking-tight">
              m<span className="text-white/80">2</span>m
            </span>
          </Link>
        </div>

        {/* Hero copy */}
        <div className="relative max-w-md">
          <h2 className="font-serif text-4xl font-black leading-tight xl:text-5xl">
            Trasforma il tuo ristorante
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-white/85">
            Menù digitali, ordinazione QR, gestione cucina e analytics — tutto in un&apos;unica piattaforma.
          </p>

          {/* Feature list */}
          <ul className="mt-8 space-y-3">
            {features.map((f) => (
              <li key={f.label} className="flex items-center gap-3 text-white/90">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 backdrop-blur ring-1 ring-inset ring-white/20">
                  <f.icon className="h-4 w-4" />
                </span>
                <span className="font-medium">{f.label}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Stats strip */}
        <div className="relative flex items-center gap-6 rounded-2xl bg-white/10 p-4 backdrop-blur ring-1 ring-inset ring-white/15">
          <div>
            <p className="font-serif text-2xl font-black tabular">1.200+</p>
            <p className="text-xs text-white/70">Ristoranti attivi</p>
          </div>
          <div className="h-10 w-px bg-white/20" />
          <div>
            <p className="font-serif text-2xl font-black tabular">4.9/5</p>
            <p className="text-xs text-white/70">Rating medio</p>
          </div>
          <div className="h-10 w-px bg-white/20" />
          <div>
            <p className="font-serif text-2xl font-black tabular">99,9%</p>
            <p className="text-xs text-white/70">Uptime</p>
          </div>
        </div>
      </aside>

      {/* === RIGHT: Form panel === */}
      <div className="relative grid place-items-center bg-tt-surfaceAlt px-4 py-10">
        <div className="w-full max-w-sm">
          {/* Logo (mobile) */}
          <div className="mb-5 text-center lg:hidden">
            <span className="relative mx-auto mb-3 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-brand-amber via-brand-terra to-brand-rose text-white shadow-glow-amber">
              <ChefHat className="h-8 w-8" />
              <Sparkles className="absolute -right-1 -top-1 h-4 w-4 text-brand-amber animate-sparkle-spin" />
              <span className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/30" />
            </span>
            <h1 className="font-serif text-2xl font-black text-tt-ink">
              m<span className="text-gradient-warm">2</span>m
            </h1>
            <p className="mt-1 text-sm text-tt-muted">Accedi al tuo ristorante</p>
          </div>

          {/* Header (desktop) */}
          <div className="mb-6 hidden lg:block">
            <h2 className="font-serif text-3xl font-black text-tt-ink">Bentornato 👋</h2>
            <p className="mt-1.5 text-sm text-tt-muted">
              Accedi alla dashboard del tuo ristorante per gestire ordini, menu e analytics.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="card-gradient-border noise-overlay relative space-y-4 rounded-3xl bg-white/95 p-6 shadow-tt"
          >
            <div>
              <label className="mb-1.5 block text-xs font-bold text-tt-ink">Email</label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-tt-muted transition-colors group-focus-within:text-brand-amber" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nome@ristorante.it"
                  className="w-full rounded-xl border border-tt-line bg-white py-3 pl-10 pr-3 text-sm text-tt-ink outline-none transition-all placeholder:text-tt-muted/60 focus:border-brand-amber/50 focus:ring-2 focus:ring-brand-amber/20"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-tt-ink">Password</label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-tt-muted transition-colors group-focus-within:text-brand-amber" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-tt-line bg-white py-3 pl-10 pr-3 text-sm text-tt-ink outline-none transition-all placeholder:text-tt-muted/60 focus:border-brand-amber/50 focus:ring-2 focus:ring-brand-amber/20"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-tt-danger/30 bg-tt-danger/5 p-3 text-xs text-tt-danger">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="sheen flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-amber to-brand-terra py-3 text-sm font-bold text-white shadow-glow-amber transition hover:scale-[1.02] disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Accesso in corso…
                </>
              ) : (
                <>
                  Accedi <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            {/* Trust element */}
            <div className="flex items-center justify-center gap-1.5 pt-1 text-[11px] text-tt-muted">
              <ShieldCheck className="h-3.5 w-3.5 text-brand-emerald" />
              <span>Accesso sicuro · crittografia SSL</span>
            </div>
          </form>

          {/* Demo hint */}
          <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-brand-amber/20 bg-brand-amber/5 p-3 text-xs">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-amber" />
            <div className="text-tt-muted">
              <p className="font-bold text-tt-ink">Account demo disponibile</p>
              <p className="mt-0.5">
                Email: <span className="tabular font-semibold text-tt-ink">qqq@gmail.com</span> · Password:{' '}
                <span className="font-semibold text-tt-ink">aaaaaaaa</span>
              </p>
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-tt-muted">
            <Link href="/" className="link-underline font-medium hover:text-tt-ink">
              ← Torna alla home
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

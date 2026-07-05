'use client'

import { useState } from 'react'
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  ChefHat,
  UtensilsCrossed,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Check,
  X,
  Phone,
  RefreshCw,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  PasswordStrength,
  evaluatePassword,
} from '@/components/auth/password-strength'
import { StepProgress, type StepState } from '@/components/auth/step-progress'
import { supabase } from '@/lib/supabase'

/* ------------------------------------------------------------------ */
/*  Color tokens (restaurant palette from reference image)            */
/* ------------------------------------------------------------------ */
const C = {
  cream: '#F5F1E8',
  orange: '#FF6B00',
  orangeDeep: '#FF3D00',
  ink: '#212121',
  gray: '#757575',
  white: '#FFFFFF',
  peach: '#FFE8D6',
  green: '#4CAF50',
}

/* ------------------------------------------------------------------ */
/*  Small presentational helpers                                       */
/* ------------------------------------------------------------------ */

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      className="mb-1.5 block text-[13px] font-medium tracking-wide"
      style={{ color: C.gray }}
    >
      {children}
    </label>
  )
}

function IconInput({
  icon,
  type = 'text',
  placeholder,
  name,
  autoComplete,
  rightSlot,
  state = 'default',
  value,
  onChange,
}: {
  icon: React.ReactNode
  type?: string
  placeholder?: string
  name?: string
  autoComplete?: string
  rightSlot?: React.ReactNode
  state?: 'default' | 'valid' | 'invalid'
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  const restingBorder =
    state === 'valid'
      ? C.green
      : state === 'invalid'
        ? '#F44336'
        : 'rgba(33,33,33,0.12)'
  const focusClasses =
    state === 'valid'
      ? 'focus-within:border-[#4CAF50] focus-within:ring-[#4CAF50]/10'
      : state === 'invalid'
        ? 'focus-within:border-[#F44336] focus-within:ring-[#F44336]/10'
        : 'focus-within:border-[#FF6B00] focus-within:ring-[#FF6B00]/10'
  return (
    <div
      className={`group flex items-center gap-3 rounded-xl border bg-white px-3.5 py-3 transition-all duration-200 focus-within:ring-4 ${focusClasses}`}
      style={{ borderColor: restingBorder }}
    >
      <span style={{ color: C.gray }} className="shrink-0">
        {icon}
      </span>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        autoComplete={autoComplete}
        value={value}
        onChange={onChange}
        className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-[#9e9e9e]"
        style={{ color: C.ink }}
      />
      {rightSlot}
    </div>
  )
}

function PrimaryButton({
  children,
  onClick,
  type = 'button',
  loading = false,
  loadingText,
}: {
  children: React.ReactNode
  onClick?: () => void
  type?: 'button' | 'submit'
  loading?: boolean
  loadingText?: string
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={loading}
      className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl px-5 py-3.5 text-[15px] font-semibold text-white shadow-lg shadow-[#FF3D00]/25 transition-all duration-300 hover:shadow-xl hover:shadow-[#FF3D00]/35 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 disabled:shadow-none"
      style={{ background: `linear-gradient(135deg, ${C.orange}, ${C.orangeDeep})` }}
    >
      <span className="absolute inset-0 -translate-x-full bg-white/20 transition-transform duration-500 group-hover:translate-x-full" />
      {loading ? (
        <span className="relative flex items-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          {loadingText ?? children}
        </span>
      ) : (
        <>
          <span className="relative">{children}</span>
          <ArrowRight className="relative h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </>
      )}
    </button>
  )
}

function GhostButton({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-2 rounded-xl border-2 px-5 py-3.5 text-[15px] font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
      style={{
        background: C.peach,
        color: C.orangeDeep,
        borderColor: 'rgba(255,255,255,0.55)',
      }}
    >
      {children}
    </button>
  )
}

function SocialButtons() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        type="button"
        className="flex items-center justify-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-medium transition-all hover:border-[#FF6B00]/40 hover:shadow-sm"
        style={{ borderColor: 'rgba(33,33,33,0.12)', color: C.ink }}
      >
        <GoogleIcon /> Google
      </button>
      <button
        type="button"
        className="flex items-center justify-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-medium transition-all hover:border-[#FF6B00]/40 hover:shadow-sm"
        style={{ borderColor: 'rgba(33,33,33,0.12)', color: C.ink }}
      >
        <GithubIcon /> GitHub
      </button>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z" />
    </svg>
  )
}

function GithubIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" style={{ color: C.ink }}>
      <path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.49 0-.24-.01-.88-.01-1.73-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.27 2.75 1.05A9.36 9.36 0 0 1 12 6.84c.85 0 1.71.12 2.51.34 1.91-1.32 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.81-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.48-.01 2.82 0 .27.18.6.69.49A10.02 10.02 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z" />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  Form panels                                                       */
/* ------------------------------------------------------------------ */

function LoginForm() {
  const { toast } = useToast()
  const [showPw, setShowPw] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (error) {
        toast({ variant: 'destructive', title: 'Accesso fallito', description: error.message })
        return
      }
      toast({
        title: 'Accesso effettuato!',
        description: data.user?.user_metadata?.full_name
          ? `Bentornato, ${data.user.user_metadata.full_name}.`
          : 'Login completato con successo.',
      })
      window.location.href = '/'
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Errore di rete', description: err?.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      className="flex h-full w-full flex-col justify-center px-8 sm:px-10 lg:px-14"
      onSubmit={handleLogin}
    >
      {/* Badge */}
      <div
        className="mb-5 inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
        style={{ background: 'rgba(255,107,0,0.1)', color: C.orange }}
      >
        <Sparkles className="h-3.5 w-3.5" />
        Bentornato
      </div>

      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: C.ink }}>
        Accedi
      </h1>
      <p className="mt-2 text-[15px]" style={{ color: C.gray }}>
        Inserisci i tuoi dati per continuare.
      </p>

      <div className="mt-7 space-y-4">
        <div>
          <FieldLabel>Email</FieldLabel>
          <IconInput
            icon={<Mail className="h-4 w-4" />}
            type="email"
            name="email"
            placeholder="nome@ristorante.it"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <FieldLabel>Password</FieldLabel>
          <IconInput
            icon={<Lock className="h-4 w-4" />}
            type={showPw ? 'text' : 'password'}
            name="password"
            placeholder="••••••••"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            rightSlot={
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="shrink-0 rounded-md p-1 transition-colors hover:bg-black/5"
                style={{ color: C.gray }}
                aria-label={showPw ? 'Nascondi password' : 'Mostra password'}
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
          />
        </div>

        <div className="flex items-center justify-between pt-1">
          <label className="group flex cursor-pointer select-none items-center gap-2.5 text-sm" style={{ color: C.gray }}>
            <span className="relative inline-block h-[18px] w-[18px] shrink-0">
              <input type="checkbox" className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0" />
              <span
                aria-hidden
                className="absolute inset-0 rounded-lg border-2 bg-white shadow-sm transition-all duration-300 ease-out peer-checked:scale-[1.08] peer-checked:border-transparent peer-checked:bg-gradient-to-br peer-checked:from-[#FF6B00] peer-checked:to-[#FF3D00] peer-checked:shadow-[0_6px_18px_-6px_rgba(255,107,0,0.55)] peer-focus-visible:ring-2 peer-focus-visible:ring-[#FF6B00]/40 group-hover:border-[#FF6B00]/60"
                style={{ borderColor: 'rgba(33,33,33,0.18)' }}
              />
              <svg
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden
                className="pointer-events-none absolute inset-0 h-full w-full scale-50 text-white opacity-0 transition-all duration-300 ease-[cubic-bezier(.34,1.56,.64,1)] peer-checked:scale-100 peer-checked:opacity-100"
              >
                <path
                  d="M4.5 10.5 L8.4 14 L15.5 6.5"
                  stroke="currentColor"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-lg ring-0 ring-[#FF6B00]/20 transition-all duration-500 peer-checked:ring-8"
              />
            </span>
            <span className="transition-colors group-hover:text-[#212121]">Ricordami</span>
          </label>
          <a
            href="#"
            className="text-sm font-semibold transition-colors hover:underline"
            style={{ color: C.orange }}
          >
            Password dimenticata?
          </a>
        </div>

        <div className="pt-2">
          <PrimaryButton type="submit" loading={loading} loadingText="Verifica credenziali…">
            Accedi
          </PrimaryButton>
        </div>

        <div className="flex items-center gap-3 py-2">
          <div className="h-px flex-1" style={{ background: 'rgba(33,33,33,0.1)' }} />
          <span className="text-xs uppercase tracking-wider" style={{ color: C.gray }}>
            oppure
          </span>
          <div className="h-px flex-1" style={{ background: 'rgba(33,33,33,0.1)' }} />
        </div>

        <SocialButtons />
      </div>

      <div
        className="mt-8 flex items-center justify-center gap-2 text-xs"
        style={{ color: C.gray }}
      >
        <ShieldCheck className="h-3.5 w-3.5" style={{ color: C.green }} />
        Accesso sicuro · crittografia SSL · verifica OTP
      </div>
    </form>
  )
}

function SignupForm() {
  const { toast } = useToast()
  const [showPw, setShowPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  const { allPassed } = evaluatePassword(password)
  const confirmTouched = confirm.length > 0
  const passwordsMatch = confirm.length > 0 && password === confirm
  const confirmMismatch = confirmTouched && password !== confirm

  const confirmState: 'default' | 'valid' | 'invalid' = passwordsMatch
    ? 'valid'
    : confirmMismatch
      ? 'invalid'
      : 'default'

  // --- step validity (one circle per required field) ---
  const steps: StepState[] = [
    { id: 'name', label: 'Nome', done: name.trim().length >= 2 },
    {
      id: 'email',
      label: 'Email',
      done: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    },
    { id: 'password', label: 'Password', done: allPassed },
    { id: 'confirm', label: 'Conferma', done: passwordsMatch },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    if (!allPassed) {
      toast({
        variant: 'destructive',
        title: 'Password non sicura',
        description: 'Rispetta tutti i requisiti della password prima di continuare.',
      })
      return
    }
    if (password !== confirm) {
      toast({
        variant: 'destructive',
        title: 'Le password non corrispondono',
        description: 'Assicurati che la conferma coincida con la password.',
      })
      return
    }
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: name.trim(), phone: phone.trim() || null } },
      })
      if (error) {
        toast({ variant: 'destructive', title: 'Registrazione fallita', description: error.message })
        return
      }
      if (data.session) {
        toast({ title: 'Account creato!', description: 'Reindirizzamento in corso…' })
        window.location.href = '/'
        return
      }
      toast({
        title: 'Account creato!',
        description: 'Controlla la tua email per confermare l’indirizzo.',
      })
      setName('')
      setEmail('')
      setPhone('')
      setPassword('')
      setConfirm('')
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Errore di rete', description: err?.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      className="auth-scroll flex h-full w-full flex-col justify-center overflow-y-auto px-8 sm:px-10 lg:px-14"
      onSubmit={handleSubmit}
    >
      <div
        className="mb-4 inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
        style={{ background: 'rgba(255,107,0,0.1)', color: C.orange }}
      >
        <UtensilsCrossed className="h-3.5 w-3.5" />
        Unisciti a noi
      </div>

      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: C.ink }}>
        Crea account
      </h1>
      <p className="mt-2 text-[15px]" style={{ color: C.gray }}>
        Registrati in pochi secondi e accedi al tuo ristorante.
      </p>

      {/* Step progress indicator */}
      <div className="mt-5">
        <StepProgress steps={steps} />
      </div>

      <div className="mt-5 space-y-4">
        <div>
          <FieldLabel>Nome completo</FieldLabel>
          <IconInput
            icon={<User className="h-4 w-4" />}
            type="text"
            name="name"
            placeholder="Mario Rossi"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            state={name.trim().length >= 2 ? 'valid' : 'default'}
          />
        </div>
        <div>
          <FieldLabel>Email</FieldLabel>
          <IconInput
            icon={<Mail className="h-4 w-4" />}
            type="email"
            name="email"
            placeholder="nome@ristorante.it"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            state={
              email.length > 0
                ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
                  ? 'valid'
                  : 'invalid'
                : 'default'
            }
          />
        </div>
        <div>
          <FieldLabel>
            Telefono <span style={{ color: C.gray, fontWeight: 400 }}>(opzionale, per OTP via SMS)</span>
          </FieldLabel>
          <IconInput
            icon={<Phone className="h-4 w-4" />}
            type="tel"
            name="phone"
            placeholder="+39 333 1234567"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div>
          <FieldLabel>Password</FieldLabel>
          <IconInput
            icon={<Lock className="h-4 w-4" />}
            type={showPw ? 'text' : 'password'}
            name="password"
            placeholder="Crea una password sicura"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            rightSlot={
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="shrink-0 rounded-md p-1 transition-colors hover:bg-black/5"
                style={{ color: C.gray }}
                aria-label={showPw ? 'Nascondi password' : 'Mostra password'}
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
          />
          <PasswordStrength password={password} />
        </div>
        <div>
          <FieldLabel>Conferma password</FieldLabel>
          <IconInput
            icon={<Lock className="h-4 w-4" />}
            type={showConfirmPw ? 'text' : 'password'}
            name="confirmPassword"
            placeholder="Ripeti la password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            state={confirmState}
            rightSlot={
              <>
                {passwordsMatch && (
                  <span className="auth-check-pop flex shrink-0 items-center justify-center">
                    <Check className="h-4 w-4" style={{ color: C.green }} strokeWidth={3} />
                  </span>
                )}
                {confirmMismatch && (
                  <span className="flex shrink-0 items-center justify-center">
                    <X className="h-4 w-4" style={{ color: '#F44336' }} strokeWidth={3} />
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setShowConfirmPw((v) => !v)}
                  className="shrink-0 rounded-md p-1 transition-colors hover:bg-black/5"
                  style={{ color: C.gray }}
                  aria-label={showConfirmPw ? 'Nascondi password' : 'Mostra password'}
                >
                  {showConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </>
            }
          />
          {confirmMismatch && (
            <p className="mt-1.5 text-xs font-medium" style={{ color: '#F44336' }}>
              Le password non corrispondono
            </p>
          )}
          {passwordsMatch && (
            <p className="mt-1.5 text-xs font-medium" style={{ color: C.green }}>
              Le password corrispondono
            </p>
          )}
        </div>

        <label className="group flex cursor-pointer select-none items-start gap-2.5 pt-1 text-sm" style={{ color: C.gray }}>
          <span className="relative mt-0.5 inline-block h-[18px] w-[18px] shrink-0">
            <input type="checkbox" className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0" />
            <span
              aria-hidden
              className="absolute inset-0 rounded-lg border-2 bg-white shadow-sm transition-all duration-300 ease-out peer-checked:scale-[1.08] peer-checked:border-transparent peer-checked:bg-gradient-to-br peer-checked:from-[#FF6B00] peer-checked:to-[#FF3D00] peer-checked:shadow-[0_6px_18px_-6px_rgba(255,107,0,0.55)] peer-focus-visible:ring-2 peer-focus-visible:ring-[#FF6B00]/40 group-hover:border-[#FF6B00]/60"
              style={{ borderColor: 'rgba(33,33,33,0.18)' }}
            />
            <svg
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden
              className="pointer-events-none absolute inset-0 h-full w-full scale-50 text-white opacity-0 transition-all duration-300 ease-[cubic-bezier(.34,1.56,.64,1)] peer-checked:scale-100 peer-checked:opacity-100"
            >
              <path
                d="M4.5 10.5 L8.4 14 L15.5 6.5"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-lg ring-0 ring-[#FF6B00]/20 transition-all duration-500 peer-checked:ring-8"
            />
          </span>
          <span>
            Accetto i{' '}
            <a href="#" className="font-semibold hover:underline" style={{ color: C.orange }}>
              Termini di servizio
            </a>{' '}
            e la{' '}
            <a href="#" className="font-semibold hover:underline" style={{ color: C.orange }}>
              Privacy Policy
            </a>
          </span>
        </label>

        <div className="pt-1">
          <PrimaryButton type="submit" loading={loading} loadingText="Creazione account…">
            Crea account
          </PrimaryButton>
        </div>
      </div>

      <div
        className="mt-6 flex items-center justify-center gap-2 text-xs"
        style={{ color: C.gray }}
      >
        <CheckCircle2 className="h-3.5 w-3.5" style={{ color: C.green }} />
        Prova gratuita 14 giorni · nessuna carta richiesta
      </div>
    </form>
  )
}

/* ------------------------------------------------------------------ */
/*  Overlay promo content (shown on the gradient panel)               */
/* ------------------------------------------------------------------ */

function OverlayDeco() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="auth-float absolute -right-6 top-10 h-24 w-24 rounded-full opacity-20"
        style={{ background: 'rgba(255,255,255,0.6)', filter: 'blur(2px)' }}
      />
      <div
        className="auth-float-slow absolute left-10 bottom-16 h-16 w-16 rounded-full opacity-25"
        style={{ background: 'rgba(255,255,255,0.7)' }}
      />
      <div
        className="auth-float absolute right-16 bottom-24 h-3 w-3 rounded-full bg-white/70"
        style={{ animationDelay: '1s' }}
      />
      <div
        className="auth-float-slow absolute left-24 top-24 h-2 w-2 rounded-full bg-white/60"
        style={{ animationDelay: '2s' }}
      />
    </div>
  )
}

function OverlayRight({ onSwitch }: { onSwitch: () => void }) {
  return (
    <div className="auth-overlay-content auth-overlay-content--right absolute inset-0 flex flex-col justify-center px-10 lg:px-14">
      <OverlayDeco />
      <div className="relative">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
          <ChefHat className="h-7 w-7 text-white" />
        </div>
        <h2 className="text-3xl font-bold leading-tight text-white sm:text-4xl">
          Nuovo da queste parti?
        </h2>
        <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-white/85">
          Crea un account e sblocca l&apos;esperienza completa. Gestisci menu,
          prenotazioni e clienti da un unico posto.
        </p>

        <ul className="mt-6 space-y-2.5">
          {['Menu digitale always-on', 'Prenotazioni in tempo reale', 'Statistiche e insight'].map(
            (t) => (
              <li key={t} className="flex items-center gap-2.5 text-sm text-white/90">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-white" />
                {t}
              </li>
            ),
          )}
        </ul>

        <div className="mt-8 max-w-[220px]">
          <GhostButton onClick={onSwitch}>Crea account</GhostButton>
        </div>
      </div>
    </div>
  )
}

function OverlayLeft({ onSwitch }: { onSwitch: () => void }) {
  return (
    <div className="auth-overlay-content auth-overlay-content--left absolute inset-0 flex flex-col justify-center px-10 lg:px-14">
      <OverlayDeco />
      <div className="relative">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
          <ChefHat className="h-7 w-7 text-white" />
        </div>
        <h2 className="text-3xl font-bold leading-tight text-white sm:text-4xl">
          Già un membro?
        </h2>
        <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-white/85">
          Accedi al tuo account e riprendi da dove avevi lasciato. Il tuo
          ristorante ti aspetta.
        </p>

        <ul className="mt-6 space-y-2.5">
          {['Dashboard sempre aggiornata', 'Ordini in tempo reale', 'Supporto 24/7'].map((t) => (
            <li key={t} className="flex items-center gap-2.5 text-sm text-white/90">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-white" />
              {t}
            </li>
          ))}
        </ul>

        <div className="mt-8 max-w-[220px]">
          <GhostButton onClick={onSwitch}>Accedi</GhostButton>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Mobile tab switcher (shown < lg, where the split layout collapses) */
/* ------------------------------------------------------------------ */

function MobileTabs({
  mode,
  setMode,
}: {
  mode: 'login' | 'signup'
  setMode: (m: 'login' | 'signup') => void
}) {
  const isSignup = mode === 'signup'
  return (
    <div
      className="relative flex rounded-xl p-1 lg:hidden"
      style={{ background: 'rgba(33,33,33,0.06)' }}
    >
      {/* Sliding thumb */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-1 left-1 rounded-lg transition-transform duration-500 ease-[cubic-bezier(.4,.14,.2,1.02)]"
        style={{
          width: 'calc(50% - 4px)',
          background: C.white,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 12px -6px rgba(255,107,0,0.25)',
          transform: isSignup ? 'translateX(100%)' : 'translateX(0)',
        }}
      />
      {(['login', 'signup'] as const).map((m) => {
        const active = mode === m
        return (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className="relative z-10 flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors duration-300"
            style={{ color: active ? C.orange : C.gray }}
          >
            <span
              className="inline-block transition-transform duration-500 ease-[cubic-bezier(.4,.14,.2,1.02)]"
              style={{ transform: active ? 'scale(1.04)' : 'scale(1)' }}
            >
              {m === 'login' ? 'Accedi' : 'Registrati'}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main auth page                                                    */
/* ------------------------------------------------------------------ */

export function AuthPage() {
  const [isSignup, setIsSignup] = useState(false)
  const [mobileMode, setMobileMode] = useState<'login' | 'signup'>('login')

  const toggle = () => {
    setIsSignup((v) => !v)
    setMobileMode((m) => (m === 'login' ? 'signup' : 'login'))
  }

  return (
    <main
      className="flex min-h-screen w-full flex-col"
      style={{
        background:
          'radial-gradient(1200px 600px at 15% 10%, #FFF7EE 0%, transparent 60%), radial-gradient(1000px 500px at 85% 90%, #FFE3D1 0%, transparent 55%), #F5F1E8',
      }}
    >
      {/* Top brand bar */}
      <header className="flex items-center justify-between px-6 py-5 lg:px-10">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-md"
            style={{ background: `linear-gradient(135deg, ${C.orange}, ${C.orangeDeep})` }}
          >
            <ChefHat className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight" style={{ color: C.ink }}>
            Tavola<span style={{ color: C.orange }}>.</span>
          </span>
        </div>
        <a
          href="#"
          className="text-sm font-medium transition-colors hover:underline"
          style={{ color: C.gray }}
        >
          Hai bisogno di aiuto?
        </a>
      </header>

      {/* Auth card */}
      <div className="flex flex-1 items-center justify-center px-4 pb-8 sm:px-6 lg:pb-12">
        <div
          className="auth-container relative w-full max-w-5xl overflow-hidden bg-white shadow-2xl shadow-[#FF3D00]/10 ring-1 ring-black/5 lg:h-[840px]"
          data-active={isSignup ? 'true' : 'false'}
          style={{ borderRadius: 24 }}
        >
          {/* ---------- Desktop split layout ---------- */}
          {/* Login form (left half) */}
          <div className="auth-form-panel auth-form-panel--login absolute left-0 top-0 hidden h-full w-1/2 lg:block">
            <div className="h-full w-full" style={{ background: C.cream }}>
              <LoginForm />
            </div>
          </div>

          {/* Signup form (right half) */}
          <div className="auth-form-panel auth-form-panel--signup absolute right-0 top-0 hidden h-full w-1/2 lg:block">
            <div className="h-full w-full" style={{ background: C.cream }}>
              <SignupForm />
            </div>
          </div>

          {/* Sliding overlay (desktop only) */}
          <div
            className="auth-overlay-panel pointer-events-none absolute right-0 top-0 hidden h-full w-1/2 lg:block"
            style={{
              background: `linear-gradient(160deg, ${C.orange} 0%, ${C.orangeDeep} 100%)`,
            }}
          >
            <div className="pointer-events-auto absolute inset-0 overflow-hidden">
              <OverlayRight onSwitch={toggle} />
              <OverlayLeft onSwitch={toggle} />
            </div>
          </div>

          {/* ---------- Mobile single-panel layout ---------- */}
          <div className="lg:hidden">
            <div className="px-5 pt-6">
              <MobileTabs mode={mobileMode} setMode={setMobileMode} />
            </div>
            <div className="auth-scroll max-h-[calc(100vh-220px)] overflow-y-auto px-5 pb-6 pt-4">
              {mobileMode === 'login' ? <LoginForm /> : <SignupForm />}
            </div>
          </div>
        </div>
      </div>

      {/* Footer (sticky to bottom) */}
      <footer
        className="mt-auto border-t px-6 py-4 text-center text-xs sm:px-10"
        style={{ borderColor: 'rgba(33,33,33,0.08)', color: C.gray }}
      >
        © {new Date().getFullYear()} Tavola. Tutti i diritti riservati · Made with{' '}
        <span style={{ color: C.orange }}>♥</span> in Italia
      </footer>
    </main>
  )
}

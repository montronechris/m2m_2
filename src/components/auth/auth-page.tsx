'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
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
  Ticket,
  RefreshCw,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  PasswordStrength,
  evaluatePassword,
} from '@/components/auth/password-strength'
import { StepProgress, type StepState } from '@/components/auth/step-progress'
import { supabase } from '@/lib/supabase'
import { getRestaurantByUser } from '@/lib/admin-service'
import { useI18n } from '@/components/i18n/I18nProvider'
import { loadPendingRestaurant, clearPendingRestaurant, loadPendingMenuFile, clearPendingMenuFile } from '@/lib/pending-restaurant'
import { importMenuFromFile } from '@/lib/menu-import'

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

function FieldLabel({ children, required, error }: { children: React.ReactNode; required?: boolean; error?: boolean }) {
  return (
    <label
      className="mb-1.5 block text-[13px] font-medium tracking-wide"
      style={{ color: error ? '#F44336' : C.gray }}
    >
      {children}
      {required && <span style={{ color: error ? '#F44336' : C.orange }} className="ml-0.5">*</span>}
    </label>
  )
}

function FieldError({ children }: { children: React.ReactNode }) {
  if (!children) return null
  return (
    <p className="mt-1.5 text-xs font-medium" style={{ color: '#F44336' }}>
      {children}
    </p>
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

function LoginForm({ onLoginSuccess }: { onLoginSuccess: (name: string | null) => void }) {
  const { toast } = useToast()
  const { tr } = useI18n()
  const t = tr.auth.login
  const [showPw, setShowPw] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

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
        toast({ variant: 'destructive', title: t.failedTitle, description: error.message })
        return
      }
      onLoginSuccess(data.user?.user_metadata?.full_name ?? null)
    } catch (err: any) {
      toast({ variant: 'destructive', title: t.networkErrorTitle, description: err?.message })
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
        {t.title}
      </div>

      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: C.ink }}>
        {t.submit}
      </h1>
      <p className="mt-2 text-[15px]" style={{ color: C.gray }}>
        {t.subtitle}
      </p>

      <div className="mt-7 space-y-4">
        <div>
          <FieldLabel>{t.email}</FieldLabel>
          <IconInput
            icon={<Mail className="h-4 w-4" />}
            type="email"
            name="email"
            placeholder={t.emailPlaceholder}
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <FieldLabel>{t.password}</FieldLabel>
          <IconInput
            icon={<Lock className="h-4 w-4" />}
            type={showPw ? 'text' : 'password'}
            name="password"
            placeholder={t.passwordPlaceholder}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            rightSlot={
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="shrink-0 rounded-md p-1 transition-colors hover:bg-black/5"
                style={{ color: C.gray }}
                aria-label={showPw ? t.hidePassword : t.showPassword}
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
          />
        </div>

        <div className="flex items-center justify-between pt-1">
          <label className="flex cursor-pointer items-center gap-2.5 text-sm select-none" style={{ color: C.gray }}>
            <button
              type="button"
              role="checkbox"
              aria-checked={rememberMe}
              onClick={() => setRememberMe((v) => !v)}
              className="auth-round-check flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200 ease-out active:scale-90"
              style={{
                borderColor: rememberMe ? C.orange : 'rgba(33,33,33,0.25)',
                background: rememberMe ? C.orange : 'transparent',
                boxShadow: rememberMe ? '0 0 0 4px rgba(255,107,0,0.15)' : 'none',
              }}
            >
              <Check
                className="auth-round-check-icon h-3 w-3 text-white"
                strokeWidth={3.5}
                style={{
                  opacity: rememberMe ? 1 : 0,
                  transform: rememberMe ? 'scale(1)' : 'scale(0.4)',
                }}
              />
            </button>
            {t.rememberMe}
          </label>
          <a
            href="#"
            className="text-sm font-semibold transition-colors hover:underline"
            style={{ color: C.orange }}
          >
            {t.forgotPassword}
          </a>
        </div>

        <div className="pt-2">
          <PrimaryButton type="submit" loading={loading} loadingText={t.submitting}>
            {t.submit}
          </PrimaryButton>
        </div>

        <div className="flex items-center gap-3 py-2">
          <div className="h-px flex-1" style={{ background: 'rgba(33,33,33,0.1)' }} />
          <span className="text-xs uppercase tracking-wider" style={{ color: C.gray }}>
            {t.or}
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
        {t.secureAccess}
      </div>
    </form>
  )
}

function SignupForm({ onSignupSuccess }: { onSignupSuccess: (name: string | null) => void }) {
  const { toast } = useToast()
  const { tr } = useI18n()
  const t = tr.auth.signup
  const [showPw, setShowPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [emailTaken, setEmailTaken] = useState(false)
  const [phoneTaken, setPhoneTaken] = useState(false)

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
    { id: 'name', label: t.name, done: name.trim().length >= 2 },
    {
      id: 'email',
      label: t.steps.email,
      done: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    },
    { id: 'password', label: t.steps.password, done: allPassed },
    { id: 'confirm', label: t.steps.confirm, done: passwordsMatch },
  ]

  // --- per-field inline errors (shown after first submit attempt) ---
  const nameError = submitted && name.trim().length === 0
  const emailError = submitted && email.trim().length === 0
  const passwordError = submitted && password.length === 0
  const confirmError = submitted && confirm.length === 0
  const isValidPhone = (value: string) => /^\+?[0-9()\s-]{7,20}$/.test(value) && value.replace(/\D/g, '').length >= 7
  const phoneError = submitted && phone.trim().length > 0 && !isValidPhone(phone.trim())
  const termsError = submitted && !termsAccepted

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return

    // Mark as submitted to trigger inline validation
    setSubmitted(true)

    // Check required fields first
    const hasEmptyFields = !name.trim() || !email.trim() || !password || !confirm
    if (hasEmptyFields) return

    if (phone.trim().length > 0 && !isValidPhone(phone.trim())) return

    if (!termsAccepted) return

    setEmailTaken(false)
    setPhoneTaken(false)
    try {
      const availabilityRes = await fetch('/api/auth/check-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), phone: phone.trim() || undefined }),
      })
      const availability = await availabilityRes.json().catch(() => ({}))
      if (availabilityRes.ok) {
        if (availability.emailTaken) {
          setEmailTaken(true)
          return
        }
        if (availability.phoneTaken) {
          setPhoneTaken(true)
          return
        }
      }
    } catch {
      // Se il controllo fallisce per un problema di rete, si prosegue: l'errore
      // di duplicato verrà comunque intercettato dal backend in fase di creazione.
    }

    // Only show password toast if password is filled but insecure
    if (!allPassed) {
      toast({
        variant: 'destructive',
        title: t.insecurePasswordTitle,
        description: t.insecurePasswordDesc,
      })
      return
    }
    if (password !== confirm) {
      toast({
        variant: 'destructive',
        title: t.mismatchToastTitle,
        description: t.mismatchToastDesc,
      })
      return
    }
    setLoading(true)
    setInviteError(null)

    if (inviteCode.trim()) {
      try {
        const nameParts = name.trim().split(/\s+/)
        const firstName = nameParts[0] || name.trim()
        const lastName = nameParts.slice(1).join(' ') || firstName

        const res = await fetch('/api/register-staff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.trim(),
            password,
            firstName,
            lastName,
            secretCode: inviteCode.trim(),
          }),
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) {
          setInviteError(json.error || t.failedTitle)
          toast({ variant: 'destructive', title: t.failedTitle, description: json.error })
          return
        }
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (signInError) {
          toast({ variant: 'destructive', title: t.failedTitle, description: signInError.message })
          return
        }
        toast({ title: t.accountCreatedTitle, description: t.redirectingDesc })
        window.location.href = '/admin/dashboard'
        return
      } catch (err: any) {
        toast({ variant: 'destructive', title: t.networkErrorTitle, description: err?.message })
        return
      } finally {
        setLoading(false)
      }
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: name.trim(), phone: phone.trim() || null } },
      })
      if (error) {
        toast({ variant: 'destructive', title: t.failedTitle, description: error.message })
        return
      }
      if (data.session) {
        toast({ title: t.accountCreatedTitle, description: t.redirectingDesc })
        onSignupSuccess(name.trim() || null)
        return
      }
      toast({
        title: t.accountCreatedTitle,
        description: t.checkEmailDesc,
      })
      setName('')
      setEmail('')
      setPhone('')
      setPassword('')
      setConfirm('')
      setSubmitted(false)
    } catch (err: any) {
      toast({ variant: 'destructive', title: t.networkErrorTitle, description: err?.message })
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
        {t.title}
      </div>

      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: C.ink }}>
        {t.submit}
      </h1>
      <p className="mt-2 text-[15px]" style={{ color: C.gray }}>
        {t.subtitle}
      </p>

      {/* Step progress indicator */}
      <div className="mt-5">
        <StepProgress steps={steps} />
      </div>

      <div className="mt-5 space-y-4">
        <div>
          <FieldLabel required error={nameError}>{t.name}</FieldLabel>
          <IconInput
            icon={<User className="h-4 w-4" />}
            type="text"
            name="name"
            placeholder={t.namePlaceholder}
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            state={nameError ? 'invalid' : name.trim().length >= 2 ? 'valid' : 'default'}
          />
          <FieldError>{nameError ? t.nameErrorMsg : undefined}</FieldError>
        </div>
        <div>
          <FieldLabel required error={emailError || emailTaken}>{t.email}</FieldLabel>
          <IconInput
            icon={<Mail className="h-4 w-4" />}
            type="email"
            name="email"
            placeholder={t.emailPlaceholder}
            autoComplete="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setEmailTaken(false) }}
            state={
              emailError || emailTaken
                ? 'invalid'
                : email.length > 0
                  ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
                    ? 'valid'
                    : 'invalid'
                  : 'default'
            }
          />
          <FieldError>{emailError ? t.emailErrorMsg : emailTaken ? t.emailTakenErrorMsg : undefined}</FieldError>
        </div>
        <div>
          <FieldLabel error={phoneError || phoneTaken}>
            {t.phoneLabel} <span style={{ color: C.gray, fontWeight: 400 }}>{t.phoneOptional}</span>
          </FieldLabel>
          <IconInput
            icon={<Phone className="h-4 w-4" />}
            type="tel"
            name="phone"
            placeholder={t.phonePlaceholder}
            autoComplete="tel"
            value={phone}
            onChange={(e) => { setPhone(e.target.value); setPhoneTaken(false) }}
          />
          <FieldError>{phoneError ? t.phoneErrorMsg : phoneTaken ? t.phoneTakenErrorMsg : undefined}</FieldError>
        </div>
        <div>
          <FieldLabel>
            {t.inviteCodeLabel} <span style={{ color: C.gray, fontWeight: 400 }}>{t.inviteCodeOptional}</span>
          </FieldLabel>
          <IconInput
            icon={<Ticket className="h-4 w-4" />}
            type="text"
            name="inviteCode"
            placeholder={t.inviteCodePlaceholder}
            autoComplete="off"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
          />
          {inviteError && <FieldError>{inviteError}</FieldError>}
        </div>
        <div>
          <FieldLabel required error={passwordError}>{t.password}</FieldLabel>
          <IconInput
            icon={<Lock className="h-4 w-4" />}
            type={showPw ? 'text' : 'password'}
            name="password"
            placeholder={t.passwordPlaceholder}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            state={passwordError ? 'invalid' : password.length > 0 && allPassed ? 'valid' : 'default'}
            rightSlot={
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="shrink-0 rounded-md p-1 transition-colors hover:bg-black/5"
                style={{ color: C.gray }}
                aria-label={showPw ? tr.auth.login.hidePassword : tr.auth.login.showPassword}
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
          />
          <PasswordStrength password={password} />
          <FieldError>{passwordError ? t.passwordErrorMsg : undefined}</FieldError>
        </div>
        <div>
          <FieldLabel required error={confirmError}>{t.confirmPassword}</FieldLabel>
          <IconInput
            icon={<Lock className="h-4 w-4" />}
            type={showConfirmPw ? 'text' : 'password'}
            name="confirmPassword"
            placeholder={t.confirmPasswordPlaceholder}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            state={confirmError ? 'invalid' : confirmState}
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
                  aria-label={showConfirmPw ? tr.auth.login.hidePassword : tr.auth.login.showPassword}
                >
                  {showConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </>
            }
          />
          <FieldError>{confirmError ? t.confirmErrorMsg : confirmMismatch ? t.mismatchErrorMsg : undefined}</FieldError>
          {passwordsMatch && !confirmError && (
            <p className="mt-1.5 text-xs font-medium" style={{ color: C.green }}>
              {t.passwordsMatchMsg}
            </p>
          )}
        </div>

        <label className="flex cursor-pointer items-start gap-2.5 pt-1 text-sm select-none" style={{ color: C.gray }}>
          <button
            type="button"
            role="checkbox"
            aria-checked={termsAccepted}
            onClick={() => setTermsAccepted((v) => !v)}
            className="auth-round-check mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200 ease-out active:scale-90"
            style={{
              borderColor: termsAccepted ? C.orange : termsError ? '#F44336' : 'rgba(33,33,33,0.25)',
              background: termsAccepted ? C.orange : 'transparent',
              boxShadow: termsAccepted ? '0 0 0 4px rgba(255,107,0,0.15)' : 'none',
            }}
          >
            <Check
              className="auth-round-check-icon h-3 w-3 text-white"
              strokeWidth={3.5}
              style={{
                opacity: termsAccepted ? 1 : 0,
                transform: termsAccepted ? 'scale(1)' : 'scale(0.4)',
              }}
            />
          </button>
          <span>
            {t.termsPrefix}{' '}
            <a href="#" className="font-semibold hover:underline" style={{ color: C.orange }}>
              {t.termsOfService}
            </a>{' '}
            {t.termsAnd}{' '}
            <a href="#" className="font-semibold hover:underline" style={{ color: C.orange }}>
              {t.privacyPolicy}
            </a>
          </span>
        </label>
        <FieldError>{termsError ? t.termsErrorMsg : undefined}</FieldError>

        <div className="pt-1">
          <PrimaryButton type="submit" loading={loading} loadingText={t.submitting}>
            {t.submit}
          </PrimaryButton>
        </div>
      </div>

      <div
        className="mt-6 flex items-center justify-center gap-2 text-xs"
        style={{ color: C.gray }}
      >
        <CheckCircle2 className="h-3.5 w-3.5" style={{ color: C.green }} />
        {t.freeTrial}
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
  const { tr } = useI18n()
  const t = tr.auth.overlay
  return (
    <div className="auth-overlay-content auth-overlay-content--right absolute inset-0 flex flex-col justify-center pl-[16%] pr-8 lg:pr-12">
      <OverlayDeco />
      <div className="relative">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
          <ChefHat className="h-7 w-7 text-white" />
        </div>
        <h2 className="text-3xl font-bold leading-tight text-white sm:text-4xl">
          {t.rightTitle}
        </h2>
        <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-white/85">
          {t.rightDesc}
        </p>

        <ul className="mt-6 space-y-2.5">
          {t.rightFeatures.map((f) => (
            <li key={f} className="flex items-center gap-2.5 text-sm text-white/90">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-white" />
              {f}
            </li>
          ))}
        </ul>

        <div className="mt-8 max-w-[220px]">
          <GhostButton onClick={onSwitch}>{t.rightCta}</GhostButton>
        </div>
      </div>
    </div>
  )
}

function OverlayLeft({ onSwitch }: { onSwitch: () => void }) {
  const { tr } = useI18n()
  const t = tr.auth.overlay
  return (
    <div className="auth-overlay-content auth-overlay-content--left absolute inset-0 flex flex-col justify-center pl-8 lg:pl-12 pr-[16%]">
      <OverlayDeco />
      <div className="relative">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
          <ChefHat className="h-7 w-7 text-white" />
        </div>
        <h2 className="text-3xl font-bold leading-tight text-white sm:text-4xl">
          {t.leftTitle}
        </h2>
        <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-white/85">
          {t.leftDesc}
        </p>

        <ul className="mt-6 space-y-2.5">
          {t.leftFeatures.map((f) => (
            <li key={f} className="flex items-center gap-2.5 text-sm text-white/90">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-white" />
              {f}
            </li>
          ))}
        </ul>

        <div className="mt-8 max-w-[220px]">
          <GhostButton onClick={onSwitch}>{t.leftCta}</GhostButton>
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
  const { tr } = useI18n()
  const t = tr.auth.mobileTabs
  return (
    <div
      className="relative flex rounded-xl p-1 lg:hidden"
      style={{ background: 'rgba(33,33,33,0.06)' }}
    >
      <div
        className="absolute inset-y-1 w-[calc(50%-4px)] rounded-lg transition-transform duration-300 ease-out"
        style={{
          background: C.white,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          transform: mode === 'login' ? 'translateX(0)' : 'translateX(calc(100% + 8px))',
        }}
      />
      {(['login', 'signup'] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => setMode(m)}
          className="relative z-10 flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors duration-300"
          style={{ color: mode === m ? C.orange : C.gray }}
        >
          {m === 'login' ? t.login : t.signup}
        </button>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main auth page                                                    */
/* ------------------------------------------------------------------ */

export function AuthPage() {
  const { tr } = useI18n()
  const searchParams = useSearchParams()
  const needsAccountForRestaurant = searchParams.get('next') === 'create-pending'
  const cameFromNoRestaurant = searchParams.get('error') === 'no-restaurant'
  const [isSignup, setIsSignup] = useState(needsAccountForRestaurant)
  const [mobileMode, setMobileMode] = useState<'login' | 'signup'>(needsAccountForRestaurant ? 'signup' : 'login')
  const [redirecting, setRedirecting] = useState(cameFromNoRestaurant)
  const [cameFrom, setCameFrom] = useState('/')

  useEffect(() => {
    try {
      if (document.referrer) {
        const ref = new URL(document.referrer)
        if (ref.origin === window.location.origin && ref.pathname !== '/login') {
          setCameFrom(ref.pathname)
        }
      }
    } catch {}
  }, [])

  // Landed here already authenticated (e.g. dashboard redirected because there's no restaurant yet)
  useEffect(() => {
    if (!cameFromNoRestaurant) return
    let cancelled = false
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled || !data.user) {
        if (!cancelled) setRedirecting(false)
        return
      }
      getRestaurantByUser()
        .then(() => { if (!cancelled) window.location.href = '/admin/dashboard' })
        .catch(() => { if (!cancelled) window.location.href = '/create' })
    })
    return () => { cancelled = true }
  }, [cameFromNoRestaurant])

  const toggle = () => {
    setIsSignup((v) => !v)
    setMobileMode((m) => (m === 'login' ? 'signup' : 'login'))
  }

  const handleLoginSuccess = async (name: string | null) => {
    const pending = loadPendingRestaurant()
    if (pending) {
      setRedirecting(true)
      try {
        const res = await fetch('/api/restaurants/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: pending.name,
            city: pending.city,
            logoIcon: pending.logoIcon,
            establishmentType: pending.establishmentType,
            establishmentTypeCustom: pending.establishmentTypeCustom,
          }),
        })
        const body = await res.json().catch(() => ({}))
        clearPendingRestaurant()
        if (res.ok) {
          // Importa il menu caricato durante la registrazione, ora che l'utente
          // è autenticato e il ristorante esiste (stessa logica di /create e MenuSection).
          const newRestaurantId = body?.restaurantId ?? body?.id ?? body?.restaurant?.id ?? null
          const menuFile = await loadPendingMenuFile()
          if (newRestaurantId && menuFile) {
            try {
              await importMenuFromFile(newRestaurantId, menuFile)
            } catch {
              // import fallito — l'utente potrà ricaricare il menu dalla dashboard
            }
          }
          await clearPendingMenuFile()
          window.location.href = '/admin/dashboard'
          return
        }
        // creazione ristorante fallita: non trasciniamo il file orfano.
        await clearPendingMenuFile()
      } catch {
        clearPendingRestaurant()
        await clearPendingMenuFile()
      }
      setRedirecting(false)
      return
    }

    setRedirecting(true)
    try {
      await getRestaurantByUser()
      window.location.href = '/admin/dashboard'
    } catch {
      window.location.href = cameFrom
    }
  }

  if (redirecting) {
    return (
      <main className="flex min-h-screen w-full items-center justify-center bg-[#F5F1E8]">
        <div className="flex flex-col items-center gap-3">
          <svg className="size-8 animate-spin" viewBox="0 0 24 24" fill="none" style={{ color: C.orange }}>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      </main>
    )
  }

  return (
    <main className={`relative min-h-screen w-full overflow-hidden bg-[#F5F1E8] ${needsAccountForRestaurant ? 'pt-[46px]' : ''}`}>
      {needsAccountForRestaurant && (
        <div
          className="fixed inset-x-0 top-0 z-50 px-4 py-3 text-center text-sm font-semibold text-white shadow-md"
          style={{ background: '#F44336' }}
        >
          Devi creare un account per completare la creazione del tuo locale. I dati inseriti andranno persi se non completi la registrazione.
        </div>
      )}
      {/* ---------- Desktop split layout (full-screen, no card) ---------- */}
      <div
        className={`auth-container relative hidden w-full lg:block ${needsAccountForRestaurant ? '' : 'h-screen'}`}
        data-active={isSignup ? 'true' : 'false'}
        style={needsAccountForRestaurant ? { height: 'calc(100vh - 46px)' } : undefined}
      >
        {/* Login form (left half) */}
        <div className="auth-form-panel auth-form-panel--login absolute left-0 top-0 h-full w-1/2">
          <div className="h-full w-full" style={{ background: C.cream }}>
            <LoginForm onLoginSuccess={handleLoginSuccess} />
          </div>
        </div>

        {/* Signup form (right half) */}
        <div className="auth-form-panel auth-form-panel--signup absolute right-0 top-0 h-full w-1/2">
          <div className="h-full w-full" style={{ background: C.cream }}>
            <SignupForm onSignupSuccess={handleLoginSuccess} />
          </div>
        </div>

        {/* Sliding overlay */}
        <div
          className="auth-overlay-panel pointer-events-none absolute right-0 top-0 h-full w-1/2"
          style={{
            background: `linear-gradient(160deg, ${C.orange} 0%, ${C.orangeDeep} 100%)`,
          }}
        >
          <div className="pointer-events-auto absolute inset-0 overflow-hidden">
            <OverlayRight onSwitch={toggle} />
            <OverlayLeft onSwitch={toggle} />
          </div>
        </div>

        {/* Brand logo — fixed top-left overlay */}
        <div className="pointer-events-none absolute left-8 top-6 z-20 flex items-center gap-2.5">
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

        {/* Footer — fixed bottom overlay on the cream (form) side */}
        <div
          className="pointer-events-none absolute bottom-4 left-0 z-20 w-1/2 px-8 text-center text-xs lg:px-14"
          style={{ color: C.gray }}
        >
          © {new Date().getFullYear()} Tavola. {tr.auth.login.footerRights} · Made with{' '}
          <span style={{ color: C.orange }}>♥</span> in Italia
        </div>
      </div>

      {/* ---------- Mobile single-panel layout (full-screen, no card) ---------- */}
      <div className="flex min-h-screen w-full flex-col lg:hidden">
        {/* Brand bar */}
        <header className="flex items-center justify-between px-6 py-5">
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
            {tr.auth.login.helpLink}
          </a>
        </header>

        <div className="px-5 pt-2">
          <MobileTabs mode={mobileMode} setMode={setMobileMode} />
        </div>
        <div className="auth-scroll flex-1 overflow-y-auto px-5 pb-6 pt-4">
          <div key={mobileMode} className="auth-mobile-fade">
            {mobileMode === 'login' ? <LoginForm onLoginSuccess={handleLoginSuccess} /> : <SignupForm onSignupSuccess={handleLoginSuccess} />}
          </div>
        </div>

        <footer
          className="border-t px-6 py-4 text-center text-xs"
          style={{ borderColor: 'rgba(33,33,33,0.08)', color: C.gray }}
        >
          © {new Date().getFullYear()} Tavola. {tr.auth.login.footerRights} · Made with{' '}
          <span style={{ color: C.orange }}>♥</span> in Italia
        </footer>
      </div>
    </main>
  )
}
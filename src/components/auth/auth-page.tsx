'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
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
  inputMode,
  maxLength,
  autoFocus,
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
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
  maxLength?: number
  autoFocus?: boolean
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
        inputMode={inputMode}
        maxLength={maxLength}
        autoFocus={autoFocus}
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
  const handleOAuth = async (provider: 'google' | 'facebook') => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        type="button"
        onClick={() => handleOAuth('google')}
        className="flex items-center justify-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-medium transition-all hover:border-[#FF6B00]/40 hover:shadow-sm"
        style={{ borderColor: 'rgba(33,33,33,0.12)', color: C.ink }}
      >
        <GoogleIcon />
        Google
      </button>
      <button
        type="button"
        onClick={() => handleOAuth('facebook')}
        className="flex items-center justify-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-medium transition-all hover:border-[#FF6B00]/40 hover:shadow-sm"
        style={{ borderColor: 'rgba(33,33,33,0.12)', color: C.ink }}
      >
        <FacebookIcon />
        Facebook
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

function FacebookIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path
        fill="#1877F2"
        d="M24 12.07C24 5.41 18.63 0 12 0S0 5.41 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.95.93-1.95 1.89v2.25h3.32l-.53 3.49h-2.79V24C19.61 23.09 24 18.1 24 12.07Z"
      />
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
  // Step 2FA: attivo quando l'account ha un fattore TOTP verificato.
  const [mfaRequired, setMfaRequired] = useState(false)
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null)
  const [mfaCode, setMfaCode] = useState('')
  const [pendingName, setPendingName] = useState<string | null>(null)
  // Step 2FA via email (canale applicativo opzionale, attivabile dal profilo).
  const [emailOtpRequired, setEmailOtpRequired] = useState(false)
  const [emailOtpCode, setEmailOtpCode] = useState('')
  const [otpResending, setOtpResending] = useState(false)

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
        // Supabase applica un rate limit lato server: mostriamo un messaggio
        // dedicato invece dell'errore grezzo quando scatta il 429.
        const isRateLimit =
          (error as any).status === 429 || /rate limit|too many/i.test(error.message)
        toast({
          variant: 'destructive',
          title: isRateLimit ? t.rateLimitTitle : t.failedTitle,
          description: isRateLimit ? t.rateLimitDesc : error.message,
        })
        return
      }
      const name = data.user?.user_metadata?.full_name ?? null
      // Se l'account ha la 2FA attiva, Supabase richiede di elevare la sessione
      // ad aal2: mostriamo lo step per il codice invece di completare subito.
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (aal && aal.nextLevel === 'aal2' && aal.nextLevel !== aal.currentLevel) {
        const { data: factors } = await supabase.auth.mfa.listFactors()
        const totp = factors?.totp?.find((f) => f.status === 'verified')
        if (totp) {
          setPendingName(name)
          setMfaFactorId(totp.id)
          setMfaCode('')
          setMfaRequired(true)
          return
        }
      }
      // 2FA via email (opzionale, attivata dal profilo). A differenza della TOTP,
      // e' un secondo fattore a livello applicativo: chiudiamo la sessione ottenuta
      // con la password e la ristabiliamo solo dopo la verifica del codice email.
      const uid = data.user?.id
      if (uid) {
        const { data: prefs } = await supabase
          .from('user_security_prefs')
          .select('email_2fa_enabled')
          .eq('user_id', uid)
          .maybeSingle()
        if (prefs?.email_2fa_enabled) {
          setPendingName(name)
          await supabase.auth.signOut()
          const { error: otpErr } = await supabase.auth.signInWithOtp({
            email: email.trim(),
            options: { shouldCreateUser: false },
          })
          if (otpErr) {
            const isRateLimit =
              (otpErr as any).status === 429 || /rate limit|too many/i.test(otpErr.message)
            toast({
              variant: 'destructive',
              title: isRateLimit ? t.rateLimitTitle : t.failedTitle,
              description: isRateLimit ? t.rateLimitDesc : otpErr.message,
            })
            return
          }
          setEmailOtpCode('')
          setEmailOtpRequired(true)
          return
        }
      }
      onLoginSuccess(name)
    } catch (err: any) {
      toast({ variant: 'destructive', title: t.networkErrorTitle, description: err?.message })
    } finally {
      setLoading(false)
    }
  }

  const handleEmailOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: emailOtpCode.trim(),
        type: 'email',
      })
      if (error) {
        const isRateLimit =
          (error as any).status === 429 || /rate limit|too many/i.test(error.message)
        toast({
          variant: 'destructive',
          title: isRateLimit ? t.rateLimitTitle : t.failedTitle,
          description: isRateLimit ? t.rateLimitDesc : t.otpInvalid,
        })
        return
      }
      onLoginSuccess(pendingName)
    } catch (err: any) {
      toast({ variant: 'destructive', title: t.networkErrorTitle, description: err?.message })
    } finally {
      setLoading(false)
    }
  }

  const handleEmailOtpResend = async () => {
    if (otpResending) return
    setOtpResending(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: false },
      })
      if (error) {
        const isRateLimit =
          (error as any).status === 429 || /rate limit|too many/i.test(error.message)
        toast({
          variant: 'destructive',
          title: isRateLimit ? t.rateLimitTitle : t.failedTitle,
          description: isRateLimit ? t.rateLimitDesc : error.message,
        })
        return
      }
      toast({ title: t.otpResentTitle, description: t.otpResentDesc })
    } catch (err: any) {
      toast({ variant: 'destructive', title: t.networkErrorTitle, description: err?.message })
    } finally {
      setOtpResending(false)
    }
  }

  const handleEmailOtpBack = () => {
    setEmailOtpRequired(false)
    setEmailOtpCode('')
    setPendingName(null)
  }

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading || !mfaFactorId) return
    setLoading(true)
    try {
      const { data: challenge, error: chErr } = await supabase.auth.mfa.challenge({
        factorId: mfaFactorId,
      })
      if (chErr) throw chErr
      const { error } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: challenge.id,
        code: mfaCode.trim(),
      })
      if (error) {
        const isRateLimit =
          (error as any).status === 429 || /rate limit|too many/i.test(error.message)
        toast({
          variant: 'destructive',
          title: isRateLimit ? t.rateLimitTitle : t.failedTitle,
          description: isRateLimit ? t.rateLimitDesc : t.mfaInvalid,
        })
        return
      }
      onLoginSuccess(pendingName)
    } catch (err: any) {
      toast({ variant: 'destructive', title: t.networkErrorTitle, description: err?.message })
    } finally {
      setLoading(false)
    }
  }

  const handleMfaBack = async () => {
    // Torna al form: annulla la sessione parziale così un nuovo login riparte pulito.
    try {
      await supabase.auth.signOut()
    } catch {
      /* noop */
    }
    setMfaRequired(false)
    setMfaFactorId(null)
    setMfaCode('')
    setPassword('')
  }

  if (emailOtpRequired) {
    return (
      <form
        className="flex h-full w-full flex-col justify-center px-8 sm:px-10 lg:px-14"
        onSubmit={handleEmailOtpVerify}
      >
        <div
          className="mb-5 inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
          style={{ backgroundColor: C.peach, color: C.orange }}
        >
          <Mail className="h-4 w-4" />
          {t.otpBadge}
        </div>

        <h1
          className="text-3xl font-bold tracking-tight sm:text-4xl"
          style={{ color: C.ink }}
        >
          {t.otpTitle}
        </h1>
        <p className="mt-2 text-[15px]" style={{ color: C.gray }}>
          {t.otpSubtitle}{' '}
          <span className="font-semibold" style={{ color: C.ink }}>
            {email.trim()}
          </span>
        </p>

        <div className="mt-7">
          <IconInput
            icon={<ShieldCheck className="h-4 w-4" />}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder={t.otpCodePlaceholder}
            value={emailOtpCode}
            onChange={(e) => setEmailOtpCode(e.target.value.replace(/\D/g, ''))}
            autoFocus
          />
        </div>

        <div className="mt-6">
          <PrimaryButton type="submit" loading={loading} loadingText={t.otpVerifying}>
            {t.otpVerify}
          </PrimaryButton>
        </div>

        <button
          type="button"
          onClick={handleEmailOtpResend}
          disabled={otpResending}
          className="mt-4 inline-flex items-center gap-2 self-start text-sm font-semibold transition hover:opacity-70 disabled:opacity-50"
          style={{ color: C.orange }}
        >
          <RefreshCw className={`h-4 w-4 ${otpResending ? 'animate-spin' : ''}`} />
          {t.otpResend}
        </button>

        <button
          type="button"
          onClick={handleEmailOtpBack}
          className="mt-3 self-start text-sm font-semibold transition hover:opacity-70"
          style={{ color: C.gray }}
        >
          ← {t.otpBack}
        </button>
      </form>
    )
  }

  if (mfaRequired) {
    return (
      <form
        className="flex h-full w-full flex-col justify-center px-8 sm:px-10 lg:px-14"
        onSubmit={handleMfaVerify}
      >
        <div
          className="mb-5 inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
          style={{ background: 'rgba(255,107,0,0.1)', color: C.orange }}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          {t.mfaTitle}
        </div>

        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: C.ink }}>
          {t.mfaTitle}
        </h1>
        <p className="mt-2 text-[15px]" style={{ color: C.gray }}>
          {t.mfaSubtitle}
        </p>

        <div className="mt-7">
          <IconInput
            icon={<ShieldCheck className="h-4 w-4" />}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder={t.mfaCodePlaceholder}
            value={mfaCode}
            onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
            autoFocus
          />
        </div>

        <div className="mt-6">
          <PrimaryButton type="submit" loading={loading} loadingText={t.mfaVerifying}>
            {t.mfaVerify}
          </PrimaryButton>
        </div>

        <button
          type="button"
          onClick={handleMfaBack}
          className="mt-4 text-sm font-semibold transition hover:opacity-70"
          style={{ color: C.gray }}
        >
          ← {t.mfaBack}
        </button>
      </form>
    )
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
  const [signupOtpRequired, setSignupOtpRequired] = useState(false)
  const [signupOtpCode, setSignupOtpCode] = useState('')
  const [otpResending, setOtpResending] = useState(false)

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
      // Nessuna sessione: è richiesta la verifica via email tramite codice OTP.
      setSignupOtpCode('')
      setSignupOtpRequired(true)
    } catch (err: any) {
      toast({ variant: 'destructive', title: t.networkErrorTitle, description: err?.message })
    } finally {
      setLoading(false)
    }
  }

  const handleSignupOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: signupOtpCode.trim(),
        type: 'signup',
      })
      if (error) {
        const isRateLimit =
          (error as any).status === 429 || /rate limit|too many/i.test(error.message)
        toast({
          variant: 'destructive',
          title: isRateLimit ? t.rateLimitTitle : t.failedTitle,
          description: isRateLimit ? t.rateLimitDesc : t.otpInvalid,
        })
        return
      }
      if (data.session) {
        toast({ title: t.accountCreatedTitle, description: t.redirectingDesc })
        onSignupSuccess(name.trim() || null)
        return
      }
      toast({ variant: 'destructive', title: t.failedTitle, description: t.otpInvalid })
    } catch (err: any) {
      toast({ variant: 'destructive', title: t.networkErrorTitle, description: err?.message })
    } finally {
      setLoading(false)
    }
  }

  const handleSignupOtpResend = async () => {
    if (otpResending) return
    setOtpResending(true)
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
      })
      if (error) {
        const isRateLimit =
          (error as any).status === 429 || /rate limit|too many/i.test(error.message)
        toast({
          variant: 'destructive',
          title: isRateLimit ? t.rateLimitTitle : t.failedTitle,
          description: isRateLimit ? t.rateLimitDesc : error.message,
        })
        return
      }
      toast({ title: t.otpResentTitle, description: t.otpResentDesc })
    } catch (err: any) {
      toast({ variant: 'destructive', title: t.networkErrorTitle, description: err?.message })
    } finally {
      setOtpResending(false)
    }
  }

  const handleSignupOtpBack = () => {
    setSignupOtpRequired(false)
    setSignupOtpCode('')
  }

  if (signupOtpRequired) {
    return (
      <form
        className="flex h-full w-full flex-col justify-center px-8 sm:px-10 lg:px-14"
        onSubmit={handleSignupOtpVerify}
      >
        <div
          className="mb-5 inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
          style={{ backgroundColor: C.peach, color: C.orange }}
        >
          <Mail className="h-4 w-4" />
          {t.otpBadge}
        </div>

        <h1
          className="text-3xl font-bold tracking-tight sm:text-4xl"
          style={{ color: C.ink }}
        >
          {t.otpTitle}
        </h1>
        <p className="mt-2 text-[15px]" style={{ color: C.gray }}>
          {t.otpSubtitle}{' '}
          <span className="font-semibold" style={{ color: C.ink }}>
            {email.trim()}
          </span>
        </p>

        <div className="mt-7">
          <IconInput
            icon={<ShieldCheck className="h-4 w-4" />}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder={t.otpCodePlaceholder}
            value={signupOtpCode}
            onChange={(e) => setSignupOtpCode(e.target.value.replace(/\D/g, ''))}
            autoFocus
          />
        </div>

        <div className="mt-6">
          <PrimaryButton type="submit" loading={loading} loadingText={t.otpVerifying}>
            {t.otpVerify}
          </PrimaryButton>
        </div>

        <button
          type="button"
          onClick={handleSignupOtpResend}
          disabled={otpResending}
          className="mt-4 inline-flex items-center gap-2 self-start text-sm font-semibold transition hover:opacity-70 disabled:opacity-50"
          style={{ color: C.orange }}
        >
          <RefreshCw className={`h-4 w-4 ${otpResending ? 'animate-spin' : ''}`} />
          {t.otpResend}
        </button>

        <button
          type="button"
          onClick={handleSignupOtpBack}
          className="mt-3 self-start text-sm font-semibold transition hover:opacity-70"
          style={{ color: C.gray }}
        >
          ← {t.otpBack}
        </button>
      </form>
    )
  }

  return (
    <form
      className="auth-scroll flex h-full w-full flex-col overflow-y-auto py-8 px-8 sm:px-10 lg:px-14"
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

        <div className="flex items-center gap-3 py-2">
          <div className="h-px flex-1" style={{ background: 'rgba(33,33,33,0.1)' }} />
          <span className="text-xs uppercase tracking-wider" style={{ color: C.gray }}>
            {tr.auth.login.or}
          </span>
          <div className="h-px flex-1" style={{ background: 'rgba(33,33,33,0.1)' }} />
        </div>

        <SocialButtons />
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
  const { toast } = useToast()
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

  // Ritorno dal login OAuth (Google/Facebook): la callback ci rimanda qui con
  // ?error=no-restaurant dopo aver stabilito la sessione, perché la scelta della
  // destinazione dipende dallo stato del profilo/ristorante lato applicazione.
  useEffect(() => {
    if (!cameFromNoRestaurant) return
    let cancelled = false
    supabase.auth.getUser().then(async ({ data }) => {
      if (cancelled || !data.user) {
        if (!cancelled) setRedirecting(false)
        return
      }
      // Se l'utente ha completato il wizard /create e poi ha scelto l'accesso
      // con Google/Facebook, il ristorante non è ancora stato creato: lo creiamo
      // ora con lo stesso flusso del login via email prima di andare in dashboard.
      if (loadPendingRestaurant()) {
        const name = (data.user.user_metadata?.full_name as string | undefined) ?? null
        await handleLoginSuccess(name)
        return
      }
      getRestaurantByUser()
        .then(() => { if (!cancelled) window.location.href = '/admin/dashboard' })
        .catch((err: Error & { status?: number }) => {
          if (cancelled) return
          const message = err?.message || ''
          // Un titolare con profilo ma senza ristorante ("Ristorante non trovato")
          // e un utente OAuth appena registrato senza profilo ("Profilo non trovato")
          // vanno entrambi all'onboarding /create invece di essere disconnessi.
          const needsOnboarding =
            err?.status === 404 &&
            (message === 'Ristorante non trovato' || message === 'Profilo non trovato')
          if (needsOnboarding) {
            window.location.href = '/create'
            return
          }
          // Nessuna sessione valida (es. 401): chiudi la sessione stantia e mostra
          // il form di login su /login.
          void supabase.auth.signOut().catch(() => {})
          setRedirecting(false)
        })
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameFromNoRestaurant])

  const toggle = () => {
    setIsSignup((v) => !v)
    setMobileMode((m) => (m === 'login' ? 'signup' : 'login'))
  }

  const handleLoginSuccess = async (name: string | null) => {
    const pending = loadPendingRestaurant()
    if (pending) {
      setRedirecting(true)
      const createRestaurant = () =>
        fetch('/api/restaurants/create', {
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
      try {
        let res = await createRestaurant()
        let body = await res.json().catch(() => ({}))
        if (!res.ok) {
          // Appena dopo il login/signup la sessione può non essere ancora visibile
          // lato server (race condition sui cookie): un solo retry dopo una breve
          // attesa copre il caso comune senza far perdere i dati del wizard.
          await new Promise((resolve) => setTimeout(resolve, 900))
          res = await createRestaurant()
          body = await res.json().catch(() => ({}))
        }
        if (res.ok) {
          clearPendingRestaurant()
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
        // Creazione ristorante fallita anche al secondo tentativo: non cancelliamo
        // i dati pending, così l'utente può riprovare (es. ri-effettuando il login)
        // senza dover rifare da capo il wizard di creazione.
        toast({
          variant: 'destructive',
          title: 'Creazione ristorante non riuscita',
          description: body?.error || 'Riprova tra qualche secondo.',
        })
      } catch (err: any) {
        toast({
          variant: 'destructive',
          title: 'Errore di rete',
          description: err?.message || 'Riprova tra qualche secondo.',
        })
      }
      setRedirecting(false)
      return
    }

    setRedirecting(true)
    try {
      await getRestaurantByUser()
      window.location.href = '/admin/dashboard'
    } catch {
      // Stessa race condition sui cookie di sessione appena dopo il login:
      // un retry evita di rimandare l'utente indietro senza alcun errore visibile.
      await new Promise((resolve) => setTimeout(resolve, 900))
      try {
        await getRestaurantByUser()
        window.location.href = '/admin/dashboard'
      } catch {
        window.location.href = cameFrom
      }
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
        <Link href="/" className="absolute left-8 top-6 z-20 flex items-center gap-2.5">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-md"
            style={{ background: `linear-gradient(135deg, ${C.orange}, ${C.orangeDeep})` }}
          >
            <ChefHat className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight" style={{ color: C.ink }}>
            Tavola<span style={{ color: C.orange }}>.</span>
          </span>
        </Link>

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
          <Link href="/" className="flex items-center gap-2.5">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-md"
              style={{ background: `linear-gradient(135deg, ${C.orange}, ${C.orangeDeep})` }}
            >
              <ChefHat className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight" style={{ color: C.ink }}>
              Tavola<span style={{ color: C.orange }}>.</span>
            </span>
          </Link>
          <Link
            href="/help"
            className="text-sm font-medium transition-colors hover:underline"
            style={{ color: C.gray }}
          >
            {tr.auth.login.helpLink}
          </Link>
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
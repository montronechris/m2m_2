'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, Sparkles, CheckCircle2, Send, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useI18n } from '@/components/i18n/I18nProvider'

type Status = 'idle' | 'loading' | 'success' | 'error'

function validateEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function NewsletterSection() {
  const { tr, lang } = useI18n()
  const n = tr.newsletter
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')

  const errorLabel = lang === 'it' ? 'Email non valida' : 'Invalid email'

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validateEmail(email)) {
      setStatus('error')
      return
    }
    setStatus('loading')
    // Simulated submission — no backend call.
    window.setTimeout(() => {
      setStatus('success')
      setEmail('')
    }, 900)
  }

  return (
    <section
      id="newsletter"
      className="relative scroll-mt-24 py-16 sm:py-20 lg:py-24"
    >
      <div className="mx-auto max-w-5xl px-4">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7 }}
          className="noise-overlay relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-brand-amber via-brand-terra to-brand-rose p-8 shadow-glow-amber sm:p-12 lg:p-14"
        >
          {/* gradient pan */}
          <div className="pointer-events-none absolute inset-0 animate-gradient-pan bg-[linear-gradient(110deg,transparent_30%,rgba(255,255,255,0.25)_50%,transparent_70%)] bg-[length:200%_100%]" />

          {/* floating dots */}
          <div className="pointer-events-none absolute left-8 top-8 h-3 w-3 rounded-full bg-white/40 animate-float-soft" />
          <div
            className="pointer-events-none absolute right-10 bottom-10 h-4 w-4 rounded-full bg-white/30 animate-float-soft"
            style={{ animationDelay: '1s' }}
          />
          <div
            className="pointer-events-none absolute right-1/4 top-6 h-2 w-2 rounded-full bg-white/50 animate-float-soft"
            style={{ animationDelay: '2s' }}
          />
          <div
            className="pointer-events-none absolute left-1/3 bottom-12 h-1.5 w-1.5 rounded-full bg-white/60 animate-float-soft"
            style={{ animationDelay: '2.6s' }}
          />

          <div className="relative mx-auto max-w-2xl text-center">
            <span className="eyebrow inline-flex items-center gap-2 border border-white/30 bg-white/15 text-white backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 animate-sparkle-spin" />
              {n.badge}
            </span>
            <h2 className="mt-5 font-serif text-4xl font-black leading-tight text-white sm:text-5xl">
              {n.title}{' '}
              <span className="text-lift-strong">{n.titleHighlight}</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-white/85">
              {n.subtitle}
            </p>

            {/* form */}
            <form onSubmit={onSubmit} className="mx-auto mt-8 max-w-md" noValidate>
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-terra/70" />
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (status !== 'idle') setStatus('idle')
                    }}
                    placeholder={n.placeholder}
                    aria-label={n.placeholder}
                    className="h-12 rounded-full border-0 bg-white pl-11 pr-4 text-sm text-ink shadow-md placeholder:text-ink/40 focus-visible:ring-2 focus-visible:ring-white/60"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={status === 'loading'}
                  className="sheen group h-12 gap-2 rounded-full bg-ink px-6 text-sm font-bold text-white shadow-md hover:bg-ink/90 sm:px-7"
                >
                  {status === 'loading' ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  ) : (
                    <>
                      <Send className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      {n.button}
                    </>
                  )}
                </Button>
              </div>

              {/* status messages */}
              {status === 'success' && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {n.success}
                </motion.div>
              )}
              {status === 'error' && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 inline-flex items-center gap-2 rounded-full bg-red-500/30 px-4 py-2 text-sm font-semibold text-white backdrop-blur"
                >
                  <AlertCircle className="h-4 w-4" />
                  {errorLabel}
                </motion.div>
              )}

              <p className="mt-3 text-xs text-white/70">{n.privacy}</p>
            </form>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

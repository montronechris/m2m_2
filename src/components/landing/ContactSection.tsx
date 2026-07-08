'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Mail,
  Phone,
  Send,
  Check,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useI18n } from '@/components/i18n/I18nProvider'

type Status = 'idle' | 'loading' | 'success' | 'error'

function validateEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

/**
 * ContactSection — "Contattaci" form at the bottom of the homepage.
 *
 * - Anchor target: id="contattaci" (linked from the Integrations section
 *   "Richiedi integrazione" button and from the "Secondo" pricing plan).
 * - Two-column layout: left = contact info card, right = the form.
 * - Form posts to /api/contact; on success shows a confirmation state.
 * - i18n IT/EN, accessible labels, responsive, sticky-footer safe.
 */
export function ContactSection() {
  const { tr } = useI18n()
  const c = tr.contact

  const [form, setForm] = useState({
    name: '',
    email: '',
    restaurant: '',
    topic: '',
    message: '',
    consent: false,
  })
  const [status, setStatus] = useState<Status>('idle')
  const [fieldError, setFieldError] = useState<string>('')

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
    if (status !== 'idle') setStatus('idle')
    if (fieldError) setFieldError('')
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      setFieldError('name')
      return
    }
    if (!validateEmail(form.email)) {
      setFieldError('email')
      return
    }
    if (!form.message.trim()) {
      setFieldError('message')
      return
    }
    if (!form.consent) {
      setFieldError('consent')
      return
    }
    setStatus('loading')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('bad status')
      setStatus('success')
      setForm({
        name: '',
        email: '',
        restaurant: '',
        topic: '',
        message: '',
        consent: false,
      })
    } catch {
      setStatus('error')
    }
  }

  const contactItems = [
    { icon: Mail, label: c.emailLabelShort, value: 'ciao@m2m.app', tint: 'text-brand-amber' },
    { icon: Phone, label: c.phoneLabelShort, value: '+39 055 123 4567', tint: 'text-brand-emerald' },
  ]

  return (
    <section id="contattaci" className="relative scroll-mt-28 overflow-hidden pb-16 pt-8 sm:pb-20 sm:pt-10 lg:pb-24 lg:pt-12">
      {/* Soft decorative background */}
      <div aria-hidden className="pointer-events-none absolute -left-10 top-1/4 h-56 w-56 rounded-full bg-brand-amber/10 blur-3xl animate-float-soft" />
      <div aria-hidden className="pointer-events-none absolute -right-10 bottom-1/4 h-64 w-64 rounded-full bg-brand-emerald/10 blur-3xl animate-blob" />
      <div aria-hidden className="pointer-events-none absolute inset-0 divider-dots opacity-20" />

      <div className="relative mx-auto max-w-6xl px-4">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-2xl text-center"
        >
          <span className="eyebrow border border-brand-emerald/30 bg-brand-emerald/10 text-brand-emerald">
            <MessageSquare className="h-3.5 w-3.5" />
            {c.badge}
          </span>
          <h2 className="mt-4 font-serif text-4xl font-black tracking-tight text-ink sm:text-5xl">
            {c.title} <span className="text-gradient-warm">{c.titleHighlight}</span>
          </h2>
          <p className="mt-4 text-lg text-ink/60">{c.subtitle}</p>
        </motion.div>

        <div className="mt-12 grid gap-6 lg:grid-cols-5">
          {/* Left: contact info card */}
          <motion.aside
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6 }}
            className="noise-overlay relative order-2 flex flex-col overflow-hidden rounded-3xl bg-gradient-to-br from-brand-emerald via-brand-emerald to-brand-sky p-7 text-white shadow-glow-emerald sm:p-8 lg:col-span-2"
          >
            <div aria-hidden className="absolute inset-0 bg-grid-soft opacity-20" />
            <div className="relative flex h-full flex-col">
              <h3 className="font-serif text-2xl font-bold">{c.contactInfoTitle}</h3>
              <ul className="mt-6 space-y-4">
                {contactItems.map((it) => {
                  const Icon = it.icon
                  return (
                    <li key={it.label} className="flex items-start gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/20 backdrop-blur ring-1 ring-inset ring-white/25">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">
                          {it.label}
                        </p>
                        <p className="truncate text-sm font-semibold">{it.value}</p>
                      </div>
                    </li>
                  )
                })}
              </ul>

              <div className="mt-auto pt-8">
                <div className="flex items-center gap-2 rounded-2xl bg-white/15 px-4 py-3 text-sm font-semibold backdrop-blur ring-1 ring-inset ring-white/25">
                  <span className="status-dot bg-white" />
                  {c.responseTime}
                </div>
              </div>
            </div>
          </motion.aside>

          {/* Right: form */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="card-gradient-border lift-hover noise-overlay relative order-1 rounded-3xl bg-white/85 p-6 shadow-sm backdrop-blur sm:p-8 lg:col-span-3"
          >
            {status === 'success' ? (
              <div className="flex min-h-[24rem] flex-col items-center justify-center text-center">
                <span className="grid h-16 w-16 place-items-center rounded-full bg-brand-emerald/15 text-brand-emerald">
                  <CheckCircle2 className="h-8 w-8" />
                </span>
                <h3 className="mt-5 font-serif text-2xl font-bold text-ink">{c.success}</h3>
                <Button
                  type="button"
                  variant="outline"
                  className="lift-hover mt-6 gap-2 rounded-full"
                  onClick={() => setStatus('idle')}
                >
                  {c.submit}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-5" noValidate>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="contact-name" className="text-sm font-semibold text-ink">
                      {c.nameLabel}
                    </Label>
                    <Input
                      id="contact-name"
                      value={form.name}
                      onChange={(e) => update('name', e.target.value)}
                      placeholder={c.namePlaceholder}
                      aria-invalid={fieldError === 'name'}
                      className="h-11 rounded-xl"
                    />
                    {fieldError === 'name' && (
                      <p className="flex items-center gap-1 text-xs font-medium text-red-500">
                        <AlertCircle className="h-3 w-3" /> {c.required}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="contact-email" className="text-sm font-semibold text-ink">
                      {c.emailLabel}
                    </Label>
                    <Input
                      id="contact-email"
                      type="email"
                      value={form.email}
                      onChange={(e) => update('email', e.target.value)}
                      placeholder={c.emailPlaceholder}
                      aria-invalid={fieldError === 'email'}
                      className="h-11 rounded-xl"
                    />
                    {fieldError === 'email' && (
                      <p className="flex items-center gap-1 text-xs font-medium text-red-500">
                        <AlertCircle className="h-3 w-3" /> {c.invalidEmail}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="contact-restaurant" className="text-sm font-semibold text-ink">
                      {c.restaurantLabel}
                    </Label>
                    <Input
                      id="contact-restaurant"
                      value={form.restaurant}
                      onChange={(e) => update('restaurant', e.target.value)}
                      placeholder={c.restaurantPlaceholder}
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="contact-topic" className="text-sm font-semibold text-ink">
                      {c.topicLabel}
                    </Label>
                    <Select value={form.topic} onValueChange={(v) => update('topic', v)} modal={false}>
                      <SelectTrigger id="contact-topic" className="h-11 rounded-xl">
                        <SelectValue placeholder={c.topicLabel} />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {c.topics.map((t) => (
                          <SelectItem key={t} value={t} className="rounded-lg">
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="contact-message" className="text-sm font-semibold text-ink">
                    {c.messageLabel}
                  </Label>
                  <Textarea
                    id="contact-message"
                    value={form.message}
                    onChange={(e) => update('message', e.target.value)}
                    placeholder={c.messagePlaceholder}
                    rows={5}
                    aria-invalid={fieldError === 'message'}
                    className="resize-none rounded-xl"
                  />
                  {fieldError === 'message' && (
                    <p className="flex items-center gap-1 text-xs font-medium text-red-500">
                      <AlertCircle className="h-3 w-3" /> {c.required}
                    </p>
                  )}
                </div>

                <label className="flex cursor-pointer items-start gap-2.5 text-sm select-none text-ink/70">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={form.consent}
                    onClick={() => update('consent', !form.consent)}
                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200 ease-out active:scale-90"
                    style={{
                      borderColor: form.consent
                        ? 'var(--color-brand-emerald)'
                        : fieldError === 'consent'
                          ? '#F44336'
                          : 'rgba(33,33,33,0.25)',
                      background: form.consent ? 'var(--color-brand-emerald)' : 'transparent',
                      boxShadow: form.consent ? '0 0 0 4px rgba(16,185,129,0.15)' : 'none',
                    }}
                  >
                    <Check
                      className="h-3 w-3 text-white"
                      strokeWidth={3.5}
                      style={{
                        opacity: form.consent ? 1 : 0,
                        transform: form.consent ? 'scale(1)' : 'scale(0.4)',
                      }}
                    />
                  </button>
                  <span className={fieldError === 'consent' ? 'text-red-500' : ''}>{c.consent}</span>
                </label>

                {status === 'error' && (
                  <div className="flex items-center gap-2 rounded-xl bg-red-500/10 px-4 py-3 text-sm font-medium text-red-600">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {c.error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={status === 'loading'}
                  className="sheen group h-12 w-full gap-2 rounded-full bg-gradient-to-r from-brand-amber to-brand-terra text-base font-bold text-white shadow-glow-amber transition hover:brightness-105 sm:w-auto sm:px-8"
                >
                  {status === 'loading' ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  ) : (
                    <>
                      <Send className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      {c.submit}
                    </>
                  )}
                </Button>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  )
}

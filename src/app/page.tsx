'use client'

import dynamic from 'next/dynamic'
import { PageShell } from '@/components/landing/PageShell'
import { Hero } from '@/components/landing/Hero'
import { Features } from '@/components/landing/Features'

// Below-the-fold sections — lazy loaded to reduce initial JS + memory.
const ProductShowcase = dynamic(() => import('@/components/landing/ProductShowcase').then(m => ({ default: m.ProductShowcase })), { ssr: false, loading: () => null })
const GreenSection = dynamic(() => import('@/components/landing/GreenSection').then(m => ({ default: m.GreenSection })), { ssr: false, loading: () => null })
const Testimonials = dynamic(() => import('@/components/landing/Testimonials').then(m => ({ default: m.Testimonials })), { ssr: false, loading: () => null })
const Pricing = dynamic(() => import('@/components/landing/Pricing').then(m => ({ default: m.Pricing })), { ssr: false, loading: () => null })
const ContactSection = dynamic(() => import('@/components/landing/ContactSection').then(m => ({ default: m.ContactSection })), { ssr: false, loading: () => null })

export default function Home() {
  return (
    <PageShell>
      <Hero />
      <Features />
      <ProductShowcase />
      <GreenSection />
      <Testimonials />
      <Pricing />
      <ContactSection />
    </PageShell>
  )
}

'use client'

import { PageShell } from '@/components/landing/PageShell'
import { Hero } from '@/components/landing/Hero'
import { StatsBar } from '@/components/landing/StatsBar'
import { Features } from '@/components/landing/Features'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { ProductShowcase } from '@/components/landing/ProductShowcase'
import { GreenSection } from '@/components/landing/GreenSection'
import { Testimonials } from '@/components/landing/Testimonials'
import { Pricing } from '@/components/landing/Pricing'
import { CTA } from '@/components/landing/CTA'
import { ContactSection } from '@/components/landing/ContactSection'

export default function Home() {
  return (
    <PageShell>
      <Hero />
      <StatsBar />
      <Features />
      <HowItWorks />
      <ProductShowcase />
      <GreenSection />
      <Testimonials />
      <Pricing />
      <ContactSection />  
      <CTA />
    </PageShell>
  )
}

'use client'

import { motion } from 'framer-motion'
import { LanguageSwitcher } from '@/components/landing/LanguageSwitcher'

export function LangBanner() {
  return (
    <motion.div
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="fixed right-4 top-4 z-50 lg:right-6 lg:top-6"
    >
      <div className="glass flex items-center rounded-2xl border border-ink/5 px-1.5 py-1 shadow-lg">
        <LanguageSwitcher />
      </div>
    </motion.div>
  )
}

'use client'

import { motion } from 'framer-motion'
import { LANGS } from '@/lib/i18n/dictionary'
import { useI18n } from '@/components/i18n/I18nProvider'

interface LanguageSwitcherProps {
  /** Base color for the active pill gradient. Defaults to the same orange used on /rinnova-abbonamento. */
  accentColor?: string
}

export function LanguageSwitcher({ accentColor = '#f97316' }: LanguageSwitcherProps) {
  const { lang, setLang } = useI18n()

  return (
    <div
      className="inline-flex items-center p-1 rounded-full backdrop-blur-xl"
      style={{
        background: 'rgba(255,255,255,0.7)',
        border: '1px solid rgba(255,255,255,0.8)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
      }}
    >
      {LANGS.map(({ code }) => (
        <button
          key={code}
          onClick={() => setLang(code)}
          className="relative px-3.5 py-1.5 text-[12px] font-semibold uppercase tracking-wide transition-colors duration-300 rounded-full"
          style={{
            color: lang === code ? '#fff' : '#6b7280',
          }}
        >
          {lang === code && (
            <motion.span
              layoutId="lang-pill-bg"
              className="absolute inset-0 rounded-full"
              style={{
                background: `linear-gradient(135deg, color-mix(in srgb, ${accentColor} 75%, white) 0%, ${accentColor} 50%, color-mix(in srgb, ${accentColor} 80%, black) 100%)`,
                boxShadow: `0 2px 8px ${accentColor}59`,
                zIndex: -1,
              }}
              transition={{
                type: 'spring',
                stiffness: 500,
                damping: 35,
                mass: 0.6,
              }}
            />
          )}
          <span className="relative z-10">{code}</span>
        </button>
      ))}
    </div>
  )
}
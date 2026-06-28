'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUp } from 'lucide-react'

/**
 * Floating "Back to top" button.
 *
 * - Appears bottom-left after the user scrolls down > 400px.
 * - Bottom-left placement avoids clashing with the ChatWidget (bottom-right).
 * - Uses framer-motion AnimatePresence for enter/exit (scale + opacity).
 * - z-40 keeps it below the ChatWidget (z-[60]) and modals (z-50).
 */
export function BackToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 400)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  function handleClick() {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          key="back-to-top"
          type="button"
          onClick={handleClick}
          aria-label="Torna su"
          initial={{ scale: 0.4, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.4, opacity: 0, y: 12 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          className="sheen fixed bottom-5 left-5 z-40 grid h-12 w-12 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-brand-amber to-brand-terra text-white shadow-glow-amber focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        >
          <ArrowUp className="h-5 w-5" strokeWidth={2.5} />
        </motion.button>
      )}
    </AnimatePresence>
  )
}

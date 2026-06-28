'use client'

import { useEffect, useRef, useState } from 'react'

const LAYERS = [
  { id: 'bottom-bun', delay: 0,    height: 14, color: '#D89856', borderRadius: '0 0 40px 40px' },
  { id: 'lettuce',    delay: 0.15, height: 8,  color: '#6FAF4A', borderRadius: '6px' },
  { id: 'cheese',     delay: 0.30, height: 7,  color: '#F2C14E', borderRadius: '3px' },
  { id: 'patty',      delay: 0.45, height: 12, color: '#6B4226', borderRadius: '8px' },
  { id: 'tomato',     delay: 0.60, height: 7,  color: '#D9534F', borderRadius: '50%' },
  { id: 'top-bun',    delay: 0.75, height: 18, color: '#E2A765', borderRadius: '40px 40px 8px 8px' },
]

// Durata totale animazione panino = delay ultimo layer + durata animazione
const BURGER_ANIM_DURATION = 0.75 + 0.45 // ~1.2s
const MIN_DURATION = 1200

const CSS = `
  @keyframes dropIn {
    from { transform: translateY(-40px); opacity: 0; }
    to   { transform: translateY(0);     opacity: 1; }
  }

  .burger-loader-ingredient {
    animation: dropIn 1s cubic-bezier(0.34, 1.8, 0.64, 1) both;
  }
`

const totalHeight = LAYERS.reduce((s, l) => s + l.height, 0) + (LAYERS.length - 1) * 2

interface BurgerLoaderProps {
  isLoading: boolean
  label?: string
  onDone?: () => void
}

export function BurgerLoader({ isLoading, label = 'Caricamento', onDone }: BurgerLoaderProps) {
  const [progress, setProgress] = useState(0)
  const [showing, setShowing] = useState(true)

  const isLoadingRef = useRef(isLoading)
  const mountTimeRef = useRef(Date.now())
  const doneRef = useRef(false)

useEffect(() => {
  isLoadingRef.current = isLoading
}, [isLoading])

useEffect(() => {
  isLoadingRef.current = isLoading  // ← aggiunto: sincronizza il ref al momento del mount
  mountTimeRef.current = Date.now()
  doneRef.current = false

const interval = setInterval(() => {
  setProgress(p => {
    if (p >= 92) return p
    const step = p < 50 ? 6 : p < 75 ? 4 : 2
    return Math.min(92, p + step)
  })
}, 120)

    const checker = setInterval(() => {
      const elapsed = Date.now() - mountTimeRef.current
      if (!isLoadingRef.current && elapsed >= MIN_DURATION && !doneRef.current) {
        doneRef.current = true
        clearInterval(interval)
        clearInterval(checker)
        setProgress(100)
        setTimeout(() => {
          setShowing(false)
          onDone?.()
        }, 400)
      }
    }, 100)

    return () => {
      clearInterval(interval)
      clearInterval(checker)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!showing) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
      <style>{CSS}</style>

      {/* Panino — tutti i layer sono nel DOM da subito, appaiono in sequenza via animation-delay */}
      <div style={{
        width: 120,
        height: totalHeight,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        alignItems: 'center',
      }}>
        {[...LAYERS].reverse().map(layer => (
          <div
            key={layer.id}
            className="burger-loader-ingredient"
            style={{
              width: 104,
              height: layer.height,
              flexShrink: 0,
              background: layer.color,
              borderRadius: layer.borderRadius,
              marginTop: -2,
              animationDelay: `${layer.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Barra di progresso */}
      <div style={{ width: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <div style={{ height: 6, width: '100%', borderRadius: 9999, overflow: 'hidden', background: 'rgba(0,0,0,0.1)' }}>
          <div style={{
            height: '100%',
            borderRadius: 9999,
            background: '#f59e0b',
            width: `${progress}%`,
            transition: 'width 300ms ease-out',
          }} />
        </div>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'rgba(0,0,0,0.45)' }}>
          {label} {Math.round(progress)}%
        </p>
      </div>
    </div>
  )
}
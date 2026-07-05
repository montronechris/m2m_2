'use client'

import { Check } from 'lucide-react'

const GRAY = '#757575'
const GREEN = '#4CAF50'

/* ------------------------------------------------------------------ */
/*  Password rule definitions                                         */
/* ------------------------------------------------------------------ */

const RULES: { id: string; label: string; test: (pw: string) => boolean }[] = [
  { id: 'length', label: 'Almeno 8 caratteri', test: (pw) => pw.length >= 8 },
  {
    id: 'case',
    label: 'Maiuscole e minuscole',
    test: (pw) => /[a-z]/.test(pw) && /[A-Z]/.test(pw),
  },
  { id: 'number', label: 'Almeno 1 numero', test: (pw) => /\d/.test(pw) },
  {
    id: 'symbol',
    label: 'Almeno 1 simbolo',
    test: (pw) => /[^a-zA-Z0-9]/.test(pw),
  },
]

export type PasswordRuleResult = {
  id: string
  label: string
  passed: boolean
}

export function evaluatePassword(pw: string): {
  results: PasswordRuleResult[]
  passedCount: number
  score: number
  allPassed: boolean
} {
  const results = RULES.map((r) => ({
    id: r.id,
    label: r.label,
    passed: r.test(pw),
  }))
  const passedCount = results.filter((r) => r.passed).length
  const score = (passedCount / RULES.length) * 100
  return { results, passedCount, score, allPassed: passedCount === RULES.length }
}

function strengthLabel(passedCount: number): { label: string; color: string } {
  switch (passedCount) {
    case 0:
      return { label: 'Molto debole', color: '#9e9e9e' }
    case 1:
      return { label: 'Debole', color: '#F44336' }
    case 2:
      return { label: 'Media', color: '#FF9800' }
    case 3:
      return { label: 'Forte', color: '#8BC34A' }
    case 4:
      return { label: 'Molto forte', color: GREEN }
    default:
      return { label: '', color: '#9e9e9e' }
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function PasswordStrength({ password }: { password: string }) {
  const { results, passedCount, score } = evaluatePassword(password)
  const { label, color } = strengthLabel(passedCount)
  const hasInput = password.length > 0

  return (
    <div className="mt-3 select-none">
      {/* Label + strength word */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color: GRAY }}>
          Sicurezza password
        </span>
        <span
          className="text-xs font-semibold transition-colors duration-300"
          style={{ color: hasInput ? color : GRAY }}
        >
          {hasInput ? label : '—'}
        </span>
      </div>

      {/* Progress bar */}
      <div
        className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full"
        style={{ background: 'rgba(33,33,33,0.08)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${score}%`, background: color }}
        />
      </div>

      {/* Rules list */}
      <ul className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {results.map((r) => (
          <li key={r.id} className="flex items-center gap-2">
            <span
              className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border transition-all duration-300"
              style={{
                background: r.passed ? GREEN : 'transparent',
                borderColor: r.passed ? GREEN : 'rgba(33,33,33,0.25)',
                transform: r.passed ? 'scale(1)' : 'scale(1)',
              }}
            >
              {r.passed && (
                <Check
                  className="auth-check-pop h-2.5 w-2.5 text-white"
                  strokeWidth={4}
                />
              )}
            </span>
            <span
              className="text-xs transition-colors duration-300"
              style={{
                color: r.passed ? GREEN : GRAY,
                textDecoration: r.passed ? 'none' : 'none',
              }}
            >
              {r.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

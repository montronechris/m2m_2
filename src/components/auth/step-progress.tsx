'use client'

import { Check } from 'lucide-react'

const GREEN = '#4CAF50'
const GRAY = '#9e9e9e'

/* ------------------------------------------------------------------ */
/*  StepProgress                                                       */
/*  A horizontal progress indicator with numbered circles connected    */
/*  by a line. Each step corresponds to a form field. As a field       */
/*  becomes valid its circle fills green with a checkmark, and the     */
/*  connecting line fills proportionally.                              */
/* ------------------------------------------------------------------ */

export type StepState = {
  id: string
  label: string
  done: boolean
}

export function StepProgress({
  steps,
  compact = false,
}: {
  steps: StepState[]
  compact?: boolean
}) {
  const doneCount = steps.filter((s) => s.done).length
  const total = steps.length

  // Line fill = done steps / (total - 1) segments, capped at 100% so the
  // last step's checkmark doesn't push the line past the final circle.
  const lineFillPercent =
    total <= 1 ? 100 : Math.min((doneCount / (total - 1)) * 100, 100)

  return (
    <div className="w-full select-none" aria-label="Avanzamento registrazione">
      {/* Circles + connecting line */}
      <div className="relative flex items-center justify-between">
        {/* background line (full width) */}
        <div
          className="absolute left-0 right-0 top-1/2 -translate-y-1/2"
          style={{
            height: 2,
            background: 'rgba(33,33,33,0.12)',
          }}
        />
        {/* foreground (filled) line */}
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 transition-all duration-500 ease-out"
          style={{
            height: 2,
            width: `${lineFillPercent}%`,
            background: GREEN,
          }}
        />

        {/* circles */}
        <div className="relative z-10 flex w-full items-center justify-between">
          {steps.map((step, i) => {
            const isDone = step.done
            return (
              <div
                key={step.id}
                className="flex flex-col items-center gap-1.5"
              >
                <div
                  className="flex items-center justify-center rounded-full border-2 transition-all duration-300"
                  style={{
                    width: compact ? 26 : 30,
                    height: compact ? 26 : 30,
                    background: isDone ? GREEN : '#fff',
                    borderColor: isDone ? GREEN : GRAY,
                    color: isDone ? '#fff' : GRAY,
                    boxShadow: isDone ? '0 2px 8px rgba(76,175,80,0.3)' : 'none',
                  }}
                >
                  {isDone ? (
                    <Check
                      className="auth-check-pop"
                      strokeWidth={4}
                      style={{ width: compact ? 14 : 16, height: compact ? 14 : 16 }}
                    />
                  ) : (
                    <span
                      className="text-xs font-bold"
                      style={{ color: GRAY }}
                    >
                      {i + 1}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* labels */}
      <div className="mt-2 flex items-center justify-between">
        {steps.map((step) => (
          <span
            key={step.id}
            className="text-[10px] font-medium transition-colors duration-300"
            style={{
              color: step.done ? GREEN : GRAY,
              textAlign: 'center',
              flex: 1,
            }}
          >
            {step.label}
          </span>
        ))}
      </div>
    </div>
  )
}

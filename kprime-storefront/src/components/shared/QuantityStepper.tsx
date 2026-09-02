"use client"

import { useState } from "react"

import { cn } from "@/lib/utils/format"

export type QuantityStepperProps = {
  value: number
  onChange: (value: number) => void
  min?: number
  /** Usually the variant's stock. Omit when nothing caps it. */
  max?: number
  disabled?: boolean
  /** Distinguishes the inputs when more than one stepper is on a page. */
  id?: string
  className?: string
}

/**
 * Quantity control. Shared — the cart uses it too (Block K).
 *
 * **Clamping happens on commit, not on every keystroke.** Rewriting the input
 * while someone types makes "10" impossible to reach when the max is 12: the
 * "1" clamps to the max the instant it lands. So the field holds raw text while
 * focused and is reconciled on blur or Enter.
 *
 * Every rejected value falls back to something valid rather than throwing:
 * `0` and `-3` clamp up to min, `9999` clamps down to max, and `abc` — which
 * parses to NaN — restores the last good number.
 */
export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max,
  disabled = false,
  id,
  className,
}: QuantityStepperProps) {
  const [draft, setDraft] = useState<string | null>(null)

  const clamp = (n: number) => {
    const bounded = Math.max(min, max === undefined ? n : Math.min(max, n))
    // Math.floor after clamping, so "2.7" becomes 2 rather than being rejected.
    return Math.floor(bounded)
  }

  const commit = (raw: string) => {
    const parsed = Number.parseInt(raw, 10)

    // NaN covers "abc", "" and "--": keep whatever was last valid.
    onChange(Number.isNaN(parsed) ? value : clamp(parsed))
    setDraft(null)
  }

  const step = (delta: number) => onChange(clamp(value + delta))

  const atMin = value <= min
  const atMax = max !== undefined && value >= max

  const button =
    "flex size-11 shrink-0 items-center justify-center text-brand " +
    "disabled:cursor-not-allowed disabled:text-line " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border border-line bg-paper",
        disabled && "opacity-60",
        className
      )}
    >
      <button
        type="button"
        onClick={() => step(-1)}
        disabled={disabled || atMin}
        aria-label="Decrease quantity"
        className={button}
      >
        <span aria-hidden className="text-lg leading-none">
          −
        </span>
      </button>

      <input
        id={id}
        // `text` with a numeric inputmode, not `type="number"`: number inputs
        // bring a spinner that fights these buttons, and scroll-to-change, which
        // silently alters quantity when a phone scrolls over the field.
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={draft ?? String(value)}
        disabled={disabled}
        aria-label="Quantity"
        onChange={(event) => setDraft(event.target.value)}
        onBlur={(event) => commit(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault()
            commit((event.target as HTMLInputElement).value)
          }
        }}
        className={cn(
          "h-11 w-12 border-x border-line bg-paper text-center text-base",
          "text-brand focus-visible:outline-none focus-visible:ring-2",
          "focus-visible:ring-inset focus-visible:ring-brand"
        )}
      />

      <button
        type="button"
        onClick={() => step(1)}
        disabled={disabled || atMax}
        aria-label="Increase quantity"
        className={button}
      >
        <span aria-hidden className="text-lg leading-none">
          +
        </span>
      </button>
    </div>
  )
}

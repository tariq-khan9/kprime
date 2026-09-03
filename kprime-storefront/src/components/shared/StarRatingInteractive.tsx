"use client"

import { useState } from "react"

import { cn } from "@/lib/utils/format"

export type StarSize = "sm" | "md" | "lg"

const SIZES: Record<StarSize, string> = {
  sm: "size-3.5",
  md: "size-4",
  lg: "size-5",
}

function Star({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden className={className}>
      <path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L1.5 7.7l5.9-.9L10 1.5z" />
    </svg>
  )
}

/**
 * The review form's rating control.
 *
 * A **radio group**, not five buttons. That is what makes it work with a
 * keyboard for free: one tab stop, arrow keys to move, and a screen reader that
 * announces "3 of 5" rather than reading out five unlabelled controls.
 *
 * Hover previews the value without committing it, and leaving the row restores
 * the real selection — so pointing at a star never silently changes an answer
 * someone already gave.
 *
 * Zero is a valid *initial* state (nothing chosen) but never a valid choice;
 * the lowest a person can pick is one star.
 */
export function InteractiveStars({
  value,
  onChange,
  size,
  label,
  className,
}: {
  value: number
  onChange?: (value: number) => void
  size: StarSize
  label: string
  className?: string
}) {
  const [hovered, setHovered] = useState<number | null>(null)

  // Hover wins while the pointer is over the row; the committed value returns
  // the moment it leaves.
  const shown = hovered ?? value

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("flex items-center gap-1", className)}
      onMouseLeave={() => setHovered(null)}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= shown

        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={star === value}
            aria-label={`${star} ${star === 1 ? "star" : "stars"}`}
            // Roving tabindex: the group is one tab stop. Before anything is
            // chosen the first star holds it, so the control is reachable.
            tabIndex={star === (value || 1) ? 0 : -1}
            onClick={() => onChange?.(star)}
            onMouseEnter={() => setHovered(star)}
            onFocus={() => setHovered(star)}
            onBlur={() => setHovered(null)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight" || event.key === "ArrowUp") {
                event.preventDefault()
                onChange?.(Math.min(5, (value || 0) + 1))
              } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
                event.preventDefault()
                onChange?.(Math.max(1, (value || 1) - 1))
              }
            }}
            // 44px target around a small star: the glyph is far smaller than a
            // thumb, and a mis-tap here submits the wrong score.
            className={cn(
              "flex size-11 items-center justify-center rounded",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
              filled ? "text-action" : "text-line hover:text-action/50"
            )}
          >
            <Star className={cn(SIZES[size], "size-6")} />
          </button>
        )
      })}

      <span className="ml-2 text-sm text-muted">
        {value > 0 ? `${value} of 5` : "Tap to rate"}
      </span>
    </div>
  )
}

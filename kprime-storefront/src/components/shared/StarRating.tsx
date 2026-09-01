import { cn } from "@/lib/utils/format"

export type StarSize = "sm" | "md" | "lg"

const SIZES: Record<StarSize, string> = {
  sm: "size-3.5",
  md: "size-4",
  lg: "size-5",
}

export type StarRatingProps = {
  /** 0–5. `null` renders nothing at all — see below. */
  value: number | null | undefined
  /** Review count, shown as "(12)" beside the stars. */
  count?: number
  size?: StarSize
  className?: string
}

function Star({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden className={className}>
      <path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L1.5 7.7l5.9-.9L10 1.5z" />
    </svg>
  )
}

/**
 * Display-only. The interactive version for the review form is task 130.
 *
 * Half stars are done by overlaying a clipped filled row on an empty row,
 * rather than by swapping in a half-star glyph. At card scale a dedicated glyph
 * goes muddy; a hard clip on the same path stays crisp at any size.
 */
export function StarRating({
  value,
  count,
  size = "md",
  className,
}: StarRatingProps) {
  // An unrated product renders nothing — not five empty stars.
  //
  // Zero stars reads as "people rated this badly". Every product is unrated
  // until Block N lands, and showing 15 zero-star cards would say something
  // untrue about the whole catalogue.
  if (value === null || value === undefined) {
    return null
  }

  const clamped = Math.max(0, Math.min(5, value))
  const starClass = SIZES[size]

  return (
    <div
      className={cn("flex items-center gap-1", className)}
      role="img"
      aria-label={`${clamped.toFixed(1)} out of 5${count ? `, ${count} reviews` : ""}`}
    >
      <div className="relative inline-flex">
        <div className="flex text-line">
          {Array.from({ length: 5 }, (_, i) => (
            <Star key={i} className={starClass} />
          ))}
        </div>

        {/* Clipped to the exact fraction, so 4.7 shows 70% of the fifth star. */}
        <div
          className="absolute inset-0 flex overflow-hidden text-action"
          style={{ width: `${(clamped / 5) * 100}%` }}
        >
          {Array.from({ length: 5 }, (_, i) => (
            <Star key={i} className={cn(starClass, "shrink-0")} />
          ))}
        </div>
      </div>

      {count !== undefined && <span className="text-muted">({count})</span>}
    </div>
  )
}

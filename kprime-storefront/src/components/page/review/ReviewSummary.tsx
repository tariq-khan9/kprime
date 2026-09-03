"use client"

import { StarRating } from "@/components/shared/StarRating"
import type { RatingDistribution } from "@/lib/data/reviews"
import { cn } from "@/lib/utils/format"

export type ReviewSummaryProps = {
  average: number | null
  count: number
  distribution: RatingDistribution
  /** Currently selected bar, or null for "all". */
  selected?: number | null
  onSelect?: (stars: number | null) => void
  className?: string
}

/**
 * Average, total and the 5→1 distribution.
 *
 * **The bars are buttons.** Someone who sees "three 1-star reviews" wants to
 * read those three, and making them click through a list to find them is worse
 * than letting them filter here. Selecting the same bar twice clears it.
 *
 * **Zero reviews shows a prompt, not five empty bars.** An empty chart reads as
 * a product that was rated badly rather than one nobody has rated, which is a
 * meaningfully different — and untrue — claim.
 */
export function ReviewSummary({
  average,
  count,
  distribution,
  selected = null,
  onSelect,
  className,
}: ReviewSummaryProps) {
  if (count === 0 || average === null) {
    return (
      <div
        className={cn(
          "rounded-md border border-line bg-cream p-4 text-center",
          className
        )}
      >
        <p className="font-medium text-brand">No reviews yet</p>
        <p className="mt-1 text-sm text-muted">
          Bought this? Your review would be the first, and it helps the next
          person decide.
        </p>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:gap-8", className)}>
      <div className="flex shrink-0 flex-col items-center justify-center gap-1">
        <span className="text-4xl font-bold tabular-nums text-brand">
          {average.toFixed(1)}
        </span>
        <StarRating value={average} size="md" />
        <span className="text-sm text-muted">
          {count} {count === 1 ? "review" : "reviews"}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {distribution.map(({ stars, count: barCount }) => {
          const percent = count === 0 ? 0 : (barCount / count) * 100
          const active = selected === stars

          return (
            <button
              key={stars}
              type="button"
              // Disabled rather than hidden when empty: the row still tells the
              // reader that nobody gave this rating, which is information.
              disabled={barCount === 0}
              aria-pressed={active}
              onClick={() => onSelect?.(active ? null : stars)}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded px-2 text-sm",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                barCount === 0
                  ? "cursor-default text-muted"
                  : "text-brand hover:bg-cream",
                active && "bg-cream"
              )}
            >
              <span className="w-12 shrink-0 text-left tabular-nums">
                {stars} star
              </span>

              <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-line">
                <span
                  className="block h-full rounded-full bg-action"
                  style={{ width: `${percent}%` }}
                />
              </span>

              <span className="w-8 shrink-0 text-right tabular-nums text-muted">
                {barCount}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

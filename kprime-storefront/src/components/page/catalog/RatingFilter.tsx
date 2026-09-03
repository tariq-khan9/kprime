"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { StarRating } from "@/components/shared/StarRating"
import { buildHref, parseFilters, setRating } from "@/lib/filters/url-state"
import { cn } from "@/lib/utils/format"

export type RatingFilterProps = {
  /** Counts from the set before rating filtering, so options do not collapse. */
  counts: { minimum: number; count: number }[]
  className?: string
}

/**
 * "N stars and up".
 *
 * A floor rather than an exact rating: nobody looking for good products wants
 * *exactly* four stars, they want four or better.
 *
 * Selecting the active option again clears it, so the filter can be undone
 * without hunting for a separate reset — the chips above the grid can clear it
 * too, since it lives in the URL like every other filter.
 *
 * An option that would return nothing is disabled rather than hidden, so the
 * list does not change shape as choices are made.
 */
export function RatingFilter({ counts, className }: RatingFilterProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const state = parseFilters(searchParams)

  // Nothing rated yet — a filter that can only return nothing is noise.
  if (counts.every((entry) => entry.count === 0)) {
    return null
  }

  return (
    <fieldset className={cn("flex flex-col gap-1", className)}>
      <legend className="mb-1 text-sm font-medium text-brand">Rating</legend>

      {counts.map(({ minimum, count }) => {
        const active = state.rating === minimum

        return (
          <button
            key={minimum}
            type="button"
            disabled={count === 0}
            aria-pressed={active}
            onClick={() =>
              router.push(
                buildHref(
                  pathname,
                  setRating(state, active ? null : minimum)
                ),
                { scroll: false }
              )
            }
            className={cn(
              "flex min-h-11 items-center gap-2 rounded px-2 text-sm",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
              count === 0
                ? "cursor-not-allowed text-muted opacity-60"
                : "text-brand hover:bg-cream",
              active && "bg-cream font-medium"
            )}
          >
            <StarRating value={minimum} size="sm" />
            <span>&amp; up</span>
            <span className="ml-auto tabular-nums text-muted">{count}</span>
          </button>
        )
      })}
    </fieldset>
  )
}

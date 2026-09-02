"use client"

import * as RadixSlider from "@radix-ui/react-slider"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useRef, useState } from "react"

import { buildHref, parseFilters, setPrice } from "@/lib/filters/url-state"
import { cn, formatPKR } from "@/lib/utils/format"

/** How long after the last drag or keystroke the URL is written. */
const DEBOUNCE_MS = 500

export type PriceRangeFilterProps = {
  /** True min and max of the unfiltered set — task 59's priceBoundsOf. */
  bounds: { min: number; max: number }
  className?: string
}

/**
 * Price range — slider plus min/max inputs.
 *
 * Endpoints come from the real data, not a guess, so the slider always spans
 * exactly what the category contains. They are computed before price filtering
 * (see searchProducts), or dragging would shrink the slider's own range with no
 * way to widen it again.
 *
 * The URL write is debounced. Without it a single drag fires a navigation per
 * pixel; with it, one write once the shopper settles.
 */
export function PriceRangeFilter({ bounds, className }: PriceRangeFilterProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const state = parseFilters(searchParams)
  const selected: [number, number] = [
    state.price?.min ?? bounds.min,
    state.price?.max ?? bounds.max,
  ]

  // Local state so the slider and inputs stay responsive while typing or
  // dragging; the URL is the source of truth once it settles.
  const [draft, setDraft] = useState<[number, number]>(selected)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Re-sync when the URL changes from elsewhere — Clear all, a removed chip,
  // or the back button.
  //
  // Adjusted during render rather than in an effect. React handles a setState
  // in render by restarting immediately, without painting the stale value or
  // firing a second effect pass; the effect version triggers a cascading
  // render and a visible flash of the old range.
  const [synced, setSynced] = useState(selected)

  if (synced[0] !== selected[0] || synced[1] !== selected[1]) {
    setSynced(selected)
    setDraft(selected)
  }

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  const commit = (next: [number, number]) => {
    if (timer.current) {
      clearTimeout(timer.current)
    }

    timer.current = setTimeout(() => {
      const [min, max] = next

      // Matching the full range is the same as no filter — keeps `?price=` out
      // of the URL when nothing is actually narrowed.
      const cleared = min <= bounds.min && max >= bounds.max

      router.push(
        buildHref(
          pathname,
          setPrice(state, cleared ? null : { min, max })
        ),
        { scroll: false }
      )
    }, DEBOUNCE_MS)
  }

  const update = (next: [number, number]) => {
    setDraft(next)
    commit(next)
  }

  /** Typed values are clamped and kept in order, so min can never exceed max. */
  const onType = (index: 0 | 1, raw: string) => {
    const value = Number(raw)

    if (!Number.isFinite(value)) {
      return
    }

    const next: [number, number] = [...draft]
    next[index] = Math.min(Math.max(value, bounds.min), bounds.max)

    if (next[0] > next[1]) {
      // Push the other end rather than rejecting the input — rejecting mid-type
      // makes the field feel broken.
      next[index === 0 ? 1 : 0] = next[index]
    }

    update(next)
  }

  // Nothing to choose between.
  if (bounds.min >= bounds.max) {
    return null
  }

  return (
    <div className={cn("border-b border-line py-3", className)}>
      <h3 className="mb-3 font-medium text-brand">Price</h3>

      <RadixSlider.Root
        min={bounds.min}
        max={bounds.max}
        value={draft}
        onValueChange={(v) => update([v[0], v[1]])}
        minStepsBetweenThumbs={1}
        className="relative flex h-5 w-full touch-none select-none items-center"
      >
        <RadixSlider.Track className="relative h-1 w-full grow rounded-full bg-line">
          <RadixSlider.Range className="absolute h-full rounded-full bg-brand" />
        </RadixSlider.Track>

        {/* Both thumbs get a label — a slider with unlabelled handles is
            unusable with a screen reader. */}
        {(["Minimum price", "Maximum price"] as const).map((label) => (
          <RadixSlider.Thumb
            key={label}
            aria-label={label}
            className={cn(
              "block size-5 rounded-full border-2 border-brand bg-paper",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
              "focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
            )}
          />
        ))}
      </RadixSlider.Root>

      <div className="mt-3 flex items-center gap-2">
        {([0, 1] as const).map((index) => (
          <input
            key={index}
            type="number"
            inputMode="numeric"
            aria-label={index === 0 ? "Minimum price" : "Maximum price"}
            min={bounds.min}
            max={bounds.max}
            value={draft[index]}
            onChange={(e) => onType(index, e.target.value)}
            // text-base is 16px — below it iOS zooms the viewport on focus.
            className={cn(
              "h-10 w-full min-w-0 rounded-md border border-line bg-paper px-2",
              "text-base text-brand",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            )}
          />
        ))}
      </div>

      <p className="mt-2 text-sm text-muted">
        {formatPKR(draft[0])} – {formatPKR(draft[1])}
      </p>
    </div>
  )
}

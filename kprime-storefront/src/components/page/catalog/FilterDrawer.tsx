"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/Button"
import { Checkbox } from "@/components/ui/Checkbox"
import { Drawer } from "@/components/ui/Drawer"
import { isPaleSwatch, swatchHex } from "@/config/colors"
import { FILTER_HIDDEN, FILTER_ORDER } from "@/config/filters"
import { facetKey, type Facet, type SelectedFacets } from "@/lib/filters/facets"
import {
  buildHref,
  hasActiveFilters,
  parseFilters,
  type FilterState,
} from "@/lib/filters/url-state"
import { cn } from "@/lib/utils/format"

/** How long after the last tap before the staged count is refetched. */
const COUNT_DEBOUNCE_MS = 300

const COLOUR_KEYS = new Set(["colour", "color"])

function ordered(facets: Facet[]): Facet[] {
  const rank = new Map(FILTER_ORDER.map((title, i) => [facetKey(title), i]))
  const hidden = new Set(FILTER_HIDDEN.map(facetKey))

  return facets
    .filter((facet) => !hidden.has(facet.key))
    .map((facet, i) => ({ facet, i }))
    .sort((a, b) => {
      const ra = rank.get(a.facet.key) ?? Infinity
      const rb = rank.get(b.facet.key) ?? Infinity
      return ra - rb || a.i - b.i
    })
    .map(({ facet }) => facet)
}

function FilterIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden className="size-5">
      <path
        d="M3 5h14M6 10h8M8.5 15h3"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  )
}

export type FilterDrawerProps = {
  facets: Facet[]
  /** Category handle — the count endpoint needs it to scope the query. */
  handle: string
  className?: string
}

/**
 * Mobile filter sheet.
 *
 * Unlike the desktop sidebar, selections are STAGED: they live in local state
 * until Apply. Applying on every tap would mean a full navigation per checkbox
 * over a mobile connection — three taps, three round trips, three re-renders of
 * the grid behind the sheet.
 *
 * The count above Apply comes from /api/catalog/count, debounced. It cannot be
 * computed here: rule 4 forbids shipping the catalogue to the browser, and the
 * per-value facet counts are not per-combination.
 */
export function FilterDrawer({ facets, handle, className }: FilterDrawerProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const state = parseFilters(searchParams)
  const groups = ordered(facets)

  const [open, setOpen] = useState(false)
  const [staged, setStaged] = useState<SelectedFacets>(state.groups)
  // null means "not known yet" — either nothing fetched, or a tap has just
  // invalidated the previous answer. There is no separate `counting` flag:
  // setting one inside the effect is a synchronous setState in an effect, which
  // cascades renders. Clearing it in the tap handler below says the same thing.
  const [count, setCount] = useState<number | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Re-stage from the URL each time the sheet opens, so dismissing without
  // Apply genuinely discards — reopening must not resurrect abandoned taps.
  const openSheet = () => {
    setStaged(state.groups)
    setCount(null)
    setOpen(true)
  }

  useEffect(() => {
    if (!open) {
      return
    }

    if (timer.current) {
      clearTimeout(timer.current)
    }

    const controller = new AbortController()

    timer.current = setTimeout(async () => {
      const params = new URLSearchParams({ handle })

      for (const [key, values] of Object.entries(staged)) {
        if (values.length) {
          params.set(key, values.join(","))
        }
      }

      if (state.price) {
        params.set(
          "price",
          `${state.price.min ?? ""}-${state.price.max ?? ""}`
        )
      }

      try {
        const response = await fetch(`/api/catalog/count?${params}`, {
          signal: controller.signal,
        })
        const body = await response.json()
        setCount(typeof body.count === "number" ? body.count : null)
      } catch {
        // Aborted, or the network dropped. Leaving the count null hides it
        // rather than showing a stale number next to Apply.
        setCount(null)
      }
    }, COUNT_DEBOUNCE_MS)

    return () => {
      controller.abort()
      if (timer.current) clearTimeout(timer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, staged, handle, state.price?.min, state.price?.max])

  const toggle = (group: string, value: string) => {
    // The previous count is stale the instant a box is tapped. Clearing it here
    // — in an event handler — keeps the effect free of synchronous setState.
    setCount(null)

    setStaged((current) => {
      const values = current[group] ?? []
      const next = values.includes(value)
        ? values.filter((v) => v !== value)
        : [...values, value]

      const out = { ...current }

      if (next.length) {
        out[group] = next
      } else {
        delete out[group]
      }

      return out
    })
  }

  const apply = () => {
    // Page resets to 1: the staged set almost certainly has a different length,
    // and landing on page 3 of a shorter result is an empty grid.
    const next: FilterState = { ...state, groups: staged, page: 1 }
    setOpen(false)
    router.push(buildHref(pathname, next), { scroll: false })
  }

  const activeCount = Object.values(state.groups).reduce(
    (n, values) => n + values.length,
    0
  )

  if (groups.length === 0) {
    return null
  }

  return (
    <>
      <button
        type="button"
        onClick={openSheet}
        className={cn(
          "flex min-h-11 items-center gap-2 rounded-md border border-line",
          "px-4 text-brand hover:border-brand lg:hidden",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
          className
        )}
      >
        <FilterIcon />
        Filters
        {activeCount > 0 && (
          <span className="rounded-full bg-brand px-2 text-sm text-cream">
            {activeCount}
          </span>
        )}
      </button>

      <Drawer
        open={open}
        onOpenChange={setOpen}
        side="bottom"
        title="Filters"
        description="Choose, then apply."
        footer={
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => {
                setCount(null)
                setStaged({})
              }}
              disabled={Object.keys(staged).length === 0}
            >
              Clear
            </Button>
            <Button onClick={apply} className="flex-1">
              {/* Count only once it is known — a flickering number beside the
                  button is worse than none. */}
              {count === null
                ? "Apply"
                : `Show ${count} ${count === 1 ? "result" : "results"}`}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col">
          {groups.map((facet) => {
            const selected = staged[facet.key] ?? []
            const isColour = COLOUR_KEYS.has(facet.key)

            return (
              <div
                key={facet.key}
                className="border-b border-line py-3 last:border-b-0"
              >
                <h3 className="mb-1 font-medium text-brand">
                  {facet.title}
                  {selected.length > 0 && (
                    <span className="ml-2 text-sm text-muted">
                      {selected.length}
                    </span>
                  )}
                </h3>

                {isColour ? (
                  <div className="flex flex-wrap gap-2">
                    {facet.values.map((value) => {
                      const hex = swatchHex(value.value)
                      const on = selected.includes(value.key)

                      return hex ? (
                        <button
                          key={value.key}
                          type="button"
                          onClick={() => toggle(facet.key, value.key)}
                          aria-pressed={on}
                          aria-label={`${value.value}, ${value.count} products`}
                          className="flex size-11 items-center justify-center rounded-md"
                        >
                          <span
                            className={cn(
                              "block size-7 rounded-full",
                              on &&
                                "ring-2 ring-brand ring-offset-2 ring-offset-paper",
                              isPaleSwatch(value.value)
                                ? "border border-muted"
                                : "border border-line"
                            )}
                            style={{ backgroundColor: hex }}
                          />
                        </button>
                      ) : (
                        <button
                          key={value.key}
                          type="button"
                          onClick={() => toggle(facet.key, value.key)}
                          aria-pressed={on}
                          className={cn(
                            "flex min-h-11 items-center rounded-md border px-3 text-sm",
                            on
                              ? "border-brand bg-brand/5 text-brand"
                              : "border-line text-muted"
                          )}
                        >
                          {value.value}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  facet.values.map((value) => (
                    <Checkbox
                      key={value.key}
                      label={value.value}
                      count={value.count}
                      checked={selected.includes(value.key)}
                      onCheckedChange={() => toggle(facet.key, value.key)}
                    />
                  ))
                )}
              </div>
            )
          })}

          {hasActiveFilters(state) && (
            <p className="pt-3 text-sm text-muted">
              Dismissing this sheet keeps your current filters.
            </p>
          )}
        </div>
      </Drawer>
    </>
  )
}

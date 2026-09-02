"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"

import { isPaleSwatch, swatchHex } from "@/config/colors"
import type { Facet } from "@/lib/filters/facets"
import { buildHref, parseFilters, toggleValue } from "@/lib/filters/url-state"
import { cn } from "@/lib/utils/format"

const VISIBLE = 12

/**
 * Colour filter as swatches.
 *
 * A name with no hex in `config/colors.ts` falls back to a labelled chip rather
 * than a blank square — an unmapped colour must stay usable, not disappear.
 *
 * Selection is shown by a ring offset from the swatch, never by a tick drawn on
 * it: a tick has to contrast with the swatch colour itself, which is impossible
 * to guarantee across a catalogue.
 */
export function ColorSwatchFilter({
  facet,
  className,
}: {
  facet: Facet
  className?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [open, setOpen] = useState(true)
  const [expanded, setExpanded] = useState(false)

  const state = parseFilters(searchParams)
  const selected = state.groups[facet.key] ?? []

  const values = expanded ? facet.values : facet.values.slice(0, VISIBLE)
  const hidden = facet.values.length - values.length

  const toggle = (value: string) =>
    router.push(buildHref(pathname, toggleValue(state, facet.key, value)), {
      scroll: false,
    })

  return (
    <div className={cn("border-b border-line py-3 last:border-b-0", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-11 w-full items-center justify-between gap-2 text-left font-medium text-brand"
      >
        <span>
          {facet.title}
          {selected.length > 0 && (
            <span className="ml-2 text-sm text-muted">{selected.length}</span>
          )}
        </span>
        <svg
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden
          className={cn(
            "size-5 shrink-0 text-muted transition-transform",
            open && "rotate-180"
          )}
        >
          <path
            d="M6 8l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div className="mt-2 flex flex-wrap gap-2">
          {values.map((value) => {
            const hex = swatchHex(value.value)
            const isSelected = selected.some(
              (v) => v.toLowerCase() === value.key
            )

            // No hex — a readable chip rather than a blank square.
            if (!hex) {
              return (
                <button
                  key={value.key}
                  type="button"
                  onClick={() => toggle(value.key)}
                  aria-pressed={isSelected}
                  className={cn(
                    "flex min-h-11 items-center rounded-md border px-3 text-sm",
                    isSelected
                      ? "border-brand bg-brand/5 text-brand"
                      : "border-line text-muted hover:border-brand"
                  )}
                >
                  {value.value}
                  <span className="ml-1.5 text-muted">{value.count}</span>
                </button>
              )
            }

            return (
              <button
                key={value.key}
                type="button"
                onClick={() => toggle(value.key)}
                aria-pressed={isSelected}
                aria-label={`${value.value}, ${value.count} products`}
                title={`${value.value} (${value.count})`}
                // 44px hit area around a 28px swatch — the padding is what a
                // thumb needs, the swatch is what the eye sees.
                className="flex size-11 items-center justify-center rounded-md"
              >
                <span
                  className={cn(
                    "block size-7 rounded-full",
                    // Ring sits outside the swatch, so selection is visible
                    // whatever colour the swatch happens to be.
                    isSelected
                      ? "ring-2 ring-brand ring-offset-2 ring-offset-paper"
                      : "",
                    // Pale colours need an edge or they vanish on the page.
                    isPaleSwatch(value.value)
                      ? "border border-muted"
                      : "border border-line"
                  )}
                  style={{ backgroundColor: hex }}
                />
              </button>
            )
          })}

          {hidden > 0 && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="min-h-11 self-center text-sm text-muted underline hover:text-brand"
            >
              +{hidden} more
            </button>
          )}
        </div>
      )}
    </div>
  )
}

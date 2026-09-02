"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import type { Facet } from "@/lib/filters/facets"
import {
  activeFilterEntries,
  buildHref,
  clearAll,
  parseFilters,
  removeValue,
  setPrice,
} from "@/lib/filters/url-state"
import { cn, formatPKR } from "@/lib/utils/format"

function Chip({
  label,
  onRemove,
}: {
  label: string
  onRemove: () => void
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label} filter`}
        className={cn(
          "flex min-h-11 items-center gap-2 rounded-md border border-line",
          "bg-cream px-3 text-sm text-brand hover:border-brand",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        )}
      >
        {label}
        <svg viewBox="0 0 20 20" fill="none" aria-hidden className="size-4">
          <path
            d="M6 6l8 8M14 6l-8 8"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </li>
  )
}

export type ActiveFilterChipsProps = {
  /** Used to show a value's display casing — the URL carries it lowercased. */
  facets: Facet[]
  className?: string
}

/**
 * Active filters, one chip each, entirely derived from the URL.
 *
 * Sits above the grid rather than in the sidebar, because below 1024px the
 * sidebar does not exist — without this a mobile shopper could apply filters in
 * the drawer and then have no idea what was active.
 */
export function ActiveFilterChips({
  facets,
  className,
}: ActiveFilterChipsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const state = parseFilters(searchParams)
  const entries = activeFilterEntries(state)
  const price = state.price

  if (entries.length === 0 && !price) {
    return null
  }

  const go = (next: Parameters<typeof buildHref>[1]) =>
    router.push(buildHref(pathname, next), { scroll: false })

  /** The URL holds "black"; the shopper picked "Black". */
  const display = (groupKey: string, value: string) => {
    const facet = facets.find((f) => f.key === groupKey)
    const match = facet?.values.find((v) => v.key === value.toLowerCase())
    return match?.value ?? value
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <ul className="flex flex-wrap items-center gap-2">
        {entries.map(({ group, value }) => (
          <Chip
            key={`${group}:${value}`}
            label={display(group, value)}
            // Removes this value only — every other filter survives.
            onRemove={() => go(removeValue(state, group, value))}
          />
        ))}

        {price && (
          <Chip
            label={`${formatPKR(price.min ?? 0)} – ${
              price.max !== undefined ? formatPKR(price.max) : "any"
            }`}
            onRemove={() => go(setPrice(state, null))}
          />
        )}
      </ul>

      <button
        type="button"
        onClick={() => go(clearAll(state))}
        className="min-h-11 text-sm text-muted underline hover:text-brand"
      >
        Clear all
      </button>
    </div>
  )
}

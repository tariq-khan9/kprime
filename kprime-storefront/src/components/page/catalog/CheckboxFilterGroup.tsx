"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"

import { Checkbox } from "@/components/ui/Checkbox"
import type { Facet } from "@/lib/filters/facets"
import { buildHref, parseFilters, toggleValue } from "@/lib/filters/url-state"
import { cn } from "@/lib/utils/format"

/** Values shown before "show more". */
const VISIBLE = 8

export type CheckboxFilterGroupProps = {
  facet: Facet
  className?: string
}

/**
 * One derived filter group — multi-select, OR within the group.
 *
 * Selecting a value writes its lowercased string to the URL, not an id. The ids
 * behind it are per-product (nine products in Black have nine ids), so the
 * string is the only stable handle; `filterByFacets` resolves it back against
 * the set. `selectedOptionValueIds` exists for anything that needs the ids.
 */
export function CheckboxFilterGroup({
  facet,
  className,
}: CheckboxFilterGroupProps) {
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
    router.push(
      // toggleValue resets page to 1 — filtering from page 3 onto a set with
      // one page would otherwise show nothing.
      buildHref(pathname, toggleValue(state, facet.key, value)),
      { scroll: false }
    )

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
        <div className="mt-1 flex flex-col">
          {values.map((value) => (
            <Checkbox
              key={value.key}
              label={value.value}
              // Counts come from the pre-facet set, so they show how many
              // products each value WOULD add rather than shrinking to zero as
              // soon as something is ticked.
              count={value.count}
              checked={selected.some((v) => v.toLowerCase() === value.key)}
              onCheckedChange={() => toggle(value.key)}
            />
          ))}

          {hidden > 0 && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="mt-1 self-start text-sm text-muted underline hover:text-brand"
            >
              Show {hidden} more
            </button>
          )}
        </div>
      )}
    </div>
  )
}

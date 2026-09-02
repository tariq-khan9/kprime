"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { CheckboxFilterGroup } from "@/components/page/catalog/CheckboxFilterGroup"
import { PriceRangeFilter } from "@/components/page/catalog/PriceRangeFilter"
import { SortDropdown } from "@/components/page/catalog/SortDropdown"
import { FILTER_HIDDEN, FILTER_ORDER } from "@/config/filters"
import { facetKey, type Facet } from "@/lib/filters/facets"
import {
  buildHref,
  clearAll,
  hasActiveFilters,
  parseFilters,
} from "@/lib/filters/url-state"
import { cn } from "@/lib/utils/format"

/**
 * Groups in `FILTER_ORDER` first, in that order; everything else follows in the
 * order `deriveFacets` returned them, which is coverage-descending.
 *
 * A new option therefore appears in a sensible position with no code change —
 * the config exists to promote the ones a shopper actually filters on above the
 * long tail, not to declare which filters exist.
 */
function ordered(facets: Facet[]): Facet[] {
  const rank = new Map(FILTER_ORDER.map((title, i) => [facetKey(title), i]))
  const hidden = new Set(FILTER_HIDDEN.map(facetKey))

  return facets
    .filter((facet) => !hidden.has(facet.key))
    .map((facet, i) => ({ facet, i }))
    .sort((a, b) => {
      const ra = rank.get(a.facet.key) ?? Infinity
      const rb = rank.get(b.facet.key) ?? Infinity
      // Unranked groups keep their incoming order rather than jumping around.
      return ra - rb || a.i - b.i
    })
    .map(({ facet }) => facet)
}

export type FilterSidebarProps = {
  facets: Facet[]
  /** True range of the unfiltered set. Null when nothing is priced. */
  priceBounds: { min: number; max: number } | null
  className?: string
}

/**
 * Desktop filter sidebar. Applies on change — no Apply button.
 *
 * `hidden lg:block`: below lg the same groups belong in a bottom sheet with
 * staged state and an Apply button (task 72), because applying on every tap
 * over a mobile connection means a round trip per tick.
 */
export function FilterSidebar({
  facets,
  priceBounds,
  className,
}: FilterSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const state = parseFilters(searchParams)
  const groups = ordered(facets)

  return (
    <aside
      aria-label="Filters"
      className={cn(
        // Sticky below the header. The header is 72px at rest and shrinks to
        // 56px; top-20 clears the taller state.
        "hidden w-60 shrink-0 lg:block lg:sticky lg:top-20 lg:self-start",
        className
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-bold text-brand">Filters</h2>

        {hasActiveFilters(state) && (
          <button
            type="button"
            onClick={() =>
              // Keeps q and sort — clearing filters on a search page must not
              // discard the search itself.
              router.push(buildHref(pathname, clearAll(state)), {
                scroll: false,
              })
            }
            className="text-sm text-muted underline hover:text-brand"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="mt-2">
        {/* Sort first, as requested. Separated by a rule because it is not a
            filter — it never narrows the set, so it is deliberately excluded
            from "Clear all" and from the active-filter count. */}
        <div className="border-b border-line pb-3">
          <SortDropdown />
        </div>

        {priceBounds && <PriceRangeFilter bounds={priceBounds} />}

        {groups.map((facet) => (
          <CheckboxFilterGroup key={facet.key} facet={facet} />
        ))}
      </div>
    </aside>
  )
}

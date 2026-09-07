"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { CheckboxFilterGroup } from "@/components/page/catalog/CheckboxFilterGroup"
import { ColorSwatchFilter } from "@/components/page/catalog/ColorSwatchFilter"
import { PriceRangeFilter } from "@/components/page/catalog/PriceRangeFilter"
import { RatingFilter } from "@/components/page/catalog/RatingFilter"
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

/** Colour renders as swatches; everything else as checkboxes. */
const COLOUR_KEYS = new Set(["colour", "color"])

export type FilterSidebarProps = {
  facets: Facet[]
  /** True range of the unfiltered set. Null when nothing is priced. */
  priceBounds: { min: number; max: number } | null
  /** Rating thresholds and how many products each would leave. */
  ratingCounts?: { minimum: number; count: number }[]
  /** Renders a plain block instead of a self-positioned `<aside>`. See below. */
  bare?: boolean
  className?: string
}

/**
 * Desktop filter sidebar. Applies on change — no Apply button.
 *
 * `hidden lg:block`: below lg the same groups belong in a bottom sheet with
 * staged state and an Apply button (task 72), because applying on every tap
 * over a mobile connection means a round trip per tick.
 *
 * **`bare` drops the `<aside>`, its width, and its own sticky positioning.**
 * The category page stacks this under `CategoryTreeNav` inside one shared
 * sticky rail — two independently `sticky top-20` siblings would each try to
 * pin at the same offset as you scroll past them, so only the outer wrapper
 * may own that. Everywhere else (`/search`, `/collections/[handle]`) this is
 * the only thing in the column, so the default keeps managing its own aside.
 */
export function FilterSidebar({
  facets,
  priceBounds,
  ratingCounts,
  bare = false,
  className,
}: FilterSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const state = parseFilters(searchParams)
  const groups = ordered(facets)

  /**
   * Nothing to filter on. The data layer empties all three when the scope is
   * below MIN_PRODUCTS_FOR_FILTERS, so this is what a one- or two-product
   * category looks like here.
   *
   * Sort still renders. It is not a filter — it never narrows the set, and this
   * column is the only place it lives at desktop width, so dropping the whole
   * aside would take the sort control with it. The "Filters" heading goes,
   * because a heading over a lone sort dropdown labels it wrongly.
   */
  const hasFilters =
    groups.length > 0 || priceBounds !== null || (ratingCounts?.length ?? 0) > 0

  const Wrapper = bare ? "div" : "aside"

  return (
    <Wrapper
      aria-label={bare ? undefined : hasFilters ? "Filters" : "Sort"}
      className={cn(
        !bare &&
          // Sticky below the header. The header is 72px at rest and shrinks
          // to 56px; top-20 clears the taller state.
          "hidden w-60 shrink-0 lg:block lg:sticky lg:top-20 lg:self-start",
        className
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        {hasFilters && <h2 className="font-bold text-brand">Filters</h2>}

        {hasFilters && hasActiveFilters(state) && (
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
        <div className={cn(hasFilters && "border-b border-line pb-3")}>
          <SortDropdown />
        </div>

        {priceBounds && <PriceRangeFilter bounds={priceBounds} />}

        {ratingCounts && ratingCounts.length > 0 && (
          <RatingFilter counts={ratingCounts} />
        )}

        {groups.map((facet) =>
          COLOUR_KEYS.has(facet.key) ? (
            <ColorSwatchFilter key={facet.key} facet={facet} />
          ) : (
            <CheckboxFilterGroup key={facet.key} facet={facet} />
          )
        )}
      </div>
    </Wrapper>
  )
}

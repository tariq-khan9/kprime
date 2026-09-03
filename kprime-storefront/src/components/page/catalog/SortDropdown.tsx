"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { Select } from "@/components/ui/Select"
import type { ProductSort } from "@/lib/data/products"
import { buildHref, parseFilters, setSort } from "@/lib/filters/url-state"

type Option = { value: ProductSort; label: string }

const OPTIONS: Option[] = [
  { value: "newest", label: "Newest" },
  { value: "rating", label: "Highest rated" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "title", label: "Name" },
]

/**
 * Relevance is offered only when a query is active — it is the default there,
 * and listing it on a category page would show an option that cannot order
 * anything.
 */
function optionsFor(q: string | null): Option[] {
  return q ? [{ value: "relevance", label: "Relevance" }, ...OPTIONS] : OPTIONS
}

/**
 * Sort control.
 *
 * Writes to the URL, never to local state. That is what makes the back button
 * restore the previous order and the link shareable — and it is why the sort
 * survives a refresh. `setSort` also resets the page, so changing sort from
 * page 3 does not land on an empty page 3 of a reordered set.
 */
export function SortDropdown({ className }: { className?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const state = parseFilters(searchParams)

  return (
    <Select
      label="Sort by"
      options={optionsFor(state.q)}
      value={state.sort}
      onChange={(event) =>
        router.push(
          buildHref(pathname, setSort(state, event.target.value as ProductSort)),
          // Scroll stays put: the grid is already in view and jumping to the
          // top after a sort loses the shopper's place.
          { scroll: false }
        )
      }
      className={className}
    />
  )
}

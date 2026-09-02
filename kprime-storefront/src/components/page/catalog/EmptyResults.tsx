"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { EmptyState } from "@/components/shared/EmptyState"
import { Button } from "@/components/ui/Button"
import {
  buildHref,
  clearAll,
  clearGroup,
  parseFilters,
  setPrice,
} from "@/lib/filters/url-state"

/**
 * One filter that could be dropped, and what that would return.
 *
 * `group` is a facet key, or `"price"` for the range.
 */
export type Relaxation = { group: string; label: string; count: number }

export type EmptyResultsProps = {
  /**
   * Computed server-side, where the product set is already in memory — one pass
   * per active group costs nothing there and would cost a round trip here.
   */
  relaxations: Relaxation[]
}

/**
 * Zero results, with a way out.
 *
 * "No products match" is a dead end. Naming which filter to drop, and how many
 * results that returns, is the difference between a shopper leaving and a
 * shopper clicking. Only relaxations that actually yield results are passed in.
 */
export function EmptyResults({ relaxations }: EmptyResultsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const state = parseFilters(searchParams)

  const drop = (group: string) =>
    router.push(
      buildHref(
        pathname,
        group === "price" ? setPrice(state, null) : clearGroup(state, group)
      ),
      { scroll: false }
    )

  return (
    <EmptyState
      title="No products match these filters"
      description={
        relaxations.length > 0
          ? "Try widening one of them:"
          : "Try removing a filter or two."
      }
      action={
        <>
          {relaxations.map((relaxation) => (
            <Button
              key={relaxation.group}
              variant="secondary"
              onClick={() => drop(relaxation.group)}
            >
              Remove {relaxation.label} → {relaxation.count}{" "}
              {relaxation.count === 1 ? "result" : "results"}
            </Button>
          ))}

          <Button variant="ghost" onClick={() => router.push(buildHref(pathname, clearAll(state)), { scroll: false })}>
            Clear all filters
          </Button>
        </>
      }
    />
  )
}

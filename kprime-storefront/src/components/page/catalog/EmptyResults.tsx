"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { EmptyState } from "@/components/shared/EmptyState"
import type { Relaxation } from "@/lib/filters/relaxations"
import { Button } from "@/components/ui/Button"
import {
  buildHref,
  clearAll,
  clearGroup,
  hasActiveFilters,
  parseFilters,
  setPrice,
} from "@/lib/filters/url-state"

export type EmptyResultsProps = {
  /**
   * Computed server-side, where the product set is already in memory — one pass
   * per active group costs nothing there and would cost a round trip here.
   */
  relaxations: Relaxation[]
  /**
   * Shown when nothing is filtered and the set is still empty — an empty
   * category, or a search with no hits. "Remove a filter" would be advice about
   * filters that do not exist.
   */
  emptyTitle?: string
  emptyDescription?: string
}

/**
 * Zero results, with a way out.
 *
 * "No products match" is a dead end. Naming which filter to drop, and how many
 * results that returns, is the difference between a shopper leaving and a
 * shopper clicking. Only relaxations that actually yield results are passed in.
 */
export function EmptyResults({
  relaxations,
  emptyTitle = "No products here yet",
  emptyDescription = "New stock is on its way. Check back soon, or browse another category.",
}: EmptyResultsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const state = parseFilters(searchParams)

  if (!hasActiveFilters(state)) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />
  }

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

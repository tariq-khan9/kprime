import Link from "next/link"

import { ScrollRail } from "@/components/shared/ScrollRail"
import type { CategoryNode } from "@/lib/data/categories"
import { cn } from "@/lib/utils/format"

/**
 * Deterministic tint per tile.
 *
 * Medusa categories have no image field, so these are generated rather than
 * uploaded. Picking by index keeps the palette stable between renders — a tile
 * that changes colour on every reload reads as a bug.
 */
const TINTS = [
  "from-brand to-brand-light",
  "from-brand-light to-brand",
  "from-sale/70 to-sale",
  "from-action-ink to-brand",
  "from-success/70 to-brand",
  "from-brand to-action-ink",
  "from-brand-light to-action-ink",
  "from-sale/60 to-brand",
  "from-brand to-success/70",
  "from-action-ink to-brand-light",
]

export type CategoryRailProps = {
  categories: CategoryNode[]
  className?: string
}

/**
 * Scrolling row of category tiles — three visible on desktop, the rest reached
 * by the arrows.
 *
 * A rail rather than a wrapping grid because the category count is open-ended:
 * a grid grows downwards, and at ten categories it pushed roughly 785px of
 * navigation above the first product on a phone. A rail is the same height
 * whether there are 4 categories or 40.
 *
 * Tiles are 3:2 landscape, deliberately the inverse of ProductCard's 3:4
 * portrait, so a category is never mistaken for a product at a glance.
 *
 * Server component: ScrollRail is the only client code involved.
 */
export function CategoryRail({ categories, className }: CategoryRailProps) {
  if (categories.length === 0) {
    return null
  }

  return (
    <ScrollRail title="Shop by category" className={className}>
      {categories.map((category, i) => (
        <div
          key={category.id}
          className={cn(
            "shrink-0 snap-start",
            // Phone ~2.2 tiles, tablet ~3.3 — the partial tile signals there is
            // more to the right, which is the only affordance touch gets.
            //
            // From md: exactly three, filling the row. The calc subtracts the
            // two 1rem gaps between them, so three tiles span the container
            // edge to edge and the arrows do the rest.
            "w-[45%] sm:w-[30%] md:w-[calc((100%-2rem)/3)]"
          )}
        >
          <Link
            href={`/categories/${category.handle}`}
            className={cn(
              "group flex flex-col overflow-hidden rounded-md",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
              "focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
            )}
          >
            <div
              className={cn(
                "flex aspect-[3/2] items-end bg-gradient-to-br p-3 md:p-4",
                TINTS[i % TINTS.length]
              )}
            >
              <span className="text-base font-bold text-cream sm:text-lg md:text-xl">
                {category.name}
              </span>
            </div>

            {category.children.length > 0 && (
              <span className="mt-1 text-sm text-muted">
                {category.children.length} subcategories
              </span>
            )}
          </Link>
        </div>
      ))}
    </ScrollRail>
  )
}

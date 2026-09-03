import Image from "next/image"
import Link from "next/link"

import { ScrollRail } from "@/components/shared/ScrollRail"
import { CATEGORY_TILES, type CategoryTile } from "@/static/category"
import { cn } from "@/lib/utils/format"

export type CategoryRailProps = {
  /** Defaults to the curated six in `src/static/category.ts`. */
  tiles?: CategoryTile[]
  className?: string
}

/**
 * Scrolling row of category tiles — three visible on desktop, the rest reached
 * by the arrows.
 *
 * A rail rather than a wrapping grid because a grid grows downwards: at ten
 * categories it pushed roughly 785px of navigation above the first product on a
 * phone. A rail is the same height whether there are four tiles or forty.
 *
 * Tiles are 3:2 landscape, deliberately the inverse of ProductCard's 3:4
 * portrait, so a category is never mistaken for a product at a glance.
 *
 * **Reads a curated list, not the live tree.** See `src/static/category.ts` for
 * why. The header's mega menu and the footer still render every category.
 *
 * Server component: ScrollRail is the only client code involved.
 */
export function CategoryRail({
  tiles = CATEGORY_TILES,
  className,
}: CategoryRailProps) {
  if (tiles.length === 0) {
    return null
  }

  return (
    <ScrollRail title="Shop by category" className={className}>
      {tiles.map((tile) => (
        <div
          key={tile.href}
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
            href={tile.href}
            className={cn(
              "group block overflow-hidden rounded-md",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
              "focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
            )}
          >
            {/* Cream ground so the tile is never a white gap while the image
                loads, and the box is sized before it arrives — no layout shift. */}
            <div className="relative flex aspect-[3/2] items-end overflow-hidden rounded-md bg-cream">
              <Image
                src={tile.image}
                // Decorative: the title below is the same information, and a
                // screen reader should not hear the category name twice.
                alt=""
                fill
                // Two tiles at 360px, three from md.
                sizes="(max-width: 640px) 45vw, (max-width: 768px) 30vw, 33vw"
                className="object-cover transition-transform duration-200 group-hover:scale-105"
              />

              {/* The title sits on the photograph, so it needs the same scrim
                  the hero uses — without it legibility depends on whatever
                  happens to be behind those words. */}
              <div aria-hidden className="absolute inset-0 bg-brand/50" />

              <span className="relative p-3 text-base font-bold text-cream sm:text-lg md:p-4 md:text-xl">
                {tile.title}
              </span>
            </div>
          </Link>
        </div>
      ))}
    </ScrollRail>
  )
}

import Image from "next/image"
import Link from "next/link"

import { CATEGORY_TILES, type CategoryTile } from "@/static/category"
import { cn } from "@/lib/utils/format"

export type CategoryRailProps = {
  /** Defaults to the curated list in `src/static/category.ts`. */
  tiles?: CategoryTile[]
  className?: string
}

/**
 * Category tiles — 2×2 on a phone, one row of four from md.
 *
 * A grid, not a scrolling rail, because the shop has four top-level categories.
 * The rail showed three and hid the fourth behind an arrow, so a quarter of the
 * shop was invisible from the home page. Two rows of 3:2 tiles at 360px is about
 * 240px, well short of the height that once made a grid push products off the
 * first screen. If the curated list grows past four, revisit this.
 *
 * Tiles are 3:2 landscape, deliberately the inverse of ProductCard's 3:4
 * portrait, so a category is never mistaken for a product at a glance.
 *
 * **Reads a curated list, not the live tree.** See `src/static/category.ts` for
 * why. The header's mega menu and the footer still render every category.
 */
export function CategoryRail({
  tiles = CATEGORY_TILES,
  className,
}: CategoryRailProps) {
  if (tiles.length === 0) {
    return null
  }

  return (
    <section className={cn("flex flex-col gap-3", className)}>
      <h2 className="text-xl font-bold tracking-tight text-brand sm:text-2xl">
        Shop by category
      </h2>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {tiles.map((tile) => (
          <Link
            key={tile.href}
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
                sizes="(max-width: 768px) 50vw, 25vw"
                className="object-cover transition-transform duration-200 group-hover:scale-105"
              />

              {/* A fade under the title rather than a wash over the whole
                  photo: the words stay legible and the picture still reads.
                  Held dark through the bottom fifth because a phone tile is
                  short and the title fills much of its lower half. Measured on
                  the test photos, against the brightest pixel behind the title:
                  6.1:1 worst at 390px, 9.0:1 at 1440px — re-measure with real
                  photographs. `bg-linear-to-t`, not `bg-gradient-to-t`: the
                  legacy alias silently drops the gradient once a stop position
                  like `from-20%` is added. */}
              <div
                aria-hidden
                className="absolute inset-0 bg-linear-to-t from-brand/85 from-20% via-brand/40 via-55% to-transparent"
              />

              <span className="relative p-3 text-base font-bold tracking-tight text-cream sm:text-lg md:p-4">
                {tile.title}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

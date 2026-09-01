"use client"

import Link from "next/link"
import { useRef } from "react"

import { ProductCard } from "@/components/shared/ProductCard"
import type { ProductSummary } from "@/lib/data/products"
import { cn } from "@/lib/utils/format"

export type ProductRailProps = {
  title: string
  products: ProductSummary[]
  viewAllHref?: string
  /** Set on the first rail on a page — its images are LCP candidates. */
  priority?: boolean
  className?: string
}

function Arrow({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden className="size-5">
      <path
        d={direction === "left" ? "M12 4l-6 6 6 6" : "M8 4l6 6-6 6"}
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * Horizontally scrolling row of products. Used three times on the home page and
 * again for related items on the product page.
 *
 * Native overflow scrolling with CSS scroll-snap, not a JS carousel — it keeps
 * momentum and rubber-banding on touch, which a hand-written carousel loses,
 * and it costs nothing on a mid-range Android.
 */
export function ProductRail({
  title,
  products,
  viewAllHref,
  priority = false,
  className,
}: ProductRailProps) {
  const scroller = useRef<HTMLDivElement>(null)

  const scrollByCard = (direction: -1 | 1) => {
    const el = scroller.current

    if (!el) {
      return
    }

    // One card plus its gap, measured from the real first child rather than a
    // hardcoded number — the card width changes at every breakpoint.
    const card = el.firstElementChild as HTMLElement | null
    const step = card ? card.offsetWidth + 16 : el.clientWidth * 0.8

    el.scrollBy({ left: step * direction, behavior: "smooth" })
  }

  if (products.length === 0) {
    return null
  }

  return (
    <section className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-bold text-brand sm:text-xl">{title}</h2>

        <div className="flex items-center gap-2">
          {viewAllHref && (
            <Link
              href={viewAllHref}
              className="text-muted underline hover:text-brand"
            >
              View all
            </Link>
          )}

          {/* Desktop only. On touch these are dead weight and steal thumb
              space from the cards themselves. */}
          <div className="hidden items-center gap-1 sm:flex">
            {([-1, 1] as const).map((direction) => (
              <button
                key={direction}
                type="button"
                aria-label={direction === -1 ? "Scroll left" : "Scroll right"}
                onClick={() => scrollByCard(direction)}
                className={cn(
                  "flex size-9 items-center justify-center rounded-md border border-line",
                  "text-brand hover:bg-brand/5",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                )}
              >
                <Arrow direction={direction === -1 ? "left" : "right"} />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        ref={scroller}
        className={cn(
          "flex snap-x snap-mandatory gap-4 overflow-x-auto",
          // Room for the focus ring, which would otherwise be clipped by the
          // scroll container.
          "-mx-1 px-1 pb-2",
          // Hides the bar on desktop without disabling scrolling.
          "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        )}
      >
        {products.map((product, index) => (
          <div
            key={product.id}
            className={cn(
              "shrink-0 snap-start",
              // Fractional widths on purpose: part of the next card stays
              // visible, which is what tells a thumb there is more to the
              // right. The last card still scrolls fully into view because the
              // container has no trailing padding beyond px-1.
              "w-[42%] sm:w-[30%] lg:w-[23%] xl:w-[19%]"
            )}
          >
            <ProductCard product={product} priority={priority && index < 2} />
          </div>
        ))}
      </div>
    </section>
  )
}

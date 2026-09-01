import Link from "next/link"

import { BRANDS } from "@/config/site"
import { cn } from "@/lib/utils/format"

/**
 * Brands the shop stocks.
 *
 * Rendered as text lockups rather than logo images, and deliberately so: the
 * catalogue records no manufacturer, so these names are placeholders from
 * config/site.ts. Inventing logo files would make placeholder data look
 * authoritative and risk shipping someone else's trademark.
 *
 * Greyscale-to-colour on hover is impossible without images, so the muted →
 * brand transition does the same job.
 *
 * Links point at categories until task 57 adds the `?brand=` filter param.
 */
export function BrandStrip({ className }: { className?: string }) {
  if (BRANDS.length === 0) {
    return null
  }

  return (
    <section aria-labelledby="brands" className={cn("w-full", className)}>
      <h2 id="brands" className="mb-4 text-lg font-bold sm:text-xl">
        Brands we stock
      </h2>

      {/* Wraps naturally at 360px into two or three rows; settles into one row
          from lg. Not a grid — brand names have very different widths and a
          grid would leave ragged gaps. */}
      <ul className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
        {BRANDS.map((brand) => (
          <li key={brand.name}>
            <Link
              href={brand.href}
              className={cn(
                "flex min-h-11 items-center rounded-md border border-line bg-paper px-4",
                "font-medium text-muted transition-colors",
                "hover:border-brand hover:text-brand",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              )}
            >
              {brand.name}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

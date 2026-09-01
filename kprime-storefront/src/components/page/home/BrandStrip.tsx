import Image from "next/image"
import Link from "next/link"

import { BRANDS } from "@/config/site"
import { cn } from "@/lib/utils/format"

/**
 * Brands the shop stocks.
 *
 * The logo files are placeholder wordmarks — see config/site.ts. They carry the
 * brand names but none of the trademarked artwork, because the catalogue
 * records no manufacturer yet and showing a real logo for a brand you do not
 * carry is a trademark problem, not a cosmetic one.
 *
 * Greyscale by default, colour on hover, per task 53 — a CSS filter on the
 * image rather than a text colour, because an SVG loaded through <img> is a
 * separate document and cannot inherit `currentColor` from this page. That is
 * also how real supplied logos will behave, so swapping them in needs no
 * change here.
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

      {/* Wraps into two or three rows at 360px, settles into one from lg. Not a
          grid — logo widths differ enough that fixed columns leave ragged
          gaps. */}
      <ul className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
        {BRANDS.map((brand) => (
          <li key={brand.name}>
            <Link
              href={brand.href}
              aria-label={brand.name}
              className={cn(
                "group flex h-16 w-32 items-center justify-center rounded-md",
                "border border-line bg-paper px-4 transition-colors",
                "hover:border-brand sm:w-36",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              )}
            >
              <Image
                src={brand.logo}
                alt={brand.name}
                width={200}
                height={48}
                // SVGs are vector already; the optimizer would only re-encode
                // them, and Next declines to process SVG by default anyway.
                unoptimized
                className={cn(
                  "h-auto w-full opacity-60 grayscale transition duration-200",
                  "group-hover:opacity-100 group-hover:grayscale-0"
                )}
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

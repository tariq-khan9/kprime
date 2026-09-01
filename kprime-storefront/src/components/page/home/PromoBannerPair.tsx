import Link from "next/link"

import { PROMO_BANNERS } from "@/config/site"
import { cn } from "@/lib/utils/format"

/**
 * Two merchandising cards.
 *
 * Stacked at 360px, side by side from md. Gradients stand in for artwork that
 * does not exist yet — deliberately not stock photography, so these cannot ship
 * by accident.
 */
export function PromoBannerPair({ className }: { className?: string }) {
  return (
    <section aria-label="Promotions" className={cn("w-full", className)}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
        {PROMO_BANNERS.map((promo) => (
          <Link
            key={promo.heading}
            href={promo.href}
            className={cn(
              "group flex overflow-hidden rounded-lg",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
              "focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
            )}
          >
            {/* Aspect ratio rather than a fixed height, so the pair stays
                balanced at every width instead of one card growing taller
                than the other as text wraps. */}
            <div
              className={cn(
                "flex aspect-[2/1] w-full items-end bg-gradient-to-br p-5 sm:aspect-[5/2]",
                promo.gradient
              )}
            >
              <div>
                <h3 className="text-lg font-bold text-cream sm:text-xl">
                  {promo.heading}
                </h3>
                <p className="mt-1 text-sm text-cream/80">{promo.subheading}</p>
                <span className="mt-3 inline-block text-sm font-medium text-cream underline">
                  Shop now
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

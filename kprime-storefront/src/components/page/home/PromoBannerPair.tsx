import Image from "next/image"
import Link from "next/link"

import { PROMO_BANNERS } from "@/static/promo"
import { cn } from "@/lib/utils/format"

/**
 * Two merchandising cards.
 *
 * Stacked at 360px, side by side from md. A card with an image draws it under a
 * navy scrim; one without falls back to its gradient.
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
                "relative flex aspect-[2/1] w-full items-end overflow-hidden bg-gradient-to-br p-5 sm:aspect-[5/2]",
                promo.gradient
              )}
            >
              {promo.image && (
                <>
                  <Image
                    src={promo.image}
                    alt={promo.imageAlt ?? ""}
                    fill
                    sizes="(min-width: 768px) 50vw, 100vw"
                    className="object-cover"
                  />

                  {/* The copy sits bottom-left, so the scrim is darkest there
                      and thins towards the top, letting the photo read. */}
                  <div
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-t from-brand/90 via-brand/50 to-brand/10"
                  />
                </>
              )}

              {/* Relative so the copy stacks above the image and scrim. */}
              <div className="relative">
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

/**
 * The two promo banners under the product rails on the home page.
 *
 * Exactly two, and the type enforces it — the layout is a fixed pair, side by
 * side on desktop and stacked on a phone. A third would silently break the grid
 * rather than wrap somewhere sensible.
 *
 * `href` must be a real category handle or the banner 404s.
 */

export type PromoBanner = {
  /** The offer, in three or four words. */
  heading: string
  /** One line of detail underneath. */
  subheading: string
  /** Must be a real category handle. */
  href: string
  /**
   * Tailwind gradient classes. See the note in `src/static/hero.ts` on colour.
   *
   * Still required with an image: it shows until the photograph paints.
   */
  gradient: string
  /** Path under `public/`, e.g. `/promo/kitchen.jpg`. Omit for a gradient. */
  image?: string
  /** Describes the photograph. Required whenever `image` is set. */
  imageAlt?: string
}

/**
 * ⚠️ The first banner uses `sale` red.
 *
 * `sale` is reserved for discounts and savings (§2.3) — a red panel reading
 * "Kitchen essentials" implies a promotion that does not exist. It is left as
 * the build found it rather than changed silently, but it should either become
 * a real offer or move to the navy family.
 */
export const PROMO_BANNERS: [PromoBanner, PromoBanner] = [
  {
    heading: "Kitchen essentials",
    subheading: "Cookware, appliances and storage",
    href: "/categories/kitchenware",
    gradient: "from-sale/80 to-sale",
    image: "/promo/kitchen.jpg",
    imageAlt: "Pans of vegetables and soup cooking on a gas stove",
  },
  {
    heading: "Everyday cosmetics",
    subheading: "Skincare, makeup and fragrances",
    href: "/categories/cosmetics",
    gradient: "from-brand-light to-brand",
    image: "/promo/cosmetics.jpg",
    imageAlt: "Pink skincare jars, tubes, a lipstick and a serum bottle laid out on a pale pink surface",
  },
]

/**
 * The "Brands we stock" strip on the home page.
 *
 * ⚠️ **PLACEHOLDER, and legally load-bearing.**
 *
 * The files in `public/brands/` are wordmarks generated for this build — each
 * brand's name as plain type beside a simple geometric mark. They are **not**
 * reproductions of anyone's trademarked logo artwork, and that matters twice
 * over: the catalogue records no manufacturer, so the shop does not currently
 * stock any of these, and displaying a real logo for a brand you do not carry
 * is a trademark problem rather than a theoretical one.
 *
 * Before launch, either replace these with logos the brands have supplied and
 * that the shop genuinely stocks, or delete the strip. Do not swap in logos
 * pulled from the internet.
 *
 * The SVGs use `currentColor`, so the strip's muted-to-brand hover keeps
 * working whatever replaces them.
 *
 * `href` points at a category until a `?brand=` filter exists.
 */

export type Brand = {
  name: string
  /** Path under `public/`, e.g. `/brands/anker.svg`. */
  logo: string
  /** Must be a real category handle. */
  href: string
}

/**
 * Annotated rather than `as const`: the literal tuple type would make
 * BrandStrip's empty-list guard a compile error, since TypeScript would know
 * the length is exactly six.
 */
export const BRANDS: Brand[] = [
  { name: "Samsung", logo: "/brands/samsung.svg", href: "/categories/electronics" },
  { name: "Lenovo", logo: "/brands/lenovo.svg", href: "/categories/computer-accessories" },
  { name: "HP", logo: "/brands/hp.svg", href: "/categories/computer-accessories" },
  { name: "Anker", logo: "/brands/anker.svg", href: "/categories/mobile-accessories" },
  { name: "Philips", logo: "/brands/philips.svg", href: "/categories/kitchen-appliances" },
  { name: "Logitech", logo: "/brands/logitech.svg", href: "/categories/computer-accessories" },
]

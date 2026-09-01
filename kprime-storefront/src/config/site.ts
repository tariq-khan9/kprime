/**
 * Shop-level content that is not product data.
 *
 * Kept here rather than inline in components so copy can be corrected without
 * touching layout code, and so the same strings are reused across the footer,
 * trust strip, confirmation page and contact page.
 */

/**
 * The SHOP's WhatsApp number — what a customer taps to message you.
 *
 * Not the customer's phone: that is collected at checkout (task 105) and is the
 * order identity key. This one exists because the build sends no order email and
 * no SMS, so the confirmation page plus this number is the only route a customer
 * has back to the shop.
 *
 * Digits only, country code first, no `+` — that is the format wa.me expects.
 */
export const WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "923000000000"

/** Whether the number above is still the placeholder. */
export const WHATSAPP_IS_PLACEHOLDER = WHATSAPP_NUMBER === "923000000000"

export function whatsappLink(message?: string): string {
  const base = `https://wa.me/${WHATSAPP_NUMBER}`
  return message ? `${base}?text=${encodeURIComponent(message)}` : base
}

export const SITE = {
  name: "Karkhano Prime",
  /** Split for the stacked lockup — KARKHANO small above PRIME large. */
  logo: { top: "KARKHANO", bottom: "PRIME" },
  tagline: "Electronics, cosmetics, kitchenware and bedding across Pakistan.",
} as const

/**
 * Announcement bar copy.
 *
 * Deliberately makes NO free-delivery claim — every zone configured in tasks 5
 * and 6 charges, and a promise here would contradict the checkout total.
 */
export const ANNOUNCEMENT = "Cash on delivery across Pakistan · Delivered in 2–5 days"

/**
 * Routes land in task 137. They 404 until then, which the build expects — the
 * footer is written once rather than revisited.
 */
export const POLICY_LINKS = [
  { label: "About us", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "FAQ", href: "/faq" },
  { label: "Shipping & delivery", href: "/shipping-and-delivery" },
  { label: "Returns & refunds", href: "/returns-and-refunds" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
] as const

export const HELP_LINKS = [{ label: "Track your order", href: "/track" }] as const

/* ------------------------------------------------------------------ *
 * Home page content
 *
 * PLACEHOLDER. Copy is honest — it promises nothing the store cannot do —
 * but the wording and artwork are drafts. Swapping these out is the whole
 * of the "real content" job; no component needs editing.
 * ------------------------------------------------------------------ */

export type HeroSlide = {
  heading: string
  subheading: string
  ctaLabel: string
  ctaHref: string
  /** Tailwind gradient classes, standing in until real photography exists. */
  gradient: string
}

export const HERO_SLIDES: HeroSlide[] = [
  {
    heading: "Cash on delivery, nationwide",
    subheading: "Pay when your order reaches you. No card, no advance.",
    ctaLabel: "Start shopping",
    ctaHref: "/categories/electronics",
    gradient: "from-brand to-brand-light",
  },
  {
    heading: "Electronics that last",
    subheading: "Chargers, audio and accessories with a warranty.",
    ctaLabel: "Browse electronics",
    ctaHref: "/categories/electronics",
    gradient: "from-brand-light to-brand",
  },
  {
    heading: "For the home",
    subheading: "Kitchenware and bedding, delivered in 2–5 days.",
    ctaLabel: "Browse home",
    ctaHref: "/categories/home-and-bedding",
    gradient: "from-brand to-action-ink",
  },
]

export type PromoBanner = {
  heading: string
  subheading: string
  href: string
  gradient: string
}

export const PROMO_BANNERS: [PromoBanner, PromoBanner] = [
  {
    heading: "Kitchen essentials",
    subheading: "Cookware, appliances and storage",
    href: "/categories/kitchenware",
    gradient: "from-sale/80 to-sale",
  },
  {
    heading: "Everyday cosmetics",
    subheading: "Skincare, makeup and fragrances",
    href: "/categories/cosmetics",
    gradient: "from-brand-light to-brand",
  },
]

/**
 * PLACEHOLDER brand names.
 *
 * The catalogue records no manufacturer — the product tags are attributes
 * (Imported, Bestseller), not brands. Rendered as text lockups rather than
 * invented logo images, so nobody mistakes them for real branding.
 *
 * `href` points at a category until task 57 introduces the `?brand=` param.
 */
export type Brand = { name: string; href: string; logo: string }

/**
 * PLACEHOLDER logos.
 *
 * The files in public/brands/ are wordmarks generated for this build — each
 * brand's NAME as plain type beside a simple geometric mark. They are NOT
 * reproductions of anyone's trademarked logo artwork, which matters twice
 * over: the catalogue records no manufacturer, so the shop does not currently
 * stock any of these, and displaying a real logo for a brand you do not carry
 * is a trademark problem rather than a theoretical one.
 *
 * Replace with real supplied logo files once the brands are genuine. They use
 * `currentColor`, so the strip's muted-to-brand hover keeps working.
 *
 * Annotated rather than `as const`: the literal tuple type would make
 * BrandStrip's empty-list guard a compile error, since TypeScript would know
 * the length is exactly 6.
 */
export const BRANDS: Brand[] = [
  { name: "Samsung", logo: "/brands/samsung.svg", href: "/categories/electronics" },
  { name: "Lenovo", logo: "/brands/lenovo.svg", href: "/categories/computer-accessories" },
  { name: "HP", logo: "/brands/hp.svg", href: "/categories/computer-accessories" },
  { name: "Anker", logo: "/brands/anker.svg", href: "/categories/mobile-accessories" },
  { name: "Philips", logo: "/brands/philips.svg", href: "/categories/kitchen-appliances" },
  { name: "Logitech", logo: "/brands/logitech.svg", href: "/categories/computer-accessories" },
]

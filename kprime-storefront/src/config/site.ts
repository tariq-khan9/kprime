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

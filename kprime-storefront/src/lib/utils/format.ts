import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Grouping only — the "Rs" is prepended by hand below.
 *
 * `style: "currency"` would emit a symbol too, but which symbol depends on the
 * runtime's ICU data, so the server and an older browser can disagree. The
 * prefix is part of the brand; it does not get to vary.
 *
 * en-PK groups in threes (1,234,567), not lakhs.
 */
const grouped = new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 })

/**
 * A price as KPrime shows it: `Rs 2,200`.
 *
 * The amount is in WHOLE RUPEES — no minor-unit division. Medusa v2 stores
 * decimal amounts and PKR is zero-decimal, so a product priced 2200 arrives as
 * `2200` and means Rs 2,200. Dividing by 100 here — the Medusa v1 habit — would
 * render every price on the site 100x too cheap, and it would look plausible.
 *
 * Unpriced products exist in the catalogue, so the null path is real: an em dash
 * rather than "Rs NaN".
 */
export function formatPKR(amount: number | null | undefined): string {
  // Not a falsy check. Zero is a real price and must render as "Rs 0";
  // `if (!amount)` would swallow it into the em dash.
  if (amount === null || amount === undefined || !Number.isFinite(amount)) {
    return "—"
  }

  return `Rs ${grouped.format(amount)}`
}

/**
 * Merge class names, letting the caller's win.
 *
 * clsx flattens conditionals; twMerge resolves Tailwind conflicts, so a
 * component styled `px-4` that is handed `px-8` actually renders at px-8 rather
 * than shipping both and letting CSS source order decide.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

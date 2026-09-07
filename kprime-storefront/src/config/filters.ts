/**
 * Filter ordering and exclusion. Nothing else.
 *
 * Filter groups are DERIVED from the catalogue (§2.1.2) — whatever options the
 * products carry become the sidebar, subject to the 25% coverage threshold.
 * This file never declares a filter into existence; add a product with a Fabric
 * option and Fabric appears on its own.
 *
 * Both lists hold option TITLES as spelled in admin. Matching is on the slug,
 * so "Bed Size", "bed size" and "bed-size" all refer to the same group.
 */

/**
 * Groups listed here sort first, in this order.
 *
 * Anything not named follows in coverage order — commonest first — so a new
 * option never needs a code change to appear sensibly. The point of the list is
 * that cross-cutting attributes a shopper actually filters on should outrank
 * long-tail specs, regardless of which happens to be commonest.
 */
export const FILTER_ORDER: string[] = [
  // `Size` is deliberately absent — OPTION-SHEET.md retired it because it meant
  // millilitres in Cosmetics and centimetres in Cookware at the same time.
  // Listing it here would rank a group that must never exist again.
  "Brand",
  "Colour",
  "Shade",
  "Bed Size",
  "Pack Size",
  "Volume",
  "Diameter",
  "Capacity",
  "Wattage",
  "Switch Type",
  "Connection",
  "Fit",
  "Material",
  "Finish",
  "Skin Type",
  "Layout",
  "Length",
  "Age Range",
]

/**
 * Groups never rendered, whatever their coverage.
 *
 * For options that exist to create variants but are meaningless as a filter —
 * nobody browses by SKU suffix. Empty is the right default: hiding a group a
 * shopper wants is worse than showing one they ignore.
 */
export const FILTER_HIDDEN: string[] = []

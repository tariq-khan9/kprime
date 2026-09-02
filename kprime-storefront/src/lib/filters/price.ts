import type { ProductSummary } from "@/lib/data/products"
import type { PriceRange } from "@/lib/filters/url-state"

/**
 * Price filtering, in the Next.js server layer.
 *
 * Not a Medusa param: prices are calculated per region at query time, so §2.1
 * fetches the full set and narrows it here. Pure functions, no React — the same
 * shape as url-state.ts, and testable without a DOM.
 */

/** Just the price fields, so tests need not build a whole ProductSummary. */
type Priced = Pick<ProductSummary, "priceRange">

function isEmpty(range: PriceRange | null | undefined): boolean {
  return !range || (range.min === undefined && range.max === undefined)
}

/**
 * Does any of this product's variants fall inside the range?
 *
 * An OVERLAP test, not containment. A product with variants at Rs 1,000 and
 * Rs 9,000 matches a 5,000–10,000 filter, because the customer is looking for
 * something in that band and this product has one. Matching on the cheapest
 * variant alone would hide it behind its Rs 1,000 "from" price.
 *
 * Bounds are INCLUSIVE at both ends. A product priced exactly 5,000 matches
 * `5000-10000`. Exclusive bounds are the off-by-one that makes a slider dragged
 * onto a product's exact price hide that product.
 */
export function matchesPrice(
  product: Priced,
  range: PriceRange | null | undefined
): boolean {
  if (isEmpty(range)) {
    return true
  }

  // Unpriced products cannot satisfy a price filter — but see filterByPrice:
  // they are kept when no filter is set, rather than being permanently hidden.
  if (!product.priceRange) {
    return false
  }

  const { min: low, max: high } = product.priceRange

  if (range!.min !== undefined && high < range!.min) {
    return false
  }

  if (range!.max !== undefined && low > range!.max) {
    return false
  }

  return true
}

export function filterByPrice<T extends Priced>(
  products: T[],
  range: PriceRange | null | undefined
): T[] {
  if (isEmpty(range)) {
    return products
  }

  return products.filter((product) => matchesPrice(product, range))
}

/**
 * True min and max across the set — the slider's endpoints (task 69).
 *
 * Read from `priceRange`, not `price`, so the ceiling reaches the dearest
 * variant rather than the dearest "from" price. Otherwise the slider could not
 * be dragged high enough to reach products it is meant to match.
 *
 * Must be computed BEFORE price filtering. Deriving it from the filtered set
 * would let the slider shrink its own bounds on every drag, and it could never
 * be widened again.
 */
export function priceBoundsOf(
  products: Priced[]
): { min: number; max: number } | null {
  let min = Infinity
  let max = -Infinity

  for (const product of products) {
    if (!product.priceRange) {
      continue
    }

    min = Math.min(min, product.priceRange.min)
    max = Math.max(max, product.priceRange.max)
  }

  // Nothing priced at all — the slider should not render.
  return Number.isFinite(min) ? { min, max } : null
}

import { describe, expect, it } from "vitest"

import {
  filterByPrice,
  matchesPrice,
  priceBoundsOf,
} from "@/lib/filters/price"

/** A product whose variants all share one price. */
const flat = (id: string, price: number) => ({
  id,
  priceRange: { min: price, max: price },
})

/** A product whose variants span a range — 128GB costs more than 64GB. */
const spread = (id: string, min: number, max: number) => ({
  id,
  priceRange: { min, max },
})

const unpriced = (id: string) => ({ id, priceRange: null })

describe("matchesPrice — inclusive bounds", () => {
  // Exclusive bounds are the classic off-by-one: drag a slider onto a
  // product's exact price and the product disappears.
  it("matches a product sitting exactly on the lower bound", () => {
    expect(matchesPrice(flat("a", 5000), { min: 5000, max: 10000 })).toBe(true)
  })

  it("matches a product sitting exactly on the upper bound", () => {
    expect(matchesPrice(flat("a", 10000), { min: 5000, max: 10000 })).toBe(true)
  })

  it("excludes a product just outside either bound", () => {
    expect(matchesPrice(flat("a", 4999), { min: 5000, max: 10000 })).toBe(false)
    expect(matchesPrice(flat("a", 10001), { min: 5000, max: 10000 })).toBe(false)
  })
})

describe("matchesPrice — open-ended and absent ranges", () => {
  it("min only", () => {
    expect(matchesPrice(flat("a", 6000), { min: 5000 })).toBe(true)
    expect(matchesPrice(flat("a", 4000), { min: 5000 })).toBe(false)
  })

  it("max only", () => {
    expect(matchesPrice(flat("a", 4000), { max: 5000 })).toBe(true)
    expect(matchesPrice(flat("a", 6000), { max: 5000 })).toBe(false)
  })

  it("no range matches everything, including unpriced products", () => {
    expect(matchesPrice(flat("a", 6000), null)).toBe(true)
    expect(matchesPrice(flat("a", 6000), {})).toBe(true)
    expect(matchesPrice(unpriced("a"), null)).toBe(true)
  })
})

describe("matchesPrice — variants spanning the boundary", () => {
  // The decision this task settled: match on ANY variant, not the cheapest.
  // A phone at Rs 1,000 (64GB) to Rs 9,000 (512GB) is what a shopper filtering
  // 5,000–10,000 is looking for; hiding it behind its "from" price loses a sale.
  const phone = spread("phone", 1000, 9000)

  it("matches when the dearest variant is in range but the cheapest is not", () => {
    expect(matchesPrice(phone, { min: 5000, max: 10000 })).toBe(true)
  })

  it("matches when the cheapest variant is in range but the dearest is not", () => {
    expect(matchesPrice(phone, { min: 500, max: 2000 })).toBe(true)
  })

  it("matches a range entirely inside the product's own spread", () => {
    expect(matchesPrice(phone, { min: 3000, max: 4000 })).toBe(true)
  })

  it("excludes a product lying entirely above or below the range", () => {
    expect(matchesPrice(spread("a", 20000, 30000), { min: 1, max: 999 })).toBe(false)
    expect(matchesPrice(spread("a", 10, 20), { min: 5000, max: 10000 })).toBe(false)
  })
})

describe("matchesPrice — unpriced products", () => {
  it("cannot satisfy a price filter", () => {
    expect(matchesPrice(unpriced("a"), { min: 1 })).toBe(false)
    expect(matchesPrice(unpriced("a"), { max: 999999 })).toBe(false)
  })
})

describe("filterByPrice", () => {
  const products = [
    flat("cheap", 500),
    flat("mid", 5000),
    flat("dear", 50000),
    spread("spanning", 1000, 9000),
    unpriced("none"),
  ]

  it("keeps only overlapping products", () => {
    expect(filterByPrice(products, { min: 4000, max: 6000 }).map((p) => p.id)).toEqual([
      "mid",
      "spanning",
    ])
  })

  it("returns the set untouched when no range is set", () => {
    expect(filterByPrice(products, null)).toBe(products)
    expect(filterByPrice(products, {})).toBe(products)
  })

  it("returns an empty array when nothing matches, rather than throwing", () => {
    expect(filterByPrice(products, { min: 900000 })).toEqual([])
  })

  it("handles an empty input set", () => {
    expect(filterByPrice([], { min: 1, max: 2 })).toEqual([])
  })
})

describe("priceBoundsOf", () => {
  it("spans the full variant range, not just 'from' prices", () => {
    // 'spanning' tops out at 9000 — a bound taken from `price` would stop at
    // 1000 and the slider could never reach the products it should match.
    expect(priceBoundsOf([flat("a", 500), spread("spanning", 1000, 9000)])).toEqual({
      min: 500,
      max: 9000,
    })
  })

  it("ignores unpriced products", () => {
    expect(priceBoundsOf([unpriced("a"), flat("b", 700)])).toEqual({
      min: 700,
      max: 700,
    })
  })

  it("returns null for an empty set", () => {
    expect(priceBoundsOf([])).toBeNull()
  })

  it("returns null when nothing in the set is priced", () => {
    expect(priceBoundsOf([unpriced("a"), unpriced("b")])).toBeNull()
  })

  it("is unaffected by filtering — bounds come from the whole set", () => {
    const all = [flat("cheap", 100), flat("dear", 9000)]
    const bounds = priceBoundsOf(all)

    expect(priceBoundsOf(filterByPrice(all, { min: 5000 }))).not.toEqual(bounds)
    // Which is exactly why searchProducts computes bounds before filtering.
    expect(bounds).toEqual({ min: 100, max: 9000 })
  })
})

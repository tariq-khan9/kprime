import { describe, expect, it } from "vitest"

import type { ProductSummary } from "@/lib/data/products"
import {
  byRatingDesc,
  filterByRating,
  matchesRating,
  parseRating,
  ratingCounts,
  RATING_THRESHOLDS,
} from "@/lib/filters/rating"

function product(
  id: string,
  averageRating: number | null,
  reviewCount = 0
): ProductSummary {
  return {
    id,
    title: id,
    handle: id,
    thumbnail: null,
    price: 100,
    priceRange: { min: 100, max: 100 },
    originalPrice: null,
    currencyCode: "pkr",
    createdAt: "2026-01-01T00:00:00.000Z",
    tags: [],
    options: [],
    averageRating,
    reviewCount,
  }
}

const CATALOGUE = [
  product("five", 5, 10),
  product("four-five", 4.5, 3),
  product("four", 4, 1),
  product("three-nine", 3.9, 8),
  product("two", 2, 2),
  product("unrated", null, 0),
]

describe("parseRating", () => {
  it("accepts the offered thresholds", () => {
    for (const threshold of RATING_THRESHOLDS) {
      expect(parseRating(String(threshold))).toBe(threshold)
    }
  })

  it("rejects anything else", () => {
    // A hand-edited URL shows the unfiltered list, not an empty one.
    expect(parseRating("99")).toBeNull()
    expect(parseRating("5")).toBeNull()
    expect(parseRating("1")).toBeNull()
    expect(parseRating("abc")).toBeNull()
    expect(parseRating("")).toBeNull()
    expect(parseRating(null)).toBeNull()
    expect(parseRating(undefined)).toBeNull()
  })
})

describe("matchesRating", () => {
  it("is a floor, not an exact match", () => {
    expect(matchesRating(product("a", 4.5), 4)).toBe(true)
    expect(matchesRating(product("a", 4), 4)).toBe(true)
    expect(matchesRating(product("a", 3.9), 4)).toBe(false)
  })

  it("never matches an unrated product", () => {
    // Unrated is not badly rated, but it is not evidence of quality either.
    expect(matchesRating(product("a", null), 4)).toBe(false)
    expect(matchesRating(product("a", null), 2)).toBe(false)
  })

  it("matches everything when no minimum is set", () => {
    expect(matchesRating(product("a", null), null)).toBe(true)
    expect(matchesRating(product("a", 1), null)).toBe(true)
  })
})

describe("filterByRating", () => {
  it("keeps only products at or above the floor", () => {
    expect(filterByRating(CATALOGUE, 4).map((p) => p.id)).toEqual([
      "five",
      "four-five",
      "four",
    ])
  })

  it("widens as the floor drops", () => {
    expect(filterByRating(CATALOGUE, 3)).toHaveLength(4)
    expect(filterByRating(CATALOGUE, 2)).toHaveLength(5)
  })

  it("returns the input untouched with no filter", () => {
    expect(filterByRating(CATALOGUE, null)).toHaveLength(CATALOGUE.length)
  })

  it("excludes unrated products at every threshold", () => {
    for (const threshold of RATING_THRESHOLDS) {
      expect(
        filterByRating(CATALOGUE, threshold).some((p) => p.id === "unrated")
      ).toBe(false)
    }
  })
})

describe("ratingCounts", () => {
  it("counts against the unfiltered set", () => {
    expect(ratingCounts(CATALOGUE)).toEqual([
      { minimum: 4, count: 3 },
      { minimum: 3, count: 4 },
      { minimum: 2, count: 5 },
    ])
  })
})

describe("byRatingDesc", () => {
  it("orders highest first", () => {
    expect([...CATALOGUE].sort(byRatingDesc).map((p) => p.id)).toEqual([
      "five",
      "four-five",
      "four",
      "three-nine",
      "two",
      "unrated",
    ])
  })

  it("puts unrated last, not with the worst", () => {
    const sorted = [product("unrated", null), product("one-star", 1)].sort(
      byRatingDesc
    )

    expect(sorted.map((p) => p.id)).toEqual(["one-star", "unrated"])
  })

  it("breaks ties on review count", () => {
    // 5.0 from twenty people is a stronger claim than 5.0 from one.
    const sorted = [product("few", 5, 1), product("many", 5, 20)].sort(
      byRatingDesc
    )

    expect(sorted.map((p) => p.id)).toEqual(["many", "few"])
  })
})

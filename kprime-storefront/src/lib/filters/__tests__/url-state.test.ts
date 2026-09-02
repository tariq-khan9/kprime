import { describe, expect, it } from "vitest"

import {
  activeFilterEntries,
  addValue,
  buildHref,
  clearAll,
  clearGroup,
  DEFAULT_SORT,
  defaultSortFor,
  EMPTY_STATE,
  hasActiveFilters,
  parseFilters,
  removeValue,
  serialiseFilters,
  setPage,
  setPrice,
  setSort,
  toggleValue,
} from "@/lib/filters/url-state"

const FOUR_FILTERS = "brand=anker&color=blue%2Cred&price=1000-5000&sort=price_asc"

describe("parseFilters", () => {
  it("reads groups, price, sort and page", () => {
    const state = parseFilters(
      new URLSearchParams("color=red,blue&brand=anker&price=1000-5000&sort=price_asc&page=2")
    )

    expect(state.groups).toEqual({ color: ["red", "blue"], brand: ["anker"] })
    expect(state.price).toEqual({ min: 1000, max: 5000 })
    expect(state.sort).toBe("price_asc")
    expect(state.page).toBe(2)
  })

  it("accepts Next's plain-object searchParams", () => {
    const state = parseFilters({ color: "red,blue", page: "3" })

    expect(state.groups.color).toEqual(["red", "blue"])
    expect(state.page).toBe(3)
  })

  it("never treats a reserved key as a facet group", () => {
    const state = parseFilters(new URLSearchParams("sort=title&page=2&q=shirt&price=1-2"))
    expect(state.groups).toEqual({})
    expect(state.q).toBe("shirt")
  })

  it("deduplicates repeated values", () => {
    expect(parseFilters(new URLSearchParams("color=red,red,blue")).groups.color).toEqual([
      "red",
      "blue",
    ])
  })

  it("handles open-ended price ranges", () => {
    expect(parseFilters(new URLSearchParams("price=1000-")).price).toEqual({ min: 1000 })
    expect(parseFilters(new URLSearchParams("price=-5000")).price).toEqual({ max: 5000 })
  })

  it("swaps inverted price bounds rather than matching nothing", () => {
    expect(parseFilters(new URLSearchParams("price=5000-1000")).price).toEqual({
      min: 1000,
      max: 5000,
    })
  })
})

describe("parseFilters — malformed URLs must degrade, never throw", () => {
  // These are all reachable by hand-editing the address bar.
  it("ignores an unparseable price", () => {
    expect(parseFilters(new URLSearchParams("price=abc")).price).toBeNull()
    expect(parseFilters(new URLSearchParams("price=")).price).toBeNull()
  })

  it("falls back on an unknown sort", () => {
    expect(parseFilters(new URLSearchParams("sort=cheapest")).sort).toBe(DEFAULT_SORT)
  })

  it("defaults to relevance when a query is present", () => {
    expect(parseFilters(new URLSearchParams("q=mouse")).sort).toBe("relevance")
    expect(parseFilters(new URLSearchParams("")).sort).toBe("newest")
  })

  it("lets an explicit sort beat the query default", () => {
    expect(parseFilters(new URLSearchParams("q=mouse&sort=price_asc")).sort).toBe(
      "price_asc"
    )
  })

  it("rejects relevance without a query", () => {
    // Hand-edited URL. Relevance has nothing to rank against here, and the
    // dropdown does not offer it, so it must not survive into state.
    expect(parseFilters(new URLSearchParams("sort=relevance")).sort).toBe("newest")
  })

  it("omits the sort when it matches the query-dependent default", () => {
    const searching = parseFilters(new URLSearchParams("q=mouse"))
    expect(serialiseFilters(searching)).toBe("q=mouse")

    // Choosing Newest on a search IS a departure from the default, so it has to
    // be written or a reload would silently reorder the results.
    expect(serialiseFilters(setSort(searching, "newest"))).toBe(
      "q=mouse&sort=newest"
    )
  })

  it("round-trips a search state through the URL", () => {
    const state = parseFilters(new URLSearchParams("q=mouse&sort=title"))
    expect(parseFilters(new URLSearchParams(serialiseFilters(state)))).toEqual(state)
  })

  it("defaultSortFor keys off the query", () => {
    expect(defaultSortFor("mouse")).toBe("relevance")
    expect(defaultSortFor(null)).toBe(DEFAULT_SORT)
  })

  it("clamps a bad page to 1", () => {
    expect(parseFilters(new URLSearchParams("page=-1")).page).toBe(1)
    expect(parseFilters(new URLSearchParams("page=0")).page).toBe(1)
    expect(parseFilters(new URLSearchParams("page=abc")).page).toBe(1)
    expect(parseFilters(new URLSearchParams("page=1.5")).page).toBe(1)
  })

  it("drops empty group values", () => {
    expect(parseFilters(new URLSearchParams("color=,,")).groups).toEqual({})
  })
})

describe("serialiseFilters", () => {
  it("round-trips a 4-filter URL", () => {
    const state = parseFilters(new URLSearchParams(FOUR_FILTERS))
    expect(serialiseFilters(state)).toBe(FOUR_FILTERS)
  })

  it("omits defaults so an unfiltered URL is clean", () => {
    expect(serialiseFilters(EMPTY_STATE)).toBe("")
    expect(serialiseFilters({ ...EMPTY_STATE, sort: DEFAULT_SORT, page: 1 })).toBe("")
  })

  it("produces the same string regardless of insertion order", () => {
    const a = addValue(addValue(EMPTY_STATE, "color", "red"), "brand", "anker")
    const b = addValue(addValue(EMPTY_STATE, "brand", "anker"), "color", "red")
    expect(serialiseFilters(a)).toBe(serialiseFilters(b))
  })

  it("builds an href, dropping the ? when there is no query", () => {
    expect(buildHref("/categories/audio", EMPTY_STATE)).toBe("/categories/audio")
    expect(buildHref("/categories/audio", setSort(EMPTY_STATE, "title"))).toBe(
      "/categories/audio?sort=title"
    )
  })
})

describe("mutations", () => {
  const base = parseFilters(new URLSearchParams("color=red,blue&brand=anker&page=4"))

  it("removes one value from a multi-value group, leaving the rest", () => {
    const next = removeValue(base, "color", "red")
    expect(next.groups.color).toEqual(["blue"])
    expect(next.groups.brand).toEqual(["anker"])
  })

  it("drops the key when its last value is removed", () => {
    const next = removeValue(base, "brand", "anker")
    expect(next.groups).not.toHaveProperty("brand")
    expect(serialiseFilters(next)).not.toContain("brand")
  })

  it("toggles a value on and off", () => {
    const on = toggleValue(EMPTY_STATE, "color", "red")
    expect(on.groups.color).toEqual(["red"])
    expect(toggleValue(on, "color", "red").groups).toEqual({})
  })

  it("adding an existing value is a no-op", () => {
    expect(addValue(base, "brand", "anker")).toBe(base)
  })

  it("clears one group without touching the others", () => {
    const next = clearGroup(base, "color")
    expect(next.groups).toEqual({ brand: ["anker"] })
  })

  it("clears all filters but keeps q and sort", () => {
    const state = parseFilters(new URLSearchParams("color=red&q=shirt&sort=price_asc"))
    const next = clearAll(state)

    expect(next.groups).toEqual({})
    expect(next.price).toBeNull()
    // Clearing filters on a search page must not throw away the search itself.
    expect(next.q).toBe("shirt")
    expect(next.sort).toBe("price_asc")
  })

  it("treats an empty price range as no filter", () => {
    expect(setPrice(base, {}).price).toBeNull()
    expect(setPrice(base, null).price).toBeNull()
  })
})

describe("page reset — the rule that stops empty result pages", () => {
  const onPageFour = parseFilters(new URLSearchParams("color=red&page=4"))

  it("resets to page 1 when a filter is added", () => {
    expect(addValue(onPageFour, "brand", "anker").page).toBe(1)
  })

  it("resets when a filter is removed", () => {
    expect(removeValue(onPageFour, "color", "red").page).toBe(1)
  })

  it("resets when the price changes", () => {
    expect(setPrice(onPageFour, { min: 500 }).page).toBe(1)
  })

  it("resets when the sort changes", () => {
    expect(setSort(onPageFour, "price_desc").page).toBe(1)
  })

  it("resets on clear all and clear group", () => {
    expect(clearAll(onPageFour).page).toBe(1)
    expect(clearGroup(onPageFour, "color").page).toBe(1)
  })

  it("does NOT reset when paging — that is the whole point", () => {
    expect(setPage(onPageFour, 7).page).toBe(7)
  })

  it("clamps setPage to a sane value", () => {
    expect(setPage(onPageFour, 0).page).toBe(1)
    expect(setPage(onPageFour, -3).page).toBe(1)
    expect(setPage(onPageFour, 2.9).page).toBe(2)
  })
})

describe("helpers", () => {
  it("reports whether anything is filtering the set", () => {
    expect(hasActiveFilters(EMPTY_STATE)).toBe(false)
    // Sort and page are not filters — they do not change what matches.
    expect(hasActiveFilters(setSort(setPage(EMPTY_STATE, 3), "title"))).toBe(false)
    expect(hasActiveFilters(addValue(EMPTY_STATE, "color", "red"))).toBe(true)
    expect(hasActiveFilters(setPrice(EMPTY_STATE, { min: 100 }))).toBe(true)
  })

  it("flattens active filters for the chip row", () => {
    const state = parseFilters(new URLSearchParams("color=red,blue&brand=anker"))

    expect(activeFilterEntries(state)).toEqual([
      { group: "color", value: "red" },
      { group: "color", value: "blue" },
      { group: "brand", value: "anker" },
    ])
  })
})

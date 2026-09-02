import { describe, expect, it } from "vitest"

import {
  COVERAGE_THRESHOLD,
  deriveFacets,
  facetKey,
  filterByFacets,
  matchesFacets,
  selectedOptionValueIds,
} from "@/lib/filters/facets"

/** A product carrying the given options. Ids are per-product, as in Medusa. */
const product = (
  id: string,
  options: Record<string, string[]>
) => ({
  id,
  options: Object.entries(options).map(([title, values]) => ({
    title,
    // Ids embed the product id, mirroring reality: the same value string on
    // two products has two different ids.
    values: values.map((value) => ({ id: `optval_${id}_${value}`, value })),
  })),
})

const bare = (id: string) => ({ id, options: [] })

describe("deriveFacets — grouping by value string", () => {
  it("collapses the same value across products into one group value", () => {
    // The bug this prevents: grouping by id gives two separate "Red" filters.
    const facets = deriveFacets([
      product("a", { Colour: ["Red"] }),
      product("b", { Colour: ["Red"] }),
    ])

    const red = facets[0].values.find((v) => v.value === "Red")!

    expect(facets).toHaveLength(1)
    expect(facets[0].values).toHaveLength(1)
    expect(red.count).toBe(2)
    expect(red.optionValueIds).toHaveLength(2)
    expect(red.optionValueIds).toEqual([
      "optval_a_Red",
      "optval_b_Red",
    ])
  })

  it("matches values case-insensitively but keeps the original for display", () => {
    const facets = deriveFacets([
      product("a", { Colour: ["Red"] }),
      product("b", { Colour: ["red"] }),
    ])

    expect(facets[0].values).toHaveLength(1)
    expect(facets[0].values[0].count).toBe(2)
  })

  it("slugs the title for the URL while keeping it for display", () => {
    const facets = deriveFacets([product("a", { "Switch Type": ["Blue"] })], {
      threshold: 0,
    })

    expect(facets[0].title).toBe("Switch Type")
    expect(facets[0].key).toBe("switch-type")
  })

  it("returns nothing for an empty set", () => {
    expect(deriveFacets([])).toEqual([])
  })

  it("ignores products with no options", () => {
    expect(deriveFacets([bare("a"), bare("b")])).toEqual([])
  })
})

describe("deriveFacets — coverage threshold", () => {
  /** n products, `covered` of which carry a Fabric option. */
  const set = (total: number, covered: number) => [
    ...Array.from({ length: covered }, (_, i) =>
      product(`c${i}`, { Fabric: ["Cotton"] })
    ),
    ...Array.from({ length: total - covered }, (_, i) => bare(`b${i}`)),
  ]

  it("drops a group at 24%", () => {
    // 24 of 100 — just under. This is the case §2.1.2 exists to kill.
    expect(deriveFacets(set(100, 24)).map((f) => f.title)).toEqual([])
  })

  it("keeps a group at 26%", () => {
    expect(deriveFacets(set(100, 26)).map((f) => f.title)).toEqual(["Fabric"])
  })

  it("keeps a group sitting exactly on the threshold", () => {
    // The rule is "≥25%", so 25 of 100 stays.
    expect(deriveFacets(set(100, 25)).map((f) => f.title)).toEqual(["Fabric"])
    expect(COVERAGE_THRESHOLD).toBe(0.25)
  })

  it("reports coverage as a fraction", () => {
    expect(deriveFacets(set(100, 40))[0].coverage).toBeCloseTo(0.4)
    expect(deriveFacets(set(100, 40))[0].count).toBe(40)
  })

  it("threshold 0 keeps everything — how task 62 audits the catalogue", () => {
    expect(deriveFacets(set(100, 1), { threshold: 0 })).toHaveLength(1)
  })

  it("orders groups by coverage, commonest first", () => {
    const products = [
      product("a", { Colour: ["Red"], Size: ["S"] }),
      product("b", { Colour: ["Blue"] }),
      product("c", { Colour: ["Green"] }),
      product("d", { Colour: ["Black"] }),
    ]

    expect(deriveFacets(products).map((f) => f.title)).toEqual(["Colour", "Size"])
  })

  it("orders values within a group by count, commonest first", () => {
    const products = [
      product("a", { Colour: ["Black"] }),
      product("b", { Colour: ["Black"] }),
      product("c", { Colour: ["White"] }),
    ]

    expect(deriveFacets(products)[0].values.map((v) => v.value)).toEqual([
      "Black",
      "White",
    ])
  })
})

describe("matchesFacets — OR within a group", () => {
  const black = product("a", { Colour: ["Black"] })
  const white = product("b", { Colour: ["White"] })
  const green = product("c", { Colour: ["Green"] })

  it("matches any one of the selected values", () => {
    const selected = { colour: ["black", "white"] }

    expect(matchesFacets(black, selected)).toBe(true)
    expect(matchesFacets(white, selected)).toBe(true)
    expect(matchesFacets(green, selected)).toBe(false)
  })

  it("matches regardless of case in the URL", () => {
    expect(matchesFacets(black, { colour: ["BLACK"] })).toBe(true)
  })

  it("an empty selection matches everything", () => {
    expect(matchesFacets(green, {})).toBe(true)
    expect(matchesFacets(green, { colour: [] })).toBe(true)
  })
})

describe("matchesFacets — AND across groups", () => {
  const blackSmall = product("a", { Colour: ["Black"], Size: ["S"] })
  const blackLarge = product("b", { Colour: ["Black"], Size: ["L"] })
  const whiteSmall = product("c", { Colour: ["White"], Size: ["S"] })

  it("narrows: both groups must be satisfied", () => {
    const selected = { colour: ["black"], size: ["s"] }

    expect(matchesFacets(blackSmall, selected)).toBe(true)
    expect(matchesFacets(blackLarge, selected)).toBe(false)
    expect(matchesFacets(whiteSmall, selected)).toBe(false)
  })

  it("excludes a product lacking an active group's option entirely", () => {
    // Filtering on Colour must not return products that have no colour.
    const noColour = product("d", { Size: ["S"] })
    expect(matchesFacets(noColour, { colour: ["black"] })).toBe(false)
  })
})

describe("filterByFacets", () => {
  const products = [
    product("a", { Colour: ["Black"], Size: ["S"] }),
    product("b", { Colour: ["Black"], Size: ["L"] }),
    product("c", { Colour: ["White"], Size: ["S"] }),
    bare("d"),
  ]

  it("ANDs across groups and ORs within", () => {
    expect(
      filterByFacets(products, { colour: ["black", "white"], size: ["s"] }).map(
        (p) => p.id
      )
    ).toEqual(["a", "c"])
  })

  it("returns the set untouched when nothing is selected", () => {
    expect(filterByFacets(products, {})).toBe(products)
    expect(filterByFacets(products, { colour: [] })).toBe(products)
  })

  it("returns empty rather than throwing when nothing matches", () => {
    expect(filterByFacets(products, { colour: ["magenta"] })).toEqual([])
  })
})

describe("selectedOptionValueIds", () => {
  it("returns every id behind a chosen value, across all products", () => {
    const products = [
      product("a", { Colour: ["Black"] }),
      product("b", { Colour: ["Black"] }),
      product("c", { Colour: ["White"] }),
    ]

    const facets = deriveFacets(products)

    // Nine products in Black have nine ids; a filter passing one would match
    // a single product.
    expect(selectedOptionValueIds(facets, { colour: ["black"] })).toEqual([
      "optval_a_Black",
      "optval_b_Black",
    ])
  })

  it("returns nothing when nothing is selected", () => {
    expect(selectedOptionValueIds(deriveFacets([product("a", { Colour: ["Red"] })]), {})).toEqual([])
  })
})

describe("facetKey", () => {
  it("slugs titles for URLs", () => {
    expect(facetKey("Colour")).toBe("colour")
    expect(facetKey("Switch Type")).toBe("switch-type")
    expect(facetKey("  Bed Size  ")).toBe("bed-size")
    expect(facetKey("RAM / Storage")).toBe("ram-storage")
  })
})

import type { ProductSummary } from "@/lib/data/products"

/**
 * Filter groups derived from the data, not declared anywhere (§2.1.2).
 *
 * Whatever options the catalogue actually carries become the sidebar. Nothing
 * lists "Colour" or "Wattage" in code — add a product with a Fabric option and
 * a Fabric filter appears on its own.
 *
 * Filtering runs HERE, in server memory, not as a Medusa query param. Verified
 * against the live API: `option_value_id` is ANDed at the variant level, so
 * passing the ids for Black and White asks for a variant that is both, and
 * returns nothing. Facets need OR within a group, which the native filter
 * cannot express. Doing it in memory also means one cached set per category
 * serves every filter combination instead of one entry per selection.
 */

/**
 * A filter group renders only if it applies to at least this share of the
 * listing. **0.6, and it is load-bearing against the three-level category tree.**
 *
 * At 0.25, `/categories/mobile-accessories` offered Wattage, Length and Capacity
 * beside Colour — each applying to about a quarter of the shelf, because each
 * belongs to one leaf (chargers, cables, power banks). Ticking `Wattage 45W`
 * took 45 products down to one. The sidebar looked like it described the
 * category when it actually described three unrelated groups of things.
 *
 * Leaves are option-uniform by construction (see `data/catalogue.ts`), so every
 * option inside a leaf sits at 100% and always renders. Anything that applies to
 * only part of a wider listing now drops out: specific filters appear exactly
 * where the specific items are, and never above them.
 *
 * Raising this hides filters on any listing whose products are NOT
 * option-uniform, which is the intent — but it means a mixed category shows
 * fewer filters than it would have. Check `/dev/facets` after any import.
 */
export const COVERAGE_THRESHOLD = 0.6

export type FacetValue = {
  /** The value as shown, e.g. "Black". */
  value: string
  /** Lowercased, as it appears in the URL. */
  key: string
  /**
   * EVERY option-value id meaning this string.
   *
   * Option values are per-product records, so nine products in Black have nine
   * different ids. A filter that passed only one would match a single product.
   */
  optionValueIds: string[]
  /** Products in the set carrying this value. */
  count: number
}

export type Facet = {
  /** Display title, e.g. "Switch Type". */
  title: string
  /** URL-safe slug, e.g. "switch-type". */
  key: string
  values: FacetValue[]
  /** Products carrying this option at all. */
  count: number
  /** `count` as a share of the whole set, 0–1. */
  coverage: number
}

/** "Switch Type" → "switch-type". */
export function facetKey(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/** Values are matched case-insensitively, so the URL can stay lowercase. */
export function valueKey(value: string): string {
  return value.trim().toLowerCase()
}

export type DeriveOptions = {
  /** Defaults to COVERAGE_THRESHOLD. 0 keeps every group — used by task 62. */
  threshold?: number
}

/**
 * Group option values by their STRING and collect every id per group.
 *
 * Grouping by id would produce nine separate "Black" filters, one per product.
 */
export function deriveFacets(
  products: Pick<ProductSummary, "options">[],
  { threshold = COVERAGE_THRESHOLD }: DeriveOptions = {}
): Facet[] {
  if (products.length === 0) {
    return []
  }

  type Draft = {
    title: string
    productCount: number
    values: Map<string, { value: string; ids: Set<string>; count: number }>
  }

  const drafts = new Map<string, Draft>()

  for (const product of products) {
    // A product could in principle carry the same option twice; count it once
    // so coverage can never exceed 100%.
    const seenTitles = new Set<string>()

    for (const option of product.options ?? []) {
      const key = facetKey(option.title)

      if (!key) {
        continue
      }

      const draft = drafts.get(key) ?? {
        title: option.title,
        productCount: 0,
        values: new Map(),
      }

      if (!seenTitles.has(key)) {
        draft.productCount += 1
        seenTitles.add(key)
      }

      const seenValues = new Set<string>()

      for (const { id, value } of option.values ?? []) {
        const vKey = valueKey(value)

        if (!vKey) {
          continue
        }

        const entry = draft.values.get(vKey) ?? {
          value,
          ids: new Set<string>(),
          count: 0,
        }

        entry.ids.add(id)

        if (!seenValues.has(vKey)) {
          entry.count += 1
          seenValues.add(vKey)
        }

        draft.values.set(vKey, entry)
      }

      drafts.set(key, draft)
    }
  }

  return [...drafts.entries()]
    .map(([key, draft]) => ({
      title: draft.title,
      key,
      count: draft.productCount,
      coverage: draft.productCount / products.length,
      values: [...draft.values.entries()]
        .map(([vKey, entry]) => ({
          value: entry.value,
          key: vKey,
          optionValueIds: [...entry.ids].sort(),
          count: entry.count,
        }))
        // Commonest first, then alphabetical — a stable order, so the sidebar
        // does not reshuffle between renders.
        .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value)),
    }))
    .filter((facet) => facet.coverage >= threshold)
    .sort((a, b) => b.coverage - a.coverage || a.title.localeCompare(b.title))
}

/** Selected values by facet key, straight from the URL: `{ colour: ["black"] }`. */
export type SelectedFacets = Record<string, string[]>

/**
 * OR within a group, AND across groups.
 *
 * A product lacking an active group's option is excluded — filtering on Colour
 * should not return products that have no colour at all.
 */
export function matchesFacets(
  product: Pick<ProductSummary, "options">,
  selected: SelectedFacets
): boolean {
  const active = Object.entries(selected).filter(([, values]) => values.length)

  if (active.length === 0) {
    return true
  }

  const own = new Map<string, Set<string>>()

  for (const option of product.options ?? []) {
    const key = facetKey(option.title)
    const values = own.get(key) ?? new Set<string>()

    for (const { value } of option.values ?? []) {
      values.add(valueKey(value))
    }

    own.set(key, values)
  }

  // AND: every active group must be satisfied.
  return active.every(([key, wanted]) => {
    const mine = own.get(key)

    if (!mine) {
      return false
    }

    // OR: any one selected value in the group is enough.
    return wanted.some((value) => mine.has(valueKey(value)))
  })
}

export function filterByFacets<T extends Pick<ProductSummary, "options">>(
  products: T[],
  selected: SelectedFacets
): T[] {
  const hasAny = Object.values(selected).some((values) => values.length)

  if (!hasAny) {
    return products
  }

  return products.filter((product) => matchesFacets(product, selected))
}

/**
 * Every option-value id behind the current selection.
 *
 * Not used for filtering — see the note at the top of this file, Medusa ANDs
 * these. Kept because task 67 needs to hand the full id set for a chosen value
 * to anything that does work by id.
 */
export function selectedOptionValueIds(
  facets: Facet[],
  selected: SelectedFacets
): string[] {
  const ids = new Set<string>()

  for (const facet of facets) {
    for (const value of facet.values) {
      if (selected[facet.key]?.some((v) => valueKey(v) === value.key)) {
        value.optionValueIds.forEach((id) => ids.add(id))
      }
    }
  }

  return [...ids].sort()
}

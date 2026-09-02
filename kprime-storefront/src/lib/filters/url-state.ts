import type { ProductSort } from "@/lib/data/products"

/**
 * Filter state lives in the URL, not React state.
 *
 *   ?color=red,blue&brand=anker&price=1000-5000&sort=price_asc&page=2
 *
 * That is what gives shareable links, a working back button, and server
 * rendering. These are pure functions over URLSearchParams — no React, no
 * hooks — so a server component can read them and the whole module is unit
 * testable without a DOM.
 */

/**
 * Keys the filter system owns. A facet group derived from catalogue data can
 * never be named one of these, or selecting a colour would silently overwrite
 * the sort.
 */
export const RESERVED_KEYS = ["price", "sort", "page", "q"] as const

const SORTS: ProductSort[] = [
  "relevance",
  "newest",
  "price_asc",
  "price_desc",
  "title",
]

/** The default when no `sort` is in the URL. Browsing listings use this. */
export const DEFAULT_SORT: ProductSort = "newest"

/**
 * Default sort for a given query.
 *
 * Relevance only makes sense when there is something to be relevant to, so a
 * category listing keeps `newest` while `/search?q=mouse` orders by how well
 * each title answers the query. Both `parseFilters` and `serialiseFilters` read
 * this, which is what keeps the round-trip symmetric: the default is omitted
 * from the URL, so `/search?q=mouse` stays clean and picking Newest there
 * writes `sort=newest` explicitly.
 */
export function defaultSortFor(q: string | null): ProductSort {
  return q ? "relevance" : DEFAULT_SORT
}

export type PriceRange = { min?: number; max?: number }

export type FilterState = {
  /** Facet group → selected values, e.g. `{ color: ["red", "blue"] }`. */
  groups: Record<string, string[]>
  price: PriceRange | null
  sort: ProductSort
  page: number
  /** Search term. Carried through so /search keeps its query while filtering. */
  q: string | null
}

/** What Next hands a page as `searchParams`. */
export type RawSearchParams =
  | URLSearchParams
  | Record<string, string | string[] | undefined>

export const EMPTY_STATE: FilterState = {
  groups: {},
  price: null,
  sort: DEFAULT_SORT,
  page: 1,
  q: null,
}

function readParam(params: RawSearchParams, key: string): string | null {
  if (params instanceof URLSearchParams) {
    return params.get(key)
  }

  const value = params[key]

  // Next gives an array when a key repeats. Take the first — the serialiser
  // only ever writes one, so a repeated key is a hand-edited URL.
  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value ?? null
}

function keysOf(params: RawSearchParams): string[] {
  return params instanceof URLSearchParams
    ? [...new Set(params.keys())]
    : Object.keys(params)
}

/**
 * `1000-5000`, `1000-`, `-5000`.
 *
 * Returns null for anything unparseable rather than throwing: this runs on a
 * URL a person can edit, and a malformed range must degrade to "no price
 * filter", not a 500.
 */
function parsePrice(raw: string | null): PriceRange | null {
  if (!raw) {
    return null
  }

  const [rawMin, rawMax] = raw.split("-")
  const min = Number(rawMin)
  const max = Number(rawMax)

  const range: PriceRange = {}

  if (rawMin !== "" && Number.isFinite(min) && min >= 0) {
    range.min = min
  }

  if (rawMax !== undefined && rawMax !== "" && Number.isFinite(max) && max >= 0) {
    range.max = max
  }

  if (range.min === undefined && range.max === undefined) {
    return null
  }

  // Inverted bounds match nothing. Swap rather than return empty — the intent
  // is obvious and an empty grid would look like a broken filter.
  if (range.min !== undefined && range.max !== undefined && range.min > range.max) {
    return { min: range.max, max: range.min }
  }

  return range
}

export function parseFilters(params: RawSearchParams): FilterState {
  const groups: Record<string, string[]> = {}

  for (const key of keysOf(params)) {
    if ((RESERVED_KEYS as readonly string[]).includes(key)) {
      continue
    }

    const values = (readParam(params, key) ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)

    if (values.length) {
      // Deduplicated: ?color=red,red is one selection, and the count beside the
      // facet must agree with the number of chips shown.
      groups[key] = [...new Set(values)]
    }
  }

  const rawSort = readParam(params, "sort")
  const rawPage = Number(readParam(params, "page"))
  const q = readParam(params, "q") || null

  // Relevance without a query is not a state the dropdown can display, so a
  // hand-edited ?sort=relevance on a category page falls back like any unknown
  // value rather than leaving the control blank.
  const known =
    SORTS.includes(rawSort as ProductSort) &&
    !(rawSort === "relevance" && !q)

  return {
    groups,
    price: parsePrice(readParam(params, "price")),
    // An unknown sort falls back rather than throwing.
    sort: known ? (rawSort as ProductSort) : defaultSortFor(q),
    page: Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1,
    q,
  }
}

/**
 * Back to a query string.
 *
 * Defaults are omitted — no `sort=newest`, no `page=1` — so the canonical URL
 * for an unfiltered listing is clean, and two equivalent states always produce
 * the same string. Groups are sorted so state built in a different order still
 * round-trips identically.
 */
export function serialiseFilters(state: FilterState): string {
  const params = new URLSearchParams()

  if (state.q) {
    params.set("q", state.q)
  }

  for (const key of Object.keys(state.groups).sort()) {
    const values = state.groups[key]

    if (values?.length) {
      params.set(key, [...values].sort().join(","))
    }
  }

  if (state.price) {
    const { min, max } = state.price
    params.set("price", `${min ?? ""}-${max ?? ""}`)
  }

  if (state.sort !== defaultSortFor(state.q)) {
    params.set("sort", state.sort)
  }

  if (state.page > 1) {
    params.set("page", String(state.page))
  }

  return params.toString()
}

export function buildHref(pathname: string, state: FilterState): string {
  const query = serialiseFilters(state)
  return query ? `${pathname}?${query}` : pathname
}

/**
 * Every mutation below returns a NEW state with `page` reset to 1.
 *
 * Changing a filter while on page 4 of a result set that now has two pages is
 * the classic faceted-search bug — an empty grid that looks broken. Resetting
 * here means the six components in tasks 65–72 cannot each forget to do it.
 */
function withReset(state: FilterState, changes: Partial<FilterState>): FilterState {
  return { ...state, ...changes, page: 1 }
}

export function addValue(
  state: FilterState,
  group: string,
  value: string
): FilterState {
  const current = state.groups[group] ?? []

  if (current.includes(value)) {
    return state
  }

  return withReset(state, {
    groups: { ...state.groups, [group]: [...current, value] },
  })
}

export function removeValue(
  state: FilterState,
  group: string,
  value: string
): FilterState {
  const current = state.groups[group] ?? []
  const next = current.filter((v) => v !== value)

  const groups = { ...state.groups }

  // Drop the key entirely when its last value goes, so the URL has no empty
  // `color=` hanging around.
  if (next.length) {
    groups[group] = next
  } else {
    delete groups[group]
  }

  return withReset(state, { groups })
}

export function toggleValue(
  state: FilterState,
  group: string,
  value: string
): FilterState {
  return state.groups[group]?.includes(value)
    ? removeValue(state, group, value)
    : addValue(state, group, value)
}

export function clearGroup(state: FilterState, group: string): FilterState {
  const groups = { ...state.groups }
  delete groups[group]
  return withReset(state, { groups })
}

export function setPrice(
  state: FilterState,
  price: PriceRange | null
): FilterState {
  const empty =
    !price || (price.min === undefined && price.max === undefined)

  return withReset(state, { price: empty ? null : price })
}

export function setSort(state: FilterState, sort: ProductSort): FilterState {
  return withReset(state, { sort })
}

/** The one mutation that does NOT reset — paging is the point. */
export function setPage(state: FilterState, page: number): FilterState {
  return { ...state, page: Math.max(1, Math.trunc(page)) }
}

/**
 * Clears filters but keeps `q` and `sort`.
 *
 * "Clear all" on a search results page must not also throw away what the
 * customer searched for.
 */
export function clearAll(state: FilterState): FilterState {
  return { ...EMPTY_STATE, q: state.q, sort: state.sort }
}

/** Whether anything is filtering the result set — drives the empty state. */
export function hasActiveFilters(state: FilterState): boolean {
  return Object.keys(state.groups).length > 0 || state.price !== null
}

/** Flat list for ActiveFilterChips (task 70). */
export function activeFilterEntries(
  state: FilterState
): { group: string; value: string }[] {
  return Object.entries(state.groups).flatMap(([group, values]) =>
    values.map((value) => ({ group, value }))
  )
}

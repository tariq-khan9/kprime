import { unstable_cache } from "next/cache"

import {
  deriveFacets,
  filterByFacets,
  type Facet,
  type SelectedFacets,
} from "@/lib/filters/facets"
import { filterByPrice, priceBoundsOf } from "@/lib/filters/price"
import { sdk } from "@/lib/sdk"

/**
 * Trimmed to what ProductCard renders, per §2.1 — the full result set for a
 * category is held in server memory so price can be filtered and pages cut
 * here, and a fat payload is what makes that expensive.
 */
const CARD_FIELDS = [
  "id",
  "title",
  "handle",
  "thumbnail",
  "created_at",
  "variants.id",
  // Named, not `*variants.calculated_price`. The wildcard returns the whole
  // price object for every variant and costs 2,580 B/product against this
  // catalogue; these three — all `toSummary` reads — cost 836 B. At 200
  // products that is the difference between a 516KB and a 167KB cached entry.
  "variants.calculated_price.calculated_amount",
  "variants.calculated_price.original_amount",
  "variants.calculated_price.currency_code",
  // Not for ProductCard. These are what task 60 derives facets from, off this
  // same cached set — dropping them would cost a second fetch per listing.
  "tags.value",
  "options.title",
  "options.values.value",
  "options.values.id",
].join(",")

export type ProductSummary = {
  id: string
  title: string
  handle: string
  thumbnail: string | null
  /** Lowest calculated price across variants. Null when nothing is priced. */
  price: number | null
  /**
   * Cheapest and dearest variant. Equal when every variant shares a price.
   *
   * `price` alone is the "from" figure the card shows; this is what price
   * filtering matches against, so a product with a Rs 9,000 variant is findable
   * under a 5,000–10,000 filter rather than hidden behind its Rs 1,000 entry
   * price.
   */
  priceRange: { min: number; max: number } | null
  /** Compare-at price for the same variant, when it is on sale. */
  originalPrice: number | null
  currencyCode: string
  createdAt: string
  tags: string[]
  options: { title: string; values: { id: string; value: string }[] }[]
}

export type ProductSort = "newest" | "price_asc" | "price_desc" | "title"

export type SearchProductsParams = {
  categoryIds?: string[]
  collectionIds?: string[]
  typeIds?: string[]
  tagIds?: string[]
  /**
   * Selected facet values by group key, e.g. `{ colour: ["black"] }`.
   *
   * Applied in server memory, not as a Medusa param. Verified against the live
   * API: `option_value_id` is ANDed at the variant level, so the ids for Black
   * and White ask for a variant that is both and return nothing. Facets need OR
   * within a group, which the native filter cannot express.
   */
  facets?: SelectedFacets
  q?: string
  minPrice?: number
  maxPrice?: number
  sort?: ProductSort
  page?: number
  pageSize?: number
}

export type SearchProductsResult = {
  products: ProductSummary[]
  /** Matches after price filtering — what pagination is built from. */
  count: number
  page: number
  pageCount: number
  /** Min and max across the set before price filtering, for the range slider. */
  priceBounds: { min: number; max: number } | null
  /** Groups above the coverage threshold, for the sidebar. */
  facets: Facet[]
}

const DEFAULT_PAGE_SIZE = 24

/**
 * The store's single region. Calculated prices only come back when the query
 * carries one, so without this every product is priceless.
 */
const getRegionId = unstable_cache(
  async () => {
    const { regions } = await sdk.store.region.list({ fields: "id,countries.iso_2" })

    const country = (
      process.env.NEXT_PUBLIC_DEFAULT_REGION ?? "pk"
    ).toLowerCase()

    const match = regions.find((region) =>
      region.countries?.some((c) => c.iso_2?.toLowerCase() === country)
    )

    return (match ?? regions[0])?.id ?? null
  },
  ["region"],
  { tags: ["regions"] }
)

function toSummary(product: Record<string, any>): ProductSummary {
  const variants: any[] = product.variants ?? []

  const priced = variants
    .map((variant) => variant.calculated_price)
    .filter((price) => price && typeof price.calculated_amount === "number")

  // "From" pricing: the cheapest variant is what the card shows.
  const cheapest = priced.reduce<any>(
    (low, price) =>
      low === null || price.calculated_amount < low.calculated_amount
        ? price
        : low,
    null
  )

  const original = cheapest?.original_amount ?? null

  // The whole spread, not just the cheapest. Price filtering matches against
  // this so a product whose dearest variant is in range stays findable.
  const amounts: number[] = priced.map((price) => price.calculated_amount)

  return {
    id: product.id,
    title: product.title,
    handle: product.handle,
    thumbnail: product.thumbnail ?? null,
    price: cheapest?.calculated_amount ?? null,
    priceRange: amounts.length
      ? { min: Math.min(...amounts), max: Math.max(...amounts) }
      : null,
    // Only a real discount counts — Medusa returns original == calculated when
    // nothing is on sale, and a strikethrough at the same price is a lie.
    originalPrice:
      original !== null && original > (cheapest?.calculated_amount ?? 0)
        ? original
        : null,
    currencyCode: cheapest?.currency_code ?? "pkr",
    createdAt: product.created_at,
    tags: (product.tags ?? []).map((tag: any) => tag.value).filter(Boolean),
    options: (product.options ?? []).map((option: any) => ({
      title: option.title,
      values: (option.values ?? []).map((value: any) => ({
        id: value.id,
        value: value.value,
      })),
    })),
  }
}

/**
 * The subset of params that changes what Medusa returns.
 *
 * Price, sort, page and pageSize are all applied in memory afterwards, so they
 * must NOT reach the cached function: `unstable_cache` builds its key from
 * `JSON.stringify(arguments)`, and passing the whole params object gave every
 * page and every sort order its own cache entry holding an identical copy of
 * the catalogue.
 */
type NativeQuery = {
  categoryIds?: string[]
  collectionIds?: string[]
  typeIds?: string[]
  tagIds?: string[]
  q?: string
}

/**
 * Built in a fixed key order with sorted id arrays, so two requests that mean
 * the same thing serialise identically and share a cache entry — `[a, b]` and
 * `[b, a]` are the same filter.
 */
function nativeQueryOf(params: SearchProductsParams): NativeQuery {
  const ids = (values?: string[]) =>
    values?.length ? [...values].sort() : undefined

  return {
    categoryIds: ids(params.categoryIds),
    collectionIds: ids(params.collectionIds),
    typeIds: ids(params.typeIds),
    tagIds: ids(params.tagIds),
    q: params.q || undefined,
  }
}

/** Per request to Medusa. The full set is assembled by looping. */
const FETCH_BATCH = 200

/**
 * A category this large means the in-memory approach has outgrown itself and
 * the filtering belongs in a search engine. Better to log it loudly than to
 * silently truncate and serve wrong counts.
 */
const MAX_SET = 5000

/**
 * Everything Medusa can filter natively, fetched whole and cached.
 *
 * Deliberately unpaginated at the Medusa level. §2.1: Medusa must not paginate
 * while we post-filter on price, or the counts and page boundaries disagree
 * with what is shown. The batching below is transport only — every batch is
 * concatenated before anything is filtered.
 */
async function fetchNativeSet(query: NativeQuery): Promise<ProductSummary[]> {
  const regionId = await getRegionId()

  const base: Record<string, unknown> = {
    fields: CARD_FIELDS,
    ...(regionId ? { region_id: regionId } : {}),
    ...(query.categoryIds?.length ? { category_id: query.categoryIds } : {}),
    ...(query.collectionIds?.length
      ? { collection_id: query.collectionIds }
      : {}),
    ...(query.typeIds?.length ? { type_id: query.typeIds } : {}),
    ...(query.tagIds?.length ? { tag_id: query.tagIds } : {}),
    ...(query.q ? { q: query.q } : {}),
  }

  const started = Date.now()
  const summaries: ProductSummary[] = []
  let offset = 0

  for (;;) {
    const { products, count } = await sdk.store.product.list({
      ...base,
      limit: FETCH_BATCH,
      offset,
    })

    summaries.push(...products.map(toSummary))
    offset += products.length

    if (products.length === 0 || summaries.length >= count) {
      break
    }

    if (summaries.length >= MAX_SET) {
      console.warn(
        `[products] result set hit the ${MAX_SET} cap — counts past this point ` +
          `are wrong. Filtering needs to move out of server memory.`
      )
      break
    }
  }

  // Only ever logged on a cache miss, so a steady stream of these means the
  // cache is not working. §2.1 budgets roughly 500 bytes per product; the
  // payload is held in server memory and never shipped to the browser.
  const bytes = Buffer.byteLength(JSON.stringify(summaries), "utf8")
  console.info(
    `[products] fetched ${summaries.length} in ${Date.now() - started}ms · ` +
      `${(bytes / 1024).toFixed(1)}KB · ${
        summaries.length ? Math.round(bytes / summaries.length) : 0
      }B/product`
  )

  return summaries
}

const cachedNativeSet = unstable_cache(fetchNativeSet, ["products"], {
  tags: ["products"],
})

/**
 * The one entry point for every product listing — category, search and
 * collection pages all come through here (§2.1).
 *
 * Native filters run in Medusa; price and pagination run here in server memory.
 * If this ever moves to a search engine, this file is the only one that changes.
 */
export async function searchProducts(
  params: SearchProductsParams = {}
): Promise<SearchProductsResult> {
  // Only the native part is cached on. Everything below runs per request
  // against the same cached array.
  const all = await cachedNativeSet(nativeQueryOf(params))

  // Bounds from the UNFILTERED set — deriving them from the filtered one would
  // let the slider shrink its own range on every drag, with no way back.
  const priceBounds = priceBoundsOf(all)

  const priced = filterByPrice(all, {
    min: params.minPrice,
    max: params.maxPrice,
  })

  // Derived AFTER price filtering but BEFORE facet filtering.
  //
  // Deriving them after facet filtering would collapse the sidebar onto the
  // current selection: tick Black and every other colour vanishes, leaving no
  // way to widen the choice. Deriving them before price filtering would offer
  // values that cannot produce a result.
  const facets = deriveFacets(priced)

  const matched = filterByFacets(priced, params.facets ?? {})

  // Unpriced products sort last rather than as free.
  const byPrice = (a: ProductSummary, b: ProductSummary, dir: 1 | -1) => {
    if (a.price === null) return 1
    if (b.price === null) return -1
    return (a.price - b.price) * dir
  }

  const compare: Record<
    ProductSort,
    (a: ProductSummary, b: ProductSummary) => number
  > = {
    price_asc: (a, b) => byPrice(a, b, 1),
    price_desc: (a, b) => byPrice(a, b, -1),
    title: (a, b) => a.title.localeCompare(b.title),
    newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
  }

  const primary = compare[params.sort ?? "newest"] ?? compare.newest

  // Every comparison falls back to id. Without a tiebreak, products with equal
  // prices (or timestamps from the same seed run) can order differently between
  // requests — and since pagination slices this array, an unstable order means
  // the same product appearing on two pages while another is skipped entirely.
  const sorted = [...matched].sort(
    (a, b) => primary(a, b) || a.id.localeCompare(b.id)
  )

  const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize))
  const page = Math.min(Math.max(params.page ?? 1, 1), pageCount)
  const start = (page - 1) * pageSize

  return {
    products: sorted.slice(start, start + pageSize),
    count: sorted.length,
    page,
    pageCount,
    priceBounds,
    facets,
  }
}

/** Full product for the detail page. Not trimmed — the page needs everything. */
export const getProduct = unstable_cache(
  async (handle: string) => {
    const regionId = await getRegionId()

    const { products } = await sdk.store.product.list({
      handle,
      limit: 1,
      fields:
        "*variants.calculated_price,*variants.options,*options.values,*images,*tags,*type,*categories",
      ...(regionId ? { region_id: regionId } : {}),
    })

    return products[0] ?? null
  },
  ["product"],
  { tags: ["products"] }
)

/**
 * Product tag values mapped to their ids.
 *
 * `searchProducts` filters on `tag_id`, but the rest of the app thinks in tag
 * values — the home page asks for "New Arrival", not `ptag_01ABC`. Fetched once
 * and cached: there are a handful of tags and they change about never, so
 * resolving this per request would be a round trip for nothing.
 */
const getTagMap = unstable_cache(
  async (): Promise<Record<string, string>> => {
    // The SDK exposes no `store.productTag` resource, so the endpoint is called
    // directly. `fields` is trimmed because the default response embeds every
    // product under each tag — the full catalogue, four times over, to read
    // four ids.
    const { product_tags } = await sdk.client.fetch<{
      product_tags: { id: string; value: string }[]
    }>("/store/product-tags", {
      query: { limit: 100, fields: "id,value" },
    })

    return Object.fromEntries(product_tags.map((tag) => [tag.value, tag.id]))
  },
  ["product-tags"],
  { tags: ["products"] }
)

/**
 * Ids for the given tag values. Unknown values are dropped rather than throwing
 * — a rail whose tag was renamed in admin should render empty, not 500 the
 * whole home page.
 */
export async function getTagIdsByValue(values: string[]): Promise<string[]> {
  const map = await getTagMap()
  return values.map((value) => map[value]).filter(Boolean)
}

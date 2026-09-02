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

/**
 * Most images a product shows.
 *
 * Enforced here rather than trusted from admin: the gallery, the thumbnail
 * strip and the mobile dots are all sized for a handful, and a product uploaded
 * with twenty would quietly produce a twenty-dot swiper. A product may carry
 * as few as one.
 */
export const MAX_PRODUCT_IMAGES = 5

/** One gallery image. Ordered as the merchant arranged them in admin. */
export type ProductImage = {
  id: string
  url: string
}

/**
 * A buyable variant.
 *
 * `optionValues` maps option id → the value this variant carries, which is what
 * the selector in task 86 resolves a chosen combination against.
 */
export type ProductVariantDetail = {
  id: string
  title: string
  sku: string | null
  price: number | null
  originalPrice: number | null
  currencyCode: string
  /** Null when Medusa is not tracking stock for this variant. */
  inventoryQuantity: number | null
  manageInventory: boolean
  allowBackorder: boolean
  optionValues: Record<string, string>
}

export type ProductOptionDetail = {
  id: string
  title: string
  values: { id: string; value: string }[]
}

/**
 * Everything the detail page needs, projected off Medusa's raw shape.
 *
 * Deliberately typed rather than passed through raw: every component from task
 * 82 onward reads this, and letting Medusa's loosely-typed product spread
 * through them would put `any` in a dozen files.
 */
export type ProductDetail = {
  id: string
  title: string
  handle: string
  subtitle: string | null
  description: string | null
  thumbnail: string | null
  images: ProductImage[]
  options: ProductOptionDetail[]
  variants: ProductVariantDetail[]
  tags: string[]
  type: string | null
  categories: { id: string; name: string; handle: string }[]
  metadata: Record<string, unknown> | null
  /** Cheapest variant, for the headline price before one is selected. */
  price: number | null
  originalPrice: number | null
  currencyCode: string
}

export type ProductSort =
  | "relevance"
  | "newest"
  | "price_asc"
  | "price_desc"
  | "title"

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
 * Query split into lowercase tokens.
 *
 * Medusa's `q` is token-based and order-independent — verified live: `mouse
 * wireless` matches "Silent Wireless Mouse", as does `silent mouse`. Any filter
 * layered on top has to tokenise the same way, or every multi-word query that
 * works today would start returning nothing.
 */
function tokenise(q: string): string[] {
  return q.toLowerCase().split(/\s+/).filter(Boolean)
}

/** Escaped so a query like `c++` or `(` builds a regex instead of throwing. */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * Keeps only products whose TITLE carries every token.
 *
 * Medusa's `q` also matches description, variant title and SKU, which pulls in
 * products a shopper would not recognise as results: `mouse` returns a keyboard
 * whose description mentions "desk space for the mouse", and `case` returns
 * earbuds and a bedsheet with no phone case anywhere in the catalogue.
 *
 * The recall is deliberately given up. Description and SKU matches — `KBD-RED`,
 * `hot-swappable` — no longer resolve; those are staff queries, not shopper
 * ones.
 */
function filterByTitle(products: ProductSummary[], q: string): ProductSummary[] {
  const tokens = tokenise(q)

  if (!tokens.length) {
    return products
  }

  return products.filter((product) => {
    const title = product.title.toLowerCase()
    return tokens.every((token) => title.includes(token))
  })
}

/**
 * How well a title answers the query. Higher sorts first.
 *
 * Everything reaching this has already passed `filterByTitle`, so every token is
 * present somewhere and 0 is the floor rather than "no match".
 */
function relevanceOf(title: string, q: string): number {
  const lower = title.toLowerCase()
  const needle = q.trim().toLowerCase()

  if (lower === needle) return 3
  if (lower.startsWith(needle)) return 2

  // A token opening a word beats one buried mid-word: "Pan" should rank ahead of
  // a title that merely contains those letters inside a longer word.
  const onWordBoundary = tokenise(q).every((token) =>
    new RegExp(`\\b${escapeRegex(token)}`).test(lower)
  )

  return onWordBoundary ? 1 : 0
}

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
  const fetched = await cachedNativeSet(nativeQueryOf(params))

  // Applied here, before ANYTHING is derived. Filtering after `priceBounds` or
  // `deriveFacets` would offer a slider range and facet values belonging to
  // products that are no longer in the result set.
  const all = params.q?.trim() ? filterByTitle(fetched, params.q) : fetched

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

  const query = params.q?.trim() ?? ""

  const byNewest = (a: ProductSummary, b: ProductSummary) =>
    b.createdAt.localeCompare(a.createdAt)

  const compare: Record<
    ProductSort,
    (a: ProductSummary, b: ProductSummary) => number
  > = {
    price_asc: (a, b) => byPrice(a, b, 1),
    price_desc: (a, b) => byPrice(a, b, -1),
    title: (a, b) => a.title.localeCompare(b.title),
    newest: byNewest,
    // Ties fall through to newest, so equally relevant products still get a
    // meaningful order rather than an alphabetical accident.
    relevance: (a, b) =>
      relevanceOf(b.title, query) - relevanceOf(a.title, query) || byNewest(a, b),
  }

  // Relevance is the default only when there is something to be relevant to; a
  // category listing has no query and stays on newest.
  const requested = params.sort ?? (query ? "relevance" : "newest")
  const effective = requested === "relevance" && !query ? "newest" : requested

  const primary = compare[effective] ?? byNewest

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

/**
 * Medusa's raw product shape, narrowed to the fields the projections below read.
 *
 * The SDK types these loosely, so declaring what is actually consumed is what
 * keeps `any` out of the projection — and makes it obvious which fields the
 * `fields` string above has to keep returning.
 */
type RawPrice = {
  calculated_amount?: number | null
  original_amount?: number | null
  currency_code?: string | null
}

type RawVariant = {
  id: string
  title?: string | null
  sku?: string | null
  calculated_price?: RawPrice | null
  inventory_quantity?: number | null
  manage_inventory?: boolean | null
  allow_backorder?: boolean | null
  options?: { option_id?: string; value?: string }[] | null
}

type RawProduct = {
  id: string
  title: string
  handle: string
  subtitle?: string | null
  description?: string | null
  thumbnail?: string | null
  images?: { id: string; url: string }[] | null
  options?:
    | { id: string; title: string; values?: { id: string; value: string }[] | null }[]
    | null
  variants?: RawVariant[] | null
  tags?: { value?: string }[] | null
  type?: { value?: string } | null
  categories?: { id: string; name: string; handle: string }[] | null
  metadata?: Record<string, unknown> | null
}

function toVariantDetail(variant: RawVariant): ProductVariantDetail {
  const price = variant.calculated_price ?? null
  const calculated = price?.calculated_amount ?? null
  const original = price?.original_amount ?? null

  return {
    id: variant.id,
    title: variant.title ?? "",
    sku: variant.sku ?? null,
    price: calculated,
    // Same rule as the card: Medusa returns original == calculated when nothing
    // is on sale, and a strikethrough at the same price is a lie.
    originalPrice:
      original !== null && calculated !== null && original > calculated
        ? original
        : null,
    currencyCode: price?.currency_code ?? "pkr",
    inventoryQuantity: variant.inventory_quantity ?? null,
    manageInventory: variant.manage_inventory ?? false,
    allowBackorder: variant.allow_backorder ?? false,
    optionValues: Object.fromEntries(
      (variant.options ?? [])
        .filter((option) => option.option_id && option.value !== undefined)
        .map((option) => [option.option_id as string, option.value as string])
    ),
  }
}

function toDetail(product: RawProduct): ProductDetail {
  const variants: ProductVariantDetail[] = (product.variants ?? []).map(
    toVariantDetail
  )

  // The headline price before a variant is chosen, so it matches the "from"
  // figure the card showed on the way in.
  const priced = variants.filter((variant) => variant.price !== null)

  const cheapest = priced.reduce<ProductVariantDetail | null>(
    (low, variant) =>
      low === null || (variant.price ?? 0) < (low.price ?? 0) ? variant : low,
    null
  )

  return {
    id: product.id,
    title: product.title,
    handle: product.handle,
    subtitle: product.subtitle ?? null,
    description: product.description ?? null,
    thumbnail: product.thumbnail ?? null,
    // Capped, and ordered as admin arranged them, so the extras that get
    // dropped are the last ones rather than an arbitrary subset.
    images: (product.images ?? []).slice(0, MAX_PRODUCT_IMAGES).map((image) => ({
      id: image.id,
      url: image.url,
    })),
    options: (product.options ?? []).map((option) => ({
      id: option.id,
      title: option.title,
      values: (option.values ?? []).map((value) => ({
        id: value.id,
        value: value.value,
      })),
    })),
    variants,
    tags: (product.tags ?? [])
      .map((tag) => tag.value)
      .filter((value): value is string => Boolean(value)),
    type: product.type?.value ?? null,
    categories: (product.categories ?? []).map((category) => ({
      id: category.id,
      name: category.name,
      handle: category.handle,
    })),
    metadata: product.metadata ?? null,
    price: cheapest?.price ?? null,
    originalPrice: cheapest?.originalPrice ?? null,
    currencyCode: cheapest?.currencyCode ?? "pkr",
  }
}

/**
 * Full product for the detail page. Not trimmed — the page needs everything.
 *
 * Returns null for an unknown handle rather than throwing, so the page can turn
 * that into a real `notFound()`.
 */
export const getProduct = unstable_cache(
  async (handle: string): Promise<ProductDetail | null> => {
    const regionId = await getRegionId()

    const { products } = await sdk.store.product.list({
      handle,
      limit: 1,
      /**
       * EVERY field is named, including the top-level scalars.
       *
       * Medusa's field selection is all-or-nothing: naming a single explicit
       * field (here `variants.inventory_quantity`) switches the whole query out
       * of its defaults, and `title`, `handle`, `description`, `subtitle`,
       * `thumbnail` and `metadata` all silently vanish from the response. The
       * failure is quiet — the page renders with an empty <h1> and no
       * description tab rather than erroring — so this list must stay complete.
       *
       * The three inventory fields are the reason any of this is explicit: the
       * `*variants` wildcard does NOT include them, and without them every
       * variant looks stockless and StockIndicator can never say "in stock".
       */
      fields: [
        "id",
        "title",
        "handle",
        "subtitle",
        "description",
        "thumbnail",
        "metadata",
        "*variants.calculated_price",
        "*variants.options",
        "variants.id",
        "variants.title",
        "variants.sku",
        "variants.inventory_quantity",
        "variants.manage_inventory",
        "variants.allow_backorder",
        "options.id",
        "options.title",
        "*options.values",
        "*images",
        "*tags",
        "*type",
        "*categories",
      ].join(","),
      ...(regionId ? { region_id: regionId } : {}),
    })

    return products[0] ? toDetail(products[0] as RawProduct) : null
  },
  ["product"],
  { tags: ["products"] }
)

/**
 * Every product handle, for `generateStaticParams`.
 *
 * Reuses the cached catalogue rather than a second query, so prerendering costs
 * nothing beyond the one fetch the listings already pay for.
 */
export async function getProductHandles(): Promise<string[]> {
  const { products } = await searchProducts({ pageSize: MAX_SET })

  return products.map((product) => product.handle)
}

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

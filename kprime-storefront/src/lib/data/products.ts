import { unstable_cache } from "next/cache"

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
  "*variants.calculated_price",
  "variants.id",
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
  /** Option value ids, the native colour/size/spec filter. */
  optionValueIds?: string[]
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

  return {
    id: product.id,
    title: product.title,
    handle: product.handle,
    thumbnail: product.thumbnail ?? null,
    price: cheapest?.calculated_amount ?? null,
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
 * Everything Medusa can filter natively, fetched whole and cached.
 *
 * Deliberately unpaginated. §2.1: Medusa must not paginate while we post-filter
 * on price, or the counts and page boundaries disagree with what is shown.
 */
async function fetchNativeSet(
  params: SearchProductsParams
): Promise<ProductSummary[]> {
  const regionId = await getRegionId()

  const query: Record<string, unknown> = {
    fields: CARD_FIELDS,
    limit: 1000,
    ...(regionId ? { region_id: regionId } : {}),
    ...(params.categoryIds?.length
      ? { category_id: params.categoryIds }
      : {}),
    ...(params.collectionIds?.length
      ? { collection_id: params.collectionIds }
      : {}),
    ...(params.typeIds?.length ? { type_id: params.typeIds } : {}),
    ...(params.tagIds?.length ? { tag_id: params.tagIds } : {}),
    ...(params.optionValueIds?.length
      ? { option_value_id: params.optionValueIds }
      : {}),
    ...(params.q ? { q: params.q } : {}),
  }

  const { products } = await sdk.store.product.list(query)

  return products.map(toSummary)
}

const cachedNativeSet = unstable_cache(
  fetchNativeSet,
  ["products"],
  { tags: ["products"] }
)

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
  const all = await cachedNativeSet(params)

  const pricedValues = all
    .map((product) => product.price)
    .filter((price): price is number => price !== null)

  const priceBounds = pricedValues.length
    ? { min: Math.min(...pricedValues), max: Math.max(...pricedValues) }
    : null

  let matched = all

  if (params.minPrice !== undefined) {
    matched = matched.filter(
      (p) => p.price !== null && p.price >= params.minPrice!
    )
  }

  if (params.maxPrice !== undefined) {
    matched = matched.filter(
      (p) => p.price !== null && p.price <= params.maxPrice!
    )
  }

  // Unpriced products sort last rather than as free.
  const byPrice = (a: ProductSummary, b: ProductSummary, dir: 1 | -1) => {
    if (a.price === null) return 1
    if (b.price === null) return -1
    return (a.price - b.price) * dir
  }

  const sorted = [...matched]

  switch (params.sort) {
    case "price_asc":
      sorted.sort((a, b) => byPrice(a, b, 1))
      break
    case "price_desc":
      sorted.sort((a, b) => byPrice(a, b, -1))
      break
    case "title":
      sorted.sort((a, b) => a.title.localeCompare(b.title))
      break
    case "newest":
    default:
      sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      break
  }

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

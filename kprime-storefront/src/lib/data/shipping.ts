import { unstable_cache } from "next/cache"

import { sdk } from "@/lib/sdk"

export type Province = {
  /** Short code, e.g. "pb". Stable across renames; used as the select value. */
  code: string
  name: string
  /** City names exactly as the geo zones spell them. */
  cities: string[]
}

const CACHE_TAG = "shipping-cities"

/**
 * Provinces and their deliverable cities.
 *
 * Comes from `/store/shipping-cities` (task 11), which derives the list from
 * the geo zones themselves. That indirection is the point: a city added in
 * Admin → Locations appears here after the cache expires, with no code change
 * and no second list to keep in step.
 *
 * **The strings are load-bearing.** Geo zone matching is an exact match on the
 * city name, so these must reach the cart byte-for-byte as the zone spells
 * them. Never title-case, trim or "tidy" them on the way through — a shipping
 * option that silently resolves to zero is the failure this prevents (§5.1).
 */
async function fetchProvinces(): Promise<Province[]> {
  const { provinces } = await sdk.client.fetch<{ provinces: Province[] }>(
    "/store/shipping-cities"
  )

  // Only logged on a cache miss. Checkout renders this on every address step,
  // so a steady stream of these means the cache is not working.
  console.info(
    `[shipping] fetched ${provinces.length} provinces at ${new Date().toISOString()}`
  )

  return provinces
}

/**
 * Cached for the app. Revalidated by tag when zones change.
 *
 * Safe to cache, unlike the cart: this is the same list for every visitor.
 */
export const getProvinces = unstable_cache(fetchProvinces, [CACHE_TAG], {
  tags: [CACHE_TAG],
})

/** Cities for one province code, or an empty list for an unknown code. */
export async function getCitiesFor(provinceCode: string): Promise<string[]> {
  const provinces = await getProvinces()

  return provinces.find((province) => province.code === provinceCode)?.cities ?? []
}

/**
 * Whether a city is one we actually deliver to.
 *
 * Checked at the API boundary before an address is written, because a city
 * string that matches no geo zone produces zero shipping options and dead-ends
 * checkout with no error of its own.
 */
export async function isDeliverableCity(city: string): Promise<boolean> {
  const provinces = await getProvinces()

  return provinces.some((province) => province.cities.includes(city))
}

import { unstable_cache } from "next/cache"

import { sdk } from "@/lib/sdk"

export type Region = {
  id: string
  name: string
  currencyCode: string
}

const CACHE_TAG = "regions"

/**
 * Hits the backend every time.
 *
 * Exported for the health check only. A diagnostic served from the data cache
 * reports the last time the connection worked, not whether it works now — it
 * will happily show green against a key that has since been revoked.
 */
export async function fetchRegion(): Promise<Region | null> {
  const { regions } = await sdk.store.region.list({
    fields: "id,name,currency_code,countries.iso_2",
  })

  const country = (process.env.NEXT_PUBLIC_DEFAULT_REGION ?? "pk").toLowerCase()

  const match = regions.find((region) =>
    region.countries?.some((c) => c.iso_2?.toLowerCase() === country)
  )

  const region = match ?? regions[0]

  if (!region) {
    return null
  }

  return {
    id: region.id,
    name: region.name,
    currencyCode: region.currency_code,
  }
}

/**
 * The store's single region — KPrime ships Pakistan only.
 *
 * Every priced query needs a region id, because Medusa only returns calculated
 * prices when the query carries one. Cached because it never changes and is
 * needed by almost every page.
 */
export const getRegion = unstable_cache(fetchRegion, [CACHE_TAG], {
  tags: [CACHE_TAG],
})

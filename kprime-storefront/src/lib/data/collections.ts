import { unstable_cache } from "next/cache"

import { sdk } from "@/lib/sdk"

export type Collection = {
  id: string
  title: string
  handle: string
}

const CACHE_TAG = "collections"

/**
 * Every collection, fetched once.
 *
 * Flat by nature — a collection has no parent and no children, so none of the
 * tree threading in `categories.ts` applies here. There is no `getDescendantIds`
 * equivalent either: a collection's products are exactly the ones linked to it.
 */
async function fetchCollections(): Promise<Collection[]> {
  const { collections } = await sdk.store.collection.list({
    fields: "id,title,handle",
    limit: 1000,
  })

  // Only reached on a cache miss. A steady stream of these means the cache
  // below is not working.
  console.info(
    `[collections] fetched ${collections.length} from backend at ${new Date().toISOString()}`
  )

  return collections
    .map((collection) => ({
      id: collection.id,
      title: collection.title,
      handle: collection.handle,
    }))
    .sort((a, b) => a.title.localeCompare(b.title))
}

/** Cached app-wide and revalidated by tag when collections change in admin. */
export const getCollections = unstable_cache(fetchCollections, [CACHE_TAG], {
  tags: [CACHE_TAG],
})

/**
 * Resolved from the cached list, so this costs nothing beyond the one fetch.
 *
 * Returns undefined rather than throwing — the page turns that into a real
 * `notFound()`, which is what makes an unknown handle a 404 instead of an
 * error page.
 */
export async function getCollectionByHandle(
  handle: string
): Promise<Collection | undefined> {
  const collections = await getCollections()

  return collections.find((collection) => collection.handle === handle)
}

import Link from "next/link"

import { getCollections } from "@/lib/data/collections"
import { searchProducts } from "@/lib/data/products"

/**
 * Collection data diagnostic (task 79).
 *
 * Proves two things the collection page depends on: `getCollections` resolves
 * handles, and `searchProducts({ collectionIds })` returns that collection's
 * products through the same one entry point every other listing uses — rather
 * than a second query path with its own cache key and pagination.
 *
 * Dev only; task 155 blocks /dev/* in production.
 */

// Re-run on every load; the data cache underneath is deliberately left in place,
// since the cache is part of what is being checked. Watch the terminal for the
// [collections] line on reload — it should appear once, not per request.
export const dynamic = "force-dynamic"

export default async function CollectionsPage() {
  const collections = await getCollections()

  const rows = await Promise.all(
    collections.map(async (collection) => {
      const { count, products } = await searchProducts({
        collectionIds: [collection.id],
        pageSize: 100,
      })

      return { collection, count, titles: products.map((p) => p.title) }
    })
  )

  return (
    <main className="min-h-screen bg-paper px-6 py-12 text-brand">
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <div>
          <h1 className="text-2xl font-bold">Collections</h1>
          <p className="mt-1 text-muted">
            {collections.length}{" "}
            {collections.length === 1 ? "collection" : "collections"}
          </p>
        </div>

        {collections.length === 0 ? (
          <p className="text-sale">
            None found. Run{" "}
            <code>npx medusa exec ./src/scripts/add-demo-collections.ts</code> in
            kprime-backend.
          </p>
        ) : (
          rows.map(({ collection, count, titles }) => (
            <section
              key={collection.id}
              className="rounded-lg border border-line bg-paper p-6"
            >
              <div className="flex flex-wrap items-baseline gap-x-3">
                <h2 className="font-bold">{collection.title}</h2>
                <Link
                  href={`/collections/${collection.handle}`}
                  className="text-sm text-muted underline"
                >
                  /collections/{collection.handle}
                </Link>
              </div>

              <p className={count > 0 ? "mt-1 text-success" : "mt-1 text-sale"}>
                {count} {count === 1 ? "product" : "products"}
              </p>

              <ul className="mt-3 flex flex-col gap-1 text-sm">
                {titles.map((title) => (
                  <li key={title}>{title}</li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </main>
  )
}

import { getProduct, searchProducts } from "@/lib/data/products"
import { formatPKR } from "@/lib/utils/format"

/**
 * Product data layer diagnostic.
 *
 * Proves searchProducts returns what ProductCard needs, that prices survive the
 * trimmed field selection, and that the per-product payload stays inside the
 * budget §2.1 depends on — the full result set is held in server memory to
 * filter price and derive facets, so bytes per product is the cost that matters.
 *
 * Dev only; task 155 blocks /dev/* in production.
 */

export const dynamic = "force-dynamic"

/** Task 20's stated ceiling. */
const BUDGET_BYTES = 1024

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-28 shrink-0 text-muted">{label}</span>
      <span className="break-all">{value}</span>
    </div>
  )
}

export default async function ProductsPage() {
  const result = await searchProducts({ pageSize: 100 })
  const { products, count, priceBounds } = result

  // Measured here rather than quoted from a one-off curl, so the check stays
  // honest as fields are added later.
  const bytes = Buffer.byteLength(JSON.stringify(products), "utf8")
  const perProduct = products.length ? Math.round(bytes / products.length) : 0
  const withinBudget = perProduct < BUDGET_BYTES

  const missingImages = products.filter((p) => !p.thumbnail).length
  const unpriced = products.filter((p) => p.price === null).length

  // The detail path, exercised once — a different query shape from the list.
  const first = products[0] ? await getProduct(products[0].handle) : null

  return (
    <main className="min-h-screen bg-paper px-6 py-12 text-brand">
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="mt-1 text-muted">
            {count} in the catalogue · price range{" "}
            {priceBounds
              ? `${formatPKR(priceBounds.min)} – ${formatPKR(priceBounds.max)}`
              : "none priced"}
          </p>
        </div>

        <section className="rounded-lg border border-line bg-paper p-6">
          <h2 className="mb-2 font-bold">Payload</h2>
          <p className={withinBudget ? "text-success" : "text-sale"}>
            {perProduct} bytes per product
            {withinBudget ? " — within" : " — OVER"} the {BUDGET_BYTES} B budget
          </p>
          <p className="mt-2 text-muted">
            {(bytes / 1024).toFixed(1)} KB for {products.length} products. This
            set is held in server memory per cached query, never shipped to the
            browser.
          </p>
        </section>

        {(missingImages > 0 || count < 20) && (
          <section className="rounded-lg border border-line bg-paper p-6 text-muted">
            <h2 className="mb-2 font-bold text-brand">Known gaps</h2>
            {count < 20 && (
              <p>
                {count} products — task 10 wants 20–30. Deferred until the real
                catalogue exists.
              </p>
            )}
            {missingImages > 0 && (
              <p>
                {missingImages} of {products.length} have no thumbnail. The seed
                ships none deliberately. ProductCard (task 35) needs a real
                placeholder at a fixed aspect ratio, not a broken image.
              </p>
            )}
            {unpriced > 0 && <p>{unpriced} have no price.</p>}
          </section>
        )}

        <section className="flex flex-col gap-4">
          {products.map((product) => (
            <div
              key={product.id}
              className="flex flex-col gap-1 rounded-lg border border-line bg-paper p-4"
            >
              <div className="flex flex-wrap items-baseline gap-x-3">
                <span className="font-medium">{product.title}</span>
                <code className="text-muted">/{product.handle}</code>
              </div>

              <Field
                label="Price"
                value={
                  product.originalPrice
                    ? `${formatPKR(product.price)} (was ${formatPKR(product.originalPrice)})`
                    : formatPKR(product.price)
                }
              />
              <Field label="Thumbnail" value={product.thumbnail ?? "no image"} />
              {product.tags.length > 0 && (
                <Field label="Tags" value={product.tags.join(", ")} />
              )}
              {product.options.length > 0 && (
                <Field
                  label="Options"
                  value={product.options
                    .map(
                      (o) =>
                        `${o.title}: ${o.values.map((v) => v.value).join("/")}`
                    )
                    .join(" · ")}
                />
              )}
            </div>
          ))}
        </section>

        <section className="rounded-lg border border-line bg-paper p-6">
          <h2 className="mb-2 font-bold">getProduct</h2>
          {first ? (
            <p className="text-muted">
              Resolved <span className="text-brand">{first.title}</span> —{" "}
              {first.variants?.length ?? 0} variants, {first.images?.length ?? 0}{" "}
              images, {first.options?.length ?? 0} options.
            </p>
          ) : (
            <p className="text-sale">Could not resolve the first product.</p>
          )}
        </section>
      </div>
    </main>
  )
}

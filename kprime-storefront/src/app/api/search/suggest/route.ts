import { NextResponse } from "next/server"

import { getCategoryTree, type CategoryNode } from "@/lib/data/categories"
import { searchProducts } from "@/lib/data/products"

/**
 * Typeahead suggestions.
 *
 *   GET /api/search/suggest?q=key
 *
 * A route rather than a client-side SDK call: CLAUDE.md rule 3 keeps the SDK
 * out of components, and `lib/data` is server-only because of `unstable_cache`.
 *
 * Products come from the same `searchProducts` the results page uses, so a
 * suggestion can never point at something the full search would not return.
 */

const MAX_PRODUCTS = 5
const MAX_CATEGORIES = 3

/** Flattens the tree so a match can be found at any depth. */
function* walk(nodes: CategoryNode[]): Generator<CategoryNode> {
  for (const node of nodes) {
    yield node
    yield* walk(node.children)
  }
}

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? ""

  // Below two characters almost everything matches, which is noise rather than
  // a suggestion.
  if (q.length < 2) {
    return NextResponse.json({ products: [], categories: [] })
  }

  const needle = q.toLowerCase()

  const [{ products }, tree] = await Promise.all([
    searchProducts({ q, pageSize: MAX_PRODUCTS }),
    getCategoryTree(),
  ])

  // Matched in memory off the already-cached tree, so categories cost nothing.
  const categories = [...walk(tree)]
    .filter((node) => node.name.toLowerCase().includes(needle))
    .slice(0, MAX_CATEGORIES)
    .map((node) => ({ name: node.name, handle: node.handle }))

  return NextResponse.json({
    // Trimmed hard: a suggestion list needs a label, a link and a picture.
    products: products.map((product) => ({
      title: product.title,
      handle: product.handle,
      thumbnail: product.thumbnail,
    })),
    categories,
  })
}

import { unstable_cache } from "next/cache"

import { sdk } from "@/lib/sdk"

export type CategoryNode = {
  id: string
  name: string
  handle: string
  description: string | null
  parent_category_id: string | null
  rank: number
  children: CategoryNode[]
}

const CACHE_TAG = "categories"

/**
 * The whole tree, fetched flat and assembled in memory.
 *
 * Medusa's `include_descendants_tree` runs an extra query per record, so at 15
 * categories it is cheaper to pull every row once and thread the parent links
 * here. It also means `getDescendantIds` costs nothing — see below.
 */
async function fetchCategoryTree(): Promise<CategoryNode[]> {
  const { product_categories } = await sdk.store.category.list({
    fields: "id,name,handle,description,parent_category_id,rank",
    limit: 1000,
  })

  // Only reached on a cache miss. The nav renders on every page, so this line
  // appearing on each request means the cache below is not working.
  console.info(
    `[categories] fetched ${product_categories.length} from backend at ${new Date().toISOString()}`
  )

  const byId = new Map<string, CategoryNode>()

  for (const category of product_categories) {
    byId.set(category.id, {
      id: category.id,
      name: category.name,
      handle: category.handle,
      description: category.description ?? null,
      parent_category_id: category.parent_category_id ?? null,
      rank: category.rank ?? 0,
      children: [],
    })
  }

  const roots: CategoryNode[] = []

  for (const node of byId.values()) {
    const parent = node.parent_category_id
      ? byId.get(node.parent_category_id)
      : undefined

    // A child whose parent is missing from the response would otherwise vanish
    // from the nav entirely. Surfacing it at the top is wrong but visible.
    if (parent) {
      parent.children.push(node)
    } else {
      roots.push(node)
    }
  }

  // Rank, then name — categories seeded without an explicit rank all share 0,
  // and creation order is not something a shopper can predict.
  const sortTree = (nodes: CategoryNode[]) => {
    nodes.sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name))
    nodes.forEach((node) => sortTree(node.children))
  }

  sortTree(roots)

  return roots
}

/**
 * Cached for the whole app. The nav renders this on every page, so it must not
 * cost a backend round trip per request. Revalidated by tag when categories
 * change in admin.
 */
export const getCategoryTree = unstable_cache(fetchCategoryTree, [CACHE_TAG], {
  tags: [CACHE_TAG],
})

/** Depth-first walk of the cached tree. */
function* walk(nodes: CategoryNode[]): Generator<CategoryNode> {
  for (const node of nodes) {
    yield node
    yield* walk(node.children)
  }
}

export async function getCategoryByHandle(
  handle: string
): Promise<CategoryNode | undefined> {
  const tree = await getCategoryTree()

  for (const node of walk(tree)) {
    if (node.handle === handle) {
      return node
    }
  }

  return undefined
}

/**
 * The category's own id plus every descendant's.
 *
 * Products are assigned to leaves only, and a parent category returns none of
 * its children's products — so a parent listing page has to pass the whole
 * subtree to `category_id`. Resolved from the cached tree, so this is free.
 */
export async function getDescendantIds(handle: string): Promise<string[]> {
  const category = await getCategoryByHandle(handle)

  if (!category) {
    return []
  }

  return [category.id, ...Array.from(walk(category.children), (n) => n.id)]
}

/** Root → … → category, for breadcrumbs. Handles stay single-segment. */
export async function getCategoryPath(handle: string): Promise<CategoryNode[]> {
  const tree = await getCategoryTree()

  const find = (
    nodes: CategoryNode[],
    trail: CategoryNode[]
  ): CategoryNode[] | undefined => {
    for (const node of nodes) {
      const next = [...trail, node]

      if (node.handle === handle) {
        return next
      }

      const found = find(node.children, next)

      if (found) {
        return found
      }
    }
  }

  return find(tree, []) ?? []
}

import {
  getCategoryTree,
  getDescendantIds,
  type CategoryNode,
} from "@/lib/data/categories"

/**
 * Category tree diagnostic.
 *
 * Three things here have no other proof before the nav depends on them: the
 * tree assembles at whatever depth admin returns, `getDescendantIds` collects a
 * whole subtree, and `getCategoryTree` genuinely caches.
 *
 * Dev only; task 155 blocks /dev/* in production.
 */

// Re-run the page on every load. The data cache underneath is deliberately left
// in place — unlike /dev/health, which needed the uncached fetchRegion because a
// connection check must not answer from cache. Here the cache is what's tested:
// watch the terminal for the [categories] line on reload.
export const dynamic = "force-dynamic"

function countNodes(nodes: CategoryNode[]): number {
  return nodes.reduce((n, node) => n + 1 + countNodes(node.children), 0)
}

function maxDepth(nodes: CategoryNode[], depth = 1): number {
  return nodes.reduce(
    (deepest, node) =>
      Math.max(
        deepest,
        node.children.length ? maxDepth(node.children, depth + 1) : depth
      ),
    0
  )
}

function Branch({ node, depth }: { node: CategoryNode; depth: number }) {
  return (
    <li>
      <div
        className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-1"
        style={{ paddingLeft: `${depth * 1.5}rem` }}
      >
        <span className="font-medium">{node.name}</span>
        <code className="text-muted">/{node.handle}</code>
        <span className="text-muted">rank {node.rank}</span>
        {node.children.length > 0 && (
          <span className="text-muted">({node.children.length} children)</span>
        )}
      </div>

      {node.children.length > 0 && (
        <ul>
          {node.children.map((child) => (
            <Branch key={child.id} node={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  )
}

export default async function CategoriesPage() {
  const tree = await getCategoryTree()

  // Resolved from the cached tree in memory, so this costs nothing per call.
  const descendants = await Promise.all(
    tree.map(async (node) => ({
      node,
      ids: await getDescendantIds(node.handle),
    }))
  )

  const total = countNodes(tree)
  // Own id plus descendants, per top-level category. Should account for every
  // category when the tree has a single root layer.
  const covered = descendants.reduce((n, d) => n + d.ids.length, 0)
  const ranked = descendants.some((d) => d.node.rank > 0)

  return (
    <main className="min-h-screen bg-cream px-6 py-12 text-brand">
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <div>
          <h1 className="text-2xl font-bold">Category tree</h1>
          <p className="mt-1 text-muted">
            {total} categories · {tree.length} top-level · {maxDepth(tree)} levels
            deep
          </p>
        </div>

        {!ranked && (
          <p className="rounded-lg border border-line bg-paper p-4 text-muted">
            No category has a rank set, so ordering falls back to alphabetical.
            Ranks are task 9.
          </p>
        )}

        <section className="rounded-lg border border-line bg-paper p-6">
          <h2 className="mb-3 font-bold">Tree, indented by depth</h2>
          <ul>
            {tree.map((node) => (
              <Branch key={node.id} node={node} depth={0} />
            ))}
          </ul>
        </section>

        <section className="rounded-lg border border-line bg-paper p-6">
          <h2 className="mb-1 font-bold">getDescendantIds</h2>
          <p className="mb-4 text-muted">
            {covered} of {total} categories covered by the top-level subtrees. A
            parent listing page passes these ids to Medusa — products sit on
            leaves only, so a short list here renders an empty category page.
          </p>

          <div className="flex flex-col gap-4">
            {descendants.map(({ node, ids }) => (
              <div key={node.id} className="flex flex-col gap-1">
                <div className="flex items-baseline gap-3">
                  <span className="font-medium">{node.name}</span>
                  <span className="text-muted">{ids.length} ids</span>
                </div>
                <code className="break-all text-muted">{ids.join(", ")}</code>
              </div>
            ))}
          </div>
        </section>

        <p className="text-muted">
          Reload and watch the dev terminal. The{" "}
          <code>[categories] fetched…</code> line should appear once and stay
          silent afterwards — that is the cache working.
        </p>
      </div>
    </main>
  )
}

import Link from "next/link"

import type { CategoryNode } from "@/lib/data/categories"
import { cn } from "@/lib/utils/format"

/**
 * One level of the tree, inline and pipe-separated:
 *
 *   Skincare | Makeup | Fragrances
 *
 * Recursive, so a third level renders beneath its parents in muted text rather
 * than being dropped — the tree is whatever admin returns, and a hardcoded two
 * levels would silently lose a third the day someone adds one.
 */
function InlineLevel({ nodes, depth }: { nodes: CategoryNode[]; depth: number }) {
  if (nodes.length === 0) {
    return null
  }

  const deeper = nodes.filter((node) => node.children.length > 0)

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {nodes.map((node, i) => (
          <span key={node.id} className="flex items-center gap-x-3">
            {i > 0 && (
              <span aria-hidden className="text-line">
                |
              </span>
            )}
            <Link
              href={`/categories/${node.handle}`}
              className={cn(
                "whitespace-nowrap hover:text-brand-light hover:underline",
                depth === 0 ? "font-medium text-brand" : "text-sm text-muted"
              )}
            >
              {node.name}
            </Link>
          </span>
        ))}
      </div>

      {deeper.map((node) => (
        <div key={node.id} className="flex flex-wrap items-baseline gap-x-3">
          <span className="text-sm text-muted">{node.name}:</span>
          <InlineLevel nodes={node.children} depth={depth + 1} />
        </div>
      ))}
    </>
  )
}

export type CategoryMegaMenuProps = {
  tree: CategoryNode[]
  className?: string
}

/**
 * Desktop hover navigation. Hidden below lg — MobileNav covers that range, and
 * the two never render together.
 *
 * Pure CSS hover, no state: that is what makes the panel fade in smoothly
 * rather than appearing instantly, and it keeps this a server component. The
 * panel lives inside its trigger's <li>, so moving the pointer down into it
 * keeps the hover alive without any JS bridging.
 */
export function CategoryMegaMenu({ tree, className }: CategoryMegaMenuProps) {
  return (
    <nav aria-label="Categories" className={cn("hidden lg:block", className)}>
      <ul className="flex items-center gap-1">
        {tree.map((top) => (
          // `static` so the panel below can span the full header width rather
          // than being pinned under this one item. The sticky <header> is the
          // positioning context.
          <li key={top.id} className="group static">
            <Link
              href={`/categories/${top.handle}`}
              className={cn(
                "flex h-11 items-center rounded-md px-3 font-medium text-brand",
                "transition-colors hover:bg-brand/5",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              )}
            >
              {top.name}
            </Link>

            {top.children.length > 0 && (
              <div
                className={cn(
                  "absolute inset-x-0 top-full z-40 border-t border-line bg-paper shadow-lg",
                  // Fades and slides down. `invisible` rather than `hidden` so
                  // there is something to transition from, and it still cannot
                  // be clicked or tabbed into while closed.
                  "invisible -translate-y-1 opacity-0 transition-all duration-200 ease-out",
                  "group-hover:visible group-hover:translate-y-0 group-hover:opacity-100",
                  "group-focus-within:visible group-focus-within:translate-y-0",
                  "group-focus-within:opacity-100"
                )}
              >
                {/* Compact: one wrapped row rather than a grid of columns, so
                    the panel is a strip under the header instead of a full
                    drop-down that covers the page. */}
                <div className="mx-auto flex max-w-7xl flex-col gap-2 px-8 py-4">
                  <InlineLevel nodes={top.children} depth={0} />
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </nav>
  )
}

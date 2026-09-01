"use client"

import Link from "next/link"
import { useState } from "react"

import type { CategoryNode } from "@/lib/data/categories"
import { cn } from "@/lib/utils/format"

/**
 * Levels 3 and deeper, rendered recursively.
 *
 * Not capped at a fixed depth: the tree is whatever admin returns, and a
 * hardcoded two levels would silently drop a third the day someone adds one.
 */
function SubTree({ nodes, depth }: { nodes: CategoryNode[]; depth: number }) {
  if (nodes.length === 0) {
    return null
  }

  return (
    <ul className={cn("flex flex-col gap-1", depth > 0 && "ml-3 mt-1")}>
      {nodes.map((node) => (
        <li key={node.id}>
          <Link
            href={`/categories/${node.handle}`}
            className="block py-0.5 text-muted hover:text-brand"
          >
            {node.name}
          </Link>
          <SubTree nodes={node.children} depth={depth + 1} />
        </li>
      ))}
    </ul>
  )
}

export type CategoryMegaMenuProps = {
  tree: CategoryNode[]
  className?: string
}

/**
 * Desktop hover navigation. Hidden below lg — MobileNav covers that range, and
 * the two never render together.
 */
export function CategoryMegaMenu({ tree, className }: CategoryMegaMenuProps) {
  const [openId, setOpenId] = useState<string | null>(null)

  return (
    <nav
      aria-label="Categories"
      // onMouseLeave on the wrapper rather than each item, so moving the
      // pointer from the trigger down into the panel does not close it.
      onMouseLeave={() => setOpenId(null)}
      className={cn("hidden lg:block", className)}
    >
      <ul className="flex items-center gap-1">
        {tree.map((top) => {
          const open = openId === top.id

          return (
            <li key={top.id} className="static">
              <Link
                href={`/categories/${top.handle}`}
                onMouseEnter={() => setOpenId(top.id)}
                onFocus={() => setOpenId(top.id)}
                aria-expanded={top.children.length > 0 ? open : undefined}
                className={cn(
                  "flex h-11 items-center rounded-md px-3 font-medium",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                  open ? "text-brand-light" : "text-brand hover:text-brand-light"
                )}
              >
                {top.name}
              </Link>

              {open && top.children.length > 0 && (
                // Full-width panel anchored to the header, not to the trigger:
                // column counts vary per category and a trigger-anchored panel
                // would sit half off-screen under the rightmost item.
                <div className="absolute inset-x-0 top-full z-40 border-t border-line bg-paper shadow-lg">
                  <div className="mx-auto max-w-7xl px-8 py-6">
                    <div className="grid grid-cols-4 gap-x-8 gap-y-6">
                      {top.children.map((child) => (
                        <div key={child.id} className="flex flex-col gap-2">
                          <Link
                            href={`/categories/${child.handle}`}
                            className="font-bold text-brand hover:text-brand-light"
                          >
                            {child.name}
                          </Link>
                          <SubTree nodes={child.children} depth={0} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

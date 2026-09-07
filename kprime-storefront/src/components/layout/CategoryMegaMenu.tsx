import Link from "next/link"

import type { CategoryNode } from "@/lib/data/categories"
import { cn } from "@/lib/utils/format"

export type CategoryMegaMenuProps = {
  tree: CategoryNode[]
  className?: string
}

/**
 * Desktop hover navigation. Hidden below lg — MobileNav covers that range, and
 * the two never render together.
 *
 * **Shows exactly one level down: the top category's direct children.**
 * Categories now run three deep (top → subcategory → leaf, e.g.
 * Electronics → Mobile Accessories → Chargers). Drilling the panel down to the
 * leaves as well put nine names under three labels in one hover strip — no one
 * reads a menu that deep on a screen this transient. A shopper who wants a leaf
 * lands on the subcategory in one click and picks it there, where it has room
 * to be a real page instead of a line of text.
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
                "flex h-11 items-center rounded-md px-3 font-medium text-cream",
                "transition-colors hover:bg-cream/10",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream"
              )}
            >
              {top.name}
            </Link>

            {top.children.length > 0 && (
              <div
                className={cn(
                  "absolute inset-x-0 top-full z-40 border-t border-brand-light/40 bg-paper shadow-lg",
                  // Fades and slides down. `invisible` rather than `hidden` so
                  // there is something to transition from, and it still cannot
                  // be clicked or tabbed into while closed.
                  "invisible -translate-y-1 opacity-0 transition-all duration-200 ease-out",
                  "group-hover:visible group-hover:translate-y-0 group-hover:opacity-100",
                  "group-focus-within:visible group-focus-within:translate-y-0",
                  "group-focus-within:opacity-100"
                )}
              >
                <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-1 px-8 py-4">
                  {top.children.map((sub, i) => (
                    <span key={sub.id} className="flex items-center gap-x-3">
                      {i > 0 && (
                        <span aria-hidden className="text-line">
                          |
                        </span>
                      )}
                      <Link
                        href={`/categories/${sub.handle}`}
                        className="whitespace-nowrap font-medium text-brand hover:text-brand-light hover:underline"
                      >
                        {sub.name}
                      </Link>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </nav>
  )
}

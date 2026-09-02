import Link from "next/link"

import type { CategoryNode } from "@/lib/data/categories"
import { cn } from "@/lib/utils/format"

export type CategoryHeaderProps = {
  category: CategoryNode
  count: number
  className?: string
}

/**
 * Title, description, subcategory chips and result count.
 *
 * Chips only render when the category has children, so a leaf shows no empty
 * gap — the whole block collapses rather than leaving a hole above the grid.
 */
export function CategoryHeader({
  category,
  count,
  className,
}: CategoryHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <h1 className="text-2xl font-bold sm:text-3xl">{category.name}</h1>

      {category.description && (
        <p className="max-w-2xl text-muted">{category.description}</p>
      )}

      {category.children.length > 0 && (
        <nav aria-label="Subcategories" className="mt-1">
          {/* Scrolls rather than wraps on a phone: four chips wrapping to three
              rows pushes the grid below the fold. */}
          <ul
            className={cn(
              "flex gap-2 overflow-x-auto pb-1",
              "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
              "sm:flex-wrap sm:overflow-visible sm:pb-0"
            )}
          >
            {category.children.map((child) => (
              <li key={child.id} className="shrink-0">
                <Link
                  href={`/categories/${child.handle}`}
                  className={cn(
                    "flex min-h-11 items-center whitespace-nowrap rounded-md border",
                    "border-line px-3 text-sm text-brand hover:border-brand",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  )}
                >
                  {child.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <p className="text-muted">
        {count} {count === 1 ? "product" : "products"}
      </p>
    </div>
  )
}

import Link from "next/link"
import { Fragment } from "react"

import { cn } from "@/lib/utils/format"

export type Crumb = { label: string; href?: string }

export type BreadcrumbsProps = {
  items: Crumb[]
  className?: string
}

function Separator() {
  return (
    <span aria-hidden className="shrink-0 text-muted">
      /
    </span>
  )
}

/**
 * Trail from home to the current page.
 *
 * On a phone the middle is collapsed to an ellipsis rather than wrapped. A
 * four-level trail wrapping to three lines pushes the product image below the
 * fold, which costs far more than the intermediate labels are worth — the first
 * and last crumbs carry the orientation.
 */
export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  if (items.length === 0) {
    return null
  }

  const first = items[0]
  const last = items[items.length - 1]
  const middle = items.slice(1, -1)
  const collapses = items.length > 2

  const crumb = (item: Crumb, isCurrent: boolean) =>
    isCurrent || !item.href ? (
      <span
        aria-current={isCurrent ? "page" : undefined}
        className={cn("truncate", isCurrent ? "text-brand" : "text-muted")}
      >
        {item.label}
      </span>
    ) : (
      <Link href={item.href} className="truncate text-muted hover:text-brand">
        {item.label}
      </Link>
    )

  return (
    <nav aria-label="Breadcrumb" className={cn("w-full", className)}>
      {/* One line, never wraps. min-w-0 lets the flex children actually
          truncate — without it they overflow the container instead. */}
      <ol className="flex min-w-0 items-center gap-2 whitespace-nowrap">
        <li className="min-w-0 shrink">{crumb(first, items.length === 1)}</li>

        {collapses && (
          <>
            {/* Below sm: the whole middle becomes one ellipsis. */}
            <li className="flex items-center gap-2 sm:hidden">
              <Separator />
              <span className="text-muted">…</span>
            </li>

            {/* sm and up: every crumb, each able to truncate on its own. */}
            {middle.map((item) => (
              <li
                key={item.label}
                className="hidden min-w-0 shrink items-center gap-2 sm:flex"
              >
                <Separator />
                {crumb(item, false)}
              </li>
            ))}
          </>
        )}

        {items.length > 1 && (
          <li className="flex min-w-0 shrink-0 items-center gap-2">
            <Separator />
            {crumb(last, true)}
          </li>
        )}
      </ol>
    </nav>
  )
}

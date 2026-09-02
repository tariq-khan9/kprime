"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import type { ReactNode } from "react"

import { buildHref, parseFilters, setPage } from "@/lib/filters/url-state"
import { cn } from "@/lib/utils/format"

/**
 * Page numbers around the current one, with ellipses.
 *
 * `edge` is how many neighbours to show either side — 1 on a phone, 2 from sm.
 * Both are rendered and toggled with CSS rather than measuring the viewport, so
 * there is no layout shift on hydration.
 */
function pageList(current: number, total: number, edge: number): (number | "…")[] {
  const pages = new Set<number>([1, total])

  for (let i = current - edge; i <= current + edge; i++) {
    if (i > 1 && i < total) {
      pages.add(i)
    }
  }

  const sorted = [...pages].sort((a, b) => a - b)
  const out: (number | "…")[] = []

  sorted.forEach((page, i) => {
    if (i > 0 && page - sorted[i - 1] > 1) {
      out.push("…")
    }
    out.push(page)
  })

  return out
}

function Arrow({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden className="size-5">
      <path
        d={direction === "left" ? "M12 4l-6 6 6 6" : "M8 4l6 6-6 6"}
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export type PaginationControlsProps = {
  page: number
  pageCount: number
  className?: string
}

export function PaginationControls({
  page,
  pageCount,
  className,
}: PaginationControlsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const state = parseFilters(searchParams)

  // One page is not a pagination problem.
  if (pageCount <= 1) {
    return null
  }

  // setPage is the one mutation that does NOT reset the page, and buildHref
  // carries every other param — so filters and sort survive paging.
  const go = (next: number) =>
    router.push(buildHref(pathname, setPage(state, next)), { scroll: true })

  const button = (
    key: string,
    label: string,
    content: ReactNode,
    onClick: () => void,
    disabled: boolean,
    current = false
  ) => (
    <li key={key}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-current={current ? "page" : undefined}
        // Always spelled out for a screen reader, even when the visible content
        // is an arrow glyph.
        aria-label={label}
        className={cn(
          "flex size-11 items-center justify-center rounded-md border text-sm",
          current
            ? "border-brand bg-brand text-cream"
            : "border-line text-brand hover:border-brand",
          disabled && "cursor-not-allowed opacity-40 hover:border-line"
        )}
      >
        {content}
      </button>
    </li>
  )

  const numbers = (edge: number, hiddenClass: string) => (
    <ul className={cn("flex items-center gap-1", hiddenClass)}>
      {pageList(page, pageCount, edge).map((entry, i) =>
        entry === "…" ? (
          <li
            key={`gap-${i}`}
            aria-hidden
            className="flex size-11 items-center justify-center text-muted"
          >
            …
          </li>
        ) : (
          button(
            `p${entry}`,
            `Page ${entry}`,
            entry,
            () => go(entry),
            false,
            entry === page
          )
        )
      )}
    </ul>
  )

  return (
    <nav
      aria-label="Pagination"
      className={cn("flex items-center justify-center gap-1", className)}
    >
      <ul className="flex items-center gap-1">
        {button(
          "prev",
          "Previous page",
          <Arrow direction="left" />,
          () => go(page - 1),
          page <= 1
        )}
      </ul>

      {/* Fewer neighbours at 360px, where 7 buttons would overflow. */}
      {numbers(1, "sm:hidden")}
      {numbers(2, "hidden sm:flex")}

      <ul className="flex items-center gap-1">
        {button(
          "next",
          "Next page",
          <Arrow direction="right" />,
          () => go(page + 1),
          page >= pageCount
        )}
      </ul>
    </nav>
  )
}

"use client"

import Link from "next/link"
import { useState } from "react"

import type { CategoryNode } from "@/lib/data/categories"
import { cn } from "@/lib/utils/format"

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden
      className={cn(
        "size-4 shrink-0 text-muted transition-transform",
        open && "rotate-180"
      )}
    >
      <path
        d="M6 8l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * One tree row, recursive. Same two-target shape as `MobileNav`'s `Branch` and
 * for the same reason: the name has to navigate and the chevron has to expand,
 * and a shared trigger (Radix `Accordion`, `<summary>`) can only ever own one
 * of those — a category with children would become impossible to visit.
 *
 * **Defaults open along the current path, not always closed.** `onTrail` is
 * true for the active leaf and every one of its ancestors, so landing on
 * `/categories/chargers` shows Electronics → Mobile Accessories → Chargers
 * already expanded — a shopper should never have to re-click their own way
 * back down to where they are.
 *
 * **Re-derived on every navigation, without an effect.** Rows are keyed by the
 * category id, which does not change when the URL does, so React reuses the
 * same instances across a category switch rather than remounting them — a
 * plain `useState(onTrail)` would only read `onTrail` once and then ignore it
 * forever. The fix is React's own pattern for adjusting state from a changed
 * prop: compare against the last-seen value during render and call `setOpen`
 * right there. That still lets someone's manual expand/collapse of an
 * off-trail branch survive a re-render — it is only overridden when `onTrail`
 * itself flips, i.e. exactly on a real navigation.
 */
function Branch({
  node,
  depth,
  trailIds,
  activeId,
}: {
  node: CategoryNode
  depth: number
  trailIds: Set<string>
  activeId: string
}) {
  const hasChildren = node.children.length > 0
  const onTrail = trailIds.has(node.id)
  const isActive = node.id === activeId

  const [open, setOpen] = useState(onTrail)
  const [prevOnTrail, setPrevOnTrail] = useState(onTrail)

  if (onTrail !== prevOnTrail) {
    setPrevOnTrail(onTrail)
    setOpen(onTrail)
  }

  return (
    <li>
      <div
        className="flex items-center gap-0.5"
        style={{ paddingLeft: `${depth * 0.85}rem` }}
      >
        <Link
          href={`/categories/${node.handle}`}
          aria-current={isActive ? "page" : undefined}
          className={cn(
            "flex min-h-9 flex-1 items-center rounded-md px-2 py-1 text-sm leading-tight",
            "hover:bg-brand/5 hover:text-brand",
            isActive
              ? "font-semibold text-brand"
              : onTrail
                ? "text-brand"
                : "text-muted"
          )}
        >
          {node.name}
        </Link>

        {hasChildren && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={`${open ? "Collapse" : "Expand"} ${node.name}`}
            className="flex size-9 shrink-0 items-center justify-center rounded-md hover:bg-brand/5"
          >
            <Chevron open={open} />
          </button>
        )}
      </div>

      {hasChildren && open && (
        <ul>
          {node.children.map((child) => (
            <Branch
              key={child.id}
              node={child}
              depth={depth + 1}
              trailIds={trailIds}
              activeId={activeId}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

export type CategoryTreeNavProps = {
  /**
   * Whichever root(s) the caller wants rendered, full depth. The category page
   * passes exactly one — `[trail[0]]` — so `/categories/electronics` and
   * everything under it shows only the Electronics tree, never Cosmetics or
   * Kitchenware beside it. Generic over more than one root regardless, since
   * nothing about `Branch` assumes a single tree.
   */
  tree: CategoryNode[]
  /** Root → … → the category this page is showing. */
  trail: CategoryNode[]
  className?: string
}

/**
 * The category rail: the current section's tree, three deep, with the page's
 * own branch already open and highlighted.
 *
 * **This is the standard the request asked for** — a Daraz/Amazon-style
 * left-hand tree, always present at desktop width, replacing a hover menu and
 * a header chip row as the two places category depth used to be hidden or
 * duplicated. `CategoryHeader`'s chip row still carries this job on mobile,
 * where there is no room for a persistent sidebar.
 *
 * **Scoped to the section, not the whole catalogue.** Switching between
 * unrelated top-level categories is what the header nav is for; this rail's
 * job is drilling *inside* the one a shopper is already in.
 */
export function CategoryTreeNav({ tree, trail, className }: CategoryTreeNavProps) {
  const trailIds = new Set(trail.map((node) => node.id))
  const activeId = trail[trail.length - 1]?.id ?? ""

  return (
    <nav aria-label="Categories" className={cn(className)}>
      <h2 className="mb-2 font-bold text-brand">Categories</h2>

      <ul className="flex flex-col gap-0.5">
        {tree.map((node) => (
          <Branch
            key={node.id}
            node={node}
            depth={0}
            trailIds={trailIds}
            activeId={activeId}
          />
        ))}
      </ul>
    </nav>
  )
}

"use client"

import Link from "next/link"
import { useState } from "react"

import { Drawer } from "@/components/ui/Drawer"
import { HELP_LINKS, POLICY_LINKS } from "@/config/site"
import type { CategoryNode } from "@/lib/data/categories"
import { cn } from "@/lib/utils/format"

function MenuIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden className="size-5">
      <path
        d="M3 5h14M3 10h14M3 15h14"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  )
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden
      className={cn(
        "size-5 shrink-0 text-muted transition-transform",
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
 * One tree level, recursive.
 *
 * Deliberately not the shared Accordion primitive: this row needs two targets
 * side by side — the name navigates, the chevron expands. Accordion's trigger
 * owns the whole row, so a parent category could be opened but never visited.
 */
function Branch({
  node,
  depth,
  onNavigate,
}: {
  node: CategoryNode
  depth: number
  onNavigate: () => void
}) {
  const [open, setOpen] = useState(false)
  const hasChildren = node.children.length > 0

  return (
    <li>
      <div
        className="flex items-center border-b border-line"
        style={{ paddingLeft: `${depth * 0.75}rem` }}
      >
        <Link
          href={`/categories/${node.handle}`}
          onClick={onNavigate}
          className="flex min-h-11 flex-1 items-center text-brand"
        >
          {node.name}
        </Link>

        {hasChildren && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={`${open ? "Collapse" : "Expand"} ${node.name}`}
            className="flex size-11 shrink-0 items-center justify-center rounded-md hover:bg-brand/5"
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
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

export function MobileNav({ tree }: { tree: CategoryNode[] }) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <Drawer
      open={open}
      onOpenChange={setOpen}
      side="left"
      title="Menu"
      trigger={
        <button
          type="button"
          aria-label="Open menu"
          className={cn(
            "flex size-11 items-center justify-center rounded-md text-brand",
            "hover:bg-brand/5 focus-visible:outline-none focus-visible:ring-2",
            "focus-visible:ring-brand lg:hidden"
          )}
        >
          <MenuIcon />
        </button>
      }
    >
      <ul className="flex flex-col">
        {tree.map((node) => (
          <Branch key={node.id} node={node} depth={0} onNavigate={close} />
        ))}
      </ul>

      <div className="mt-6 flex flex-col">
        {[...HELP_LINKS, ...POLICY_LINKS].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={close}
            className="flex min-h-11 items-center text-muted hover:text-brand"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </Drawer>
  )
}

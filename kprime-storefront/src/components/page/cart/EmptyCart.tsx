import Link from "next/link"

import { EmptyState } from "@/components/shared/EmptyState"
import { Button } from "@/components/ui/Button"

function BagIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden className="size-12">
      <path
        d="M12 16h24l-2.5 22a3 3 0 01-3 2.7H17.5a3 3 0 01-3-2.7L12 16z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M18 16v-2a6 6 0 1112 0v2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

/**
 * Shown instead of the cart table, never alongside it.
 *
 * An empty cart must not render column headers over nothing or a summary
 * totalling zero — both read as a broken page rather than an empty one.
 */
export function EmptyCart({ className }: { className?: string }) {
  return (
    <EmptyState
      icon={<BagIcon />}
      title="Your cart is empty"
      description="Browse the catalogue and add something you like. Cash on delivery is available across Pakistan."
      action={
        <Button variant="primary" asChild>
          <Link href="/">Start shopping</Link>
        </Button>
      }
      className={className}
    />
  )
}

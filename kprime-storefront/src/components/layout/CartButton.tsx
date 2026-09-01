"use client"

import Link from "next/link"

import { useCartCount } from "@/lib/cart/useCartCount"
import { cn } from "@/lib/utils/format"

function CartIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden className={className}>
      <path
        d="M3 3h2l1.6 8.4a1.5 1.5 0 001.5 1.2h6.3a1.5 1.5 0 001.5-1.2L17 6H5.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="8.5" cy="16" r="1.2" fill="currentColor" />
      <circle cx="14.5" cy="16" r="1.2" fill="currentColor" />
    </svg>
  )
}

export function CartButton({ className }: { className?: string }) {
  const count = useCartCount()

  return (
    <Link
      href="/cart"
      // The count is in the label rather than left to the badge alone, so a
      // screen reader announces "Cart, 3 items" instead of just "Cart".
      aria-label={count > 0 ? `Cart, ${count} items` : "Cart"}
      className={cn(
        "relative flex size-11 items-center justify-center rounded-md text-brand",
        "hover:bg-brand/5 focus-visible:outline-none focus-visible:ring-2",
        "focus-visible:ring-brand",
        className
      )}
    >
      <CartIcon className="size-6" />

      {/* No badge at zero — an empty cart should not look like it needs
          attention. */}
      {count > 0 && (
        <span
          className={cn(
            "absolute right-1 top-1 flex min-w-5 items-center justify-center",
            "rounded-full bg-action px-1 text-xs font-bold text-action-ink"
          )}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  )
}

"use client"

/**
 * Item count for the header badge.
 *
 * A deliberate stub returning 0 until task 93 builds the cart data layer and
 * its context. Kept as its own module so that task swaps one function rather
 * than editing CartButton — the button's badge logic, sizing and accessibility
 * are already correct and should not be touched again.
 */
export function useCartCount(): number {
  return 0
}

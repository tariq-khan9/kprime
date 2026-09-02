import type { ProductVariantDetail } from "@/lib/data/products"
import { cn } from "@/lib/utils/format"

/** At or below this, say how few are left. Above it, just say "in stock". */
export const LOW_STOCK_THRESHOLD = 5

export type StockLevel = "in_stock" | "low_stock" | "out_of_stock"

/**
 * Stock state for a variant.
 *
 * Untracked inventory counts as in stock: `manage_inventory: false` means the
 * merchant is not counting, not that there are none. Backorderable variants are
 * in stock too — they can still be ordered.
 */
export function stockLevelOf(
  variant: ProductVariantDetail | null | undefined
): StockLevel {
  if (!variant) {
    return "out_of_stock"
  }

  if (!variant.manageInventory || variant.allowBackorder) {
    return "in_stock"
  }

  const quantity = variant.inventoryQuantity

  if (quantity === null) {
    return "in_stock"
  }

  if (quantity <= 0) {
    return "out_of_stock"
  }

  return quantity <= LOW_STOCK_THRESHOLD ? "low_stock" : "in_stock"
}

export type StockIndicatorProps = {
  variant: ProductVariantDetail | null | undefined
  className?: string
}

/**
 * In stock / low stock / out of stock.
 *
 * **Green is a status colour here, never a CTA (§2.3).** It is a small dot and
 * a line of text sitting beside the amber button, not a filled block — a green
 * pill next to an amber button reads as two competing actions and the shopper
 * has to work out which one buys the thing.
 *
 * Low stock states the number. "Only 3 left" is a fact; "Selling fast" is a
 * sales tactic, and this shop does not make claims it cannot support.
 */
export function StockIndicator({ variant, className }: StockIndicatorProps) {
  const level = stockLevelOf(variant)

  const label =
    level === "out_of_stock"
      ? "Out of stock"
      : level === "low_stock"
        ? `Only ${variant?.inventoryQuantity} left`
        : "In stock"

  const tone =
    level === "out_of_stock"
      ? "text-muted"
      : level === "low_stock"
        ? "text-sale"
        : "text-success"

  return (
    <p
      // Announced when the variant changes, so a screen reader hears that the
      // selection just went out of stock rather than only seeing it.
      aria-live="polite"
      className={cn("flex items-center gap-2 text-sm font-medium", tone, className)}
    >
      <span
        aria-hidden
        className={cn(
          "block size-2 rounded-full",
          level === "out_of_stock"
            ? "bg-muted"
            : level === "low_stock"
              ? "bg-sale"
              : "bg-success"
        )}
      />
      {label}
    </p>
  )
}

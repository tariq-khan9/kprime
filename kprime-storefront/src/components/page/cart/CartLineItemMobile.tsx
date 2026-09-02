"use client"

import Link from "next/link"

import {
  LineThumbnail,
  RemoveButton,
  useCartLine,
} from "@/components/page/cart/CartLineItem"
import { PriceDisplay } from "@/components/shared/PriceDisplay"
import { QuantityStepper } from "@/components/shared/QuantityStepper"
import type { CartLine } from "@/lib/data/cart"
import { cn } from "@/lib/utils/format"

/**
 * Stacked card for 360px.
 *
 * Reuses `useCartLine`, so optimistic updates, rollback and the error toast are
 * literally the same code as the desktop row — only the arrangement differs.
 *
 * **Nothing here can overflow horizontally.** The title is the risk: a long
 * product name with no spaces would push the row wider than the viewport, so it
 * is clamped to two lines inside a `min-w-0` column. The quantity stepper and
 * price sit on their own row underneath rather than competing with it for
 * width.
 */
export function CartLineItemMobile({
  line,
  className,
}: {
  line: CartLine
  className?: string
}) {
  const { quantity, removed, pending, change, remove } = useCartLine(line)

  if (removed) {
    return null
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b border-line py-4",
        pending && "opacity-60",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <LineThumbnail line={line} />

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {line.productHandle ? (
            <Link
              href={`/products/${line.productHandle}`}
              // break-words catches a long unbroken word, which is what would
              // otherwise force the page to scroll sideways.
              className="line-clamp-2 break-words font-medium text-brand"
            >
              {line.title}
            </Link>
          ) : (
            <span className="line-clamp-2 break-words font-medium text-brand">
              {line.title}
            </span>
          )}

          {line.variantTitle && (
            <span className="text-sm text-muted">{line.variantTitle}</span>
          )}

          <PriceDisplay
            price={line.unitPrice * quantity}
            size="line"
            className="mt-1"
          />
        </div>
      </div>

      {/* Controls on their own row, thumb-reachable and full width. */}
      <div className="flex items-center justify-between gap-3">
        <QuantityStepper
          value={quantity}
          onChange={change}
          disabled={pending}
          id={`qty-m-${line.id}`}
        />

        <RemoveButton onClick={remove} disabled={pending} />
      </div>
    </div>
  )
}

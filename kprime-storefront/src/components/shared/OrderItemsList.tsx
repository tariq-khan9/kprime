import Image from "next/image"

import { cn, formatPKR } from "@/lib/utils/format"

/**
 * One line, from a cart or an order.
 *
 * Deliberately neutral rather than either `CartLine` or a Medusa order item:
 * this renders on the checkout summary, the confirmation receipt and `/track`,
 * and those three read from two different backends shapes. A shared component
 * tied to one of them would force the other to fake it.
 */
export type OrderItem = {
  id: string
  title: string
  variantTitle?: string | null
  thumbnail?: string | null
  quantity: number
  /** Price for one unit. The line total is derived, never passed separately. */
  unitPrice: number
}

export type OrderItemsListProps = {
  items: OrderItem[]
  /** Tighter spacing and smaller thumbnails, for the checkout sidebar. */
  compact?: boolean
  className?: string
}

/**
 * The list of what was bought.
 *
 * Shared by the checkout summary, the confirmation page and `/track` so all
 * three show the same thing in the same order. This page is the only receipt a
 * customer gets (§2.2) — no email, no SMS — so it has to be legible in a
 * screenshot, which is why the line total is spelled out rather than left for
 * someone to multiply.
 */
export function OrderItemsList({
  items,
  compact = false,
  className,
}: OrderItemsListProps) {
  return (
    <ul className={cn("flex flex-col", compact ? "gap-3" : "gap-4", className)}>
      {items.map((item) => (
        <li key={item.id} className="flex items-start gap-3">
          <div
            className={cn(
              "relative aspect-[3/4] shrink-0 overflow-hidden rounded border",
              "border-line bg-cream",
              compact ? "w-12" : "w-16"
            )}
          >
            {item.thumbnail ? (
              <Image
                src={item.thumbnail}
                alt=""
                fill
                sizes={compact ? "48px" : "64px"}
                className="object-contain"
              />
            ) : (
              <span className="flex size-full items-center justify-center text-lg font-bold text-line">
                {item.title.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col">
            {/* break-words so a long unbroken product name cannot push the row
                wider than a 360px screen. */}
            <span
              className={cn(
                "line-clamp-2 break-words text-brand",
                compact ? "text-sm" : "text-sm sm:text-base"
              )}
            >
              {item.title}
            </span>

            {item.variantTitle && (
              <span className="text-xs text-muted">{item.variantTitle}</span>
            )}

            <span className="text-xs text-muted">
              Qty {item.quantity} × {formatPKR(item.unitPrice)}
            </span>
          </div>

          <span
            className={cn(
              "shrink-0 text-brand",
              compact ? "text-sm" : "text-sm font-medium sm:text-base"
            )}
          >
            {formatPKR(item.unitPrice * item.quantity)}
          </span>
        </li>
      ))}
    </ul>
  )
}

import type { HTMLAttributes } from "react"

import { cn } from "@/lib/utils/format"

export type BadgeVariant = "sale" | "success" | "neutral"

/**
 * Tinted backgrounds rather than solid fills: a badge sits on a ProductCard
 * next to the price and must not out-shout it, and solid sale-red at card scale
 * reads as a warning.
 *
 * Amber is absent by design — it means "act on this" and belongs to Button
 * alone. A badge is never actionable.
 */
const VARIANTS: Record<BadgeVariant, string> = {
  sale: "bg-sale/10 text-sale",
  success: "bg-success/10 text-success",
  neutral: "bg-muted/10 text-muted",
}

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant
}

export function Badge({
  variant = "neutral",
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm px-2 py-0.5 text-sm font-medium",
        VARIANTS[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}

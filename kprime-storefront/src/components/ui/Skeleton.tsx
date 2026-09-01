import type { HTMLAttributes } from "react"

import { cn } from "@/lib/utils/format"

/**
 * Loading placeholder.
 *
 * Carries no size of its own — the caller sets width, height and radius through
 * className so the skeleton occupies exactly the space its real content will.
 * A skeleton that is a different size from what replaces it causes the layout
 * shift it was added to prevent.
 */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-md bg-line", className)}
      {...props}
    />
  )
}

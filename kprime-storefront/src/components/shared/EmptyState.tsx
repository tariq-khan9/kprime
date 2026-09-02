import type { ReactNode } from "react"

import { cn } from "@/lib/utils/format"

export type EmptyStateProps = {
  title: string
  /** One line on why it is empty. Plain, not apologetic. */
  description?: string
  icon?: ReactNode
  /** A way forward — the part that stops this being a dead end. */
  action?: ReactNode
  className?: string
}

/**
 * Generic empty state. Reused by the cart (task 98) and order tracking (121).
 *
 * Always takes an `action`: an empty state without a next step is a dead end,
 * and the shopper's only remaining move is the back button.
 */
export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-lg border border-line",
        "bg-cream px-6 py-12 text-center",
        className
      )}
    >
      {icon && <div className="text-muted">{icon}</div>}

      <h2 className="text-lg font-bold text-brand">{title}</h2>

      {description && <p className="max-w-md text-muted">{description}</p>}

      {action && <div className="mt-2 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  )
}

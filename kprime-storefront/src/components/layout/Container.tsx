import type { ElementType, ReactNode } from "react"

import { cn } from "@/lib/utils/format"

export type ContainerProps = {
  children: ReactNode
  /** Render as `section`, `header`, `footer`… Defaults to `div`. */
  as?: ElementType
  className?: string
}

/**
 * The horizontal frame everything sits in.
 *
 * Gutters widen with the viewport rather than staying fixed: 16px at 360px is
 * the most a phone can spare, while the same value at 1440px leaves text
 * running edge to edge.
 */
export function Container({ children, as: Tag = "div", className }: ContainerProps) {
  return (
    <Tag className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)}>
      {children}
    </Tag>
  )
}

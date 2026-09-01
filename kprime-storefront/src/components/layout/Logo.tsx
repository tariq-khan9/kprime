import Link from "next/link"

import { SITE } from "@/config/site"
import { cn } from "@/lib/utils/format"

export type LogoProps = {
  /** `reversed` is for the navy footer. */
  variant?: "default" | "reversed"
  /** Shrinks with the header on scroll. */
  compact?: boolean
  className?: string
}

/**
 * Stacked wordmark: KARKHANO small above PRIME large, roughly 1:3 cap height.
 *
 * The letterspacing on KARKHANO is load-bearing, not decorative — at 0.35em the
 * eight narrow letters span the same width as the five large ones below, so the
 * lockup reads as one block rather than two lines that happen to be adjacent.
 */
export function Logo({ variant = "default", compact = false, className }: LogoProps) {
  const ink = variant === "reversed" ? "text-cream" : "text-brand"

  return (
    <Link
      href="/"
      aria-label={SITE.name}
      className={cn(
        "flex shrink-0 flex-col leading-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
        "focus-visible:ring-offset-2 focus-visible:ring-offset-cream",
        ink,
        className
      )}
    >
      <span
        aria-hidden
        className={cn(
          "font-medium",
          compact ? "text-[0.5rem]" : "text-[0.5rem] sm:text-[0.6rem]"
        )}
        style={{ letterSpacing: "0.35em" }}
      >
        {SITE.logo.top}
      </span>
      <span
        aria-hidden
        className={cn(
          "font-bold tracking-tight",
          compact ? "text-lg" : "text-lg sm:text-2xl"
        )}
      >
        {SITE.logo.bottom}
      </span>
    </Link>
  )
}

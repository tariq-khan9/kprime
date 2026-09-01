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
        "focus-visible:outline-none focus-visible:ring-2",
        variant === "reversed"
          ? "focus-visible:ring-cream focus-visible:ring-offset-brand"
          : "focus-visible:ring-brand focus-visible:ring-offset-cream",
        "focus-visible:ring-offset-2",
        ink,
        className
      )}
    >
      {/* The 1:3 cap-height ratio is what makes this read as one lockup rather
          than two stacked words, so both lines step up together. */}
      <span
        aria-hidden
        className={cn(
          "font-medium",
          compact ? "text-[0.6rem]" : "text-[0.6rem] sm:text-[0.72rem]"
        )}
        style={{ letterSpacing: "0.35em" }}
      >
        {SITE.logo.top}
      </span>
      <span
        aria-hidden
        className={cn(
          "font-bold tracking-tight",
          compact ? "text-xl" : "text-xl sm:text-3xl"
        )}
      >
        {SITE.logo.bottom}
      </span>
    </Link>
  )
}

import Image from "next/image"
import Link from "next/link"

import { SITE } from "@/config/site"
import { cn } from "@/lib/utils/format"

/** The file's real pixel size — Next needs it to reserve the box. */
const NATURAL = { width: 275, height: 239 }

export type LogoProps = {
  /**
   * `reversed` is the navy footer.
   *
   * It no longer changes the mark — a PNG cannot recolour itself — but the
   * focus ring still has to differ, since a navy ring is invisible on navy.
   */
  variant?: "default" | "reversed"
  /** Shrinks with the header on scroll. */
  compact?: boolean
  /**
   * Preload it. True in the header, where it is above the fold on every page
   * and an LCP candidate; false in the footer, which is never in the first
   * paint. Next dedupes the preload when both render, so this is about intent
   * as much as bytes.
   */
  priority?: boolean
  className?: string
}

/**
 * The brand mark.
 *
 * The image already contains the wordmark, so it replaces the old stacked
 * KARKHANO / PRIME text rather than sitting beside it.
 *
 * Known limitation: the triangle is solid black, so on the navy footer it
 * merges into the background and the logo reads as a floating orange K. A
 * cream-on-transparent version of the file would fix it with no change here
 * beyond a second `src`.
 */
export function Logo({
  variant = "default",
  compact = false,
  priority = false,
  className,
}: LogoProps) {
  return (
    <Link
      href="/"
      // The link is the accessible name; the image below is alt="" so a screen
      // reader announces "Karkhano Prime" once, not twice.
      aria-label={SITE.name}
      className={cn(
        "flex shrink-0 items-center",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        variant === "reversed"
          ? "focus-visible:ring-cream focus-visible:ring-offset-brand"
          : "focus-visible:ring-brand focus-visible:ring-offset-header",
        className
      )}
    >
      <Image
        src="/logo.png"
        alt=""
        width={NATURAL.width}
        height={NATURAL.height}
        priority={priority}
        // Height drives the size; width follows the aspect ratio. Passing the
        // natural dimensions above means the space is reserved before the file
        // arrives, so the header does not jump as it loads.
        className={cn(
          "w-auto transition-[height] duration-200",
          compact ? "h-9" : "h-9 sm:h-12"
        )}
      />
    </Link>
  )
}

import { ANNOUNCEMENT } from "@/config/site"
import { cn } from "@/lib/utils/format"

/**
 * Full-bleed strip above the header.
 *
 * Copy lives in config/site.ts and deliberately promises no free delivery —
 * every zone configured in tasks 5 and 6 charges, and a claim here would be
 * contradicted by the checkout total.
 */
export function AnnouncementBar({ className }: { className?: string }) {
  return (
    <div className={cn("w-full bg-brand text-cream", className)}>
      {/* Not inside Container: the navy runs edge to edge, only the text is
          constrained. Top padding only: the header below is the same navy and
          centres its 40px search in a 56px row, so its own 8px above the box
          is the gap under this text — pt-2 matches it above. */}
      <p className="mx-auto max-w-7xl px-4 pt-2 text-center text-xs sm:px-6 lg:px-8">
        {ANNOUNCEMENT}
      </p>
    </div>
  )
}

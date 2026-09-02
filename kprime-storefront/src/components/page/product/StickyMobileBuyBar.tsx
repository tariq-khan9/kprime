"use client"

import { useEffect, useState, type RefObject } from "react"

import { PriceDisplay } from "@/components/shared/PriceDisplay"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils/format"

export type StickyMobileBuyBarProps = {
  /** The in-page buy area. The bar shows once this scrolls out of view. */
  watch: RefObject<HTMLElement | null>
  price: number | null
  originalPrice?: number | null
  disabled?: boolean
  /** Wired in task 94. Absent means add-to-cart does not exist yet. */
  onAddToCart?: () => void
}

/**
 * Price and add-to-cart, pinned to the bottom on phones.
 *
 * Appears only once the real buy area has scrolled away, so the two are never
 * on screen together showing the same button twice.
 *
 * **Collision with `WhatsAppFloatButton` (task 48) is resolved here.** That
 * button already offsets itself by `--buy-bar-height`, so this bar publishes
 * its own height to the document and clears it on unmount — the float lifts
 * above the bar instead of sitting under it. Both sit at `z-30`, below the
 * header and every overlay, so a drawer or modal still covers them.
 *
 * Visibility is driven by IntersectionObserver rather than a scroll handler:
 * no work on the main thread per frame, which matters most on the cheap Android
 * this is designed for.
 */
export function StickyMobileBuyBar({
  watch,
  price,
  originalPrice,
  disabled = false,
  onAddToCart,
}: StickyMobileBuyBarProps) {
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const target = watch.current

    if (!target) {
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => setShown(!entry.isIntersecting),
      // A sliver still counts as visible, so the bar does not flicker in and
      // out while the buy area is half off the bottom of the screen.
      { threshold: 0 }
    )

    observer.observe(target)

    return () => observer.disconnect()
  }, [watch])

  useEffect(() => {
    // 4.5rem is this bar's height. Published so the WhatsApp float can clear it
    // rather than hard-coding the same number in two files.
    document.documentElement.style.setProperty(
      "--buy-bar-height",
      shown ? "4.5rem" : "0px"
    )

    return () => {
      document.documentElement.style.setProperty("--buy-bar-height", "0px")
    }
  }, [shown])

  return (
    <div
      // Kept mounted and translated instead of unmounted, so it slides rather
      // than appearing abruptly. aria-hidden while off screen keeps the
      // duplicate button out of the accessibility tree.
      aria-hidden={!shown}
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 flex h-[4.5rem] items-center gap-3 border-t",
        "border-line bg-paper px-4 transition-transform duration-200 lg:hidden",
        shown ? "translate-y-0" : "translate-y-full"
      )}
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <PriceDisplay
        price={price}
        originalPrice={originalPrice}
        size="line"
        className="min-w-0 flex-1"
      />

      <Button
        variant="primary"
        // Not yet wired: task 94 adds the cart. Disabled is honest — a button
        // that silently does nothing is worse than one that says it cannot.
        disabled={disabled || !onAddToCart}
        onClick={onAddToCart}
        tabIndex={shown ? 0 : -1}
        className="shrink-0"
      >
        Add to cart
      </Button>
    </div>
  )
}

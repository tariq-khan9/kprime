"use client"

import Link from "next/link"
import { useEffect, useRef, useState, type ReactNode } from "react"

import { cn } from "@/lib/utils/format"

export type ScrollRailProps = {
  title: string
  viewAllHref?: string
  /** The rail's items. Each should size itself and carry `shrink-0 snap-start`. */
  children: ReactNode
  /**
   * Selector for the element the arrows vertically centre on, searched within
   * the first item. Defaults to the item itself.
   *
   * ProductCard points this at its image, because a product card is an image
   * plus two or three lines of text — centring on the card puts the arrows
   * noticeably below the image's middle.
   */
  centreOn?: string
  className?: string
}

function Arrow({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden className="size-5">
      <path
        d={direction === "left" ? "M12 4l-6 6 6 6" : "M8 4l6 6-6 6"}
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Gap between items, in px. Must match the `gap-4` below. */
const GAP = 16

/**
 * Horizontal scrolling row with a heading and hover-revealed arrows.
 *
 * Shared by ProductRail and CategoryRail. The behaviour here — bounds
 * detection, resize handling, arrow placement — is fiddly enough that two
 * copies would drift apart within a couple of changes.
 *
 * Native overflow scrolling rather than a JS carousel: touch momentum and
 * rubber-banding come free and cost nothing on a mid-range Android.
 *
 * Children are passed through, so a server component can render the items and
 * only this wrapper ships to the browser.
 */
export function ScrollRail({
  title,
  viewAllHref,
  children,
  centreOn,
  className,
}: ScrollRailProps) {
  const scroller = useRef<HTMLDivElement>(null)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(true)
  /** Vertical centre of the anchor element, in px from the top of the scroller. */
  const [anchorCentre, setAnchorCentre] = useState<number | null>(null)

  /**
   * Which directions are actually available.
   *
   * Without this a rail holding four items in a four-across layout shows two
   * arrows that do nothing. Both start true so no arrow flashes in before the
   * first measurement.
   */
  const measure = () => {
    const el = scroller.current
    if (!el) return

    // 1px tolerance: fractional scroll positions mean scrollLeft rarely lands
    // exactly on the maximum, so a strict comparison never reports the end.
    setAtStart(el.scrollLeft <= 1)
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1)

    const first = el.firstElementChild as HTMLElement | null
    const anchor = centreOn
      ? first?.querySelector<HTMLElement>(centreOn) ?? first
      : first

    if (anchor) {
      // Measured from the rendered element rather than derived from an aspect
      // ratio, so changing a card's shape moves the arrows with it.
      setAnchorCentre(
        anchor.getBoundingClientRect().height / 2 +
          (anchor.offsetTop - el.offsetTop)
      )
    }
  }

  useEffect(() => {
    measure()

    const el = scroller.current
    if (!el) return

    // Item widths are percentages, so a resize changes what fits.
    const observer = new ResizeObserver(measure)
    observer.observe(el)

    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [children])

  const scrollByItem = (direction: -1 | 1) => {
    const el = scroller.current
    if (!el) return

    // One item plus its gap, measured from the real first child rather than a
    // hardcoded number — item width changes at every breakpoint.
    const first = el.firstElementChild as HTMLElement | null
    const step = first ? first.offsetWidth + GAP : el.clientWidth * 0.8

    el.scrollBy({ left: step * direction, behavior: "smooth" })
  }

  return (
    // `group/rail` is named because ProductCard uses a plain `group` for its
    // image zoom — an unnamed group here would make the arrows appear whenever
    // any single card is hovered.
    <section className={cn("group/rail flex flex-col gap-3", className)}>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-bold text-brand sm:text-xl">{title}</h2>

        {viewAllHref && (
          <Link href={viewAllHref} className="text-muted underline hover:text-brand">
            View all
          </Link>
        )}
      </div>

      {/* Positioning context for the arrows: the item row only, so their
          vertical centre is the card's rather than the whole section's. */}
      <div className="relative">
        {/*
          Overlay arrows, revealed on hover.

          Desktop only: on touch they would sit on top of the cards a thumb is
          trying to tap, and swiping is the natural gesture there anyway.

          Each hides when it cannot move that way, so a rail whose contents
          already fit shows nothing at all.
        */}
        {([-1, 1] as const).map((direction) => {
          const disabled = direction === -1 ? atStart : atEnd

          return (
            <button
              key={direction}
              type="button"
              aria-label={direction === -1 ? "Scroll left" : "Scroll right"}
              onClick={() => scrollByItem(direction)}
              tabIndex={disabled ? -1 : undefined}
              aria-hidden={disabled || undefined}
              style={
                anchorCentre !== null ? { top: `${anchorCentre}px` } : undefined
              }
              className={cn(
                "absolute top-1/2 z-10 hidden size-10 -translate-y-1/2 items-center",
                "justify-center rounded-full border border-line bg-paper text-brand shadow-md",
                "transition-opacity duration-200 hover:bg-cream",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                direction === -1 ? "left-0 -ml-1" : "right-0 -mr-1",
                // Hidden until the rail is hovered or an arrow is focused, so
                // keyboard users can still reach them.
                disabled
                  ? "sm:hidden"
                  : "opacity-0 group-hover/rail:opacity-100 focus-visible:opacity-100 sm:flex"
              )}
            >
              <Arrow direction={direction === -1 ? "left" : "right"} />
            </button>
          )
        })}

        <div
          ref={scroller}
          onScroll={measure}
          className={cn(
            "flex snap-x snap-mandatory gap-4 overflow-x-auto",
            // Room for the focus ring, which the scroll container would clip.
            "-mx-1 px-1 pb-2",
            "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          )}
        >
          {children}
        </div>
      </div>
    </section>
  )
}

"use client"

import Image from "next/image"
import { useEffect, useRef } from "react"

import type { ProductImage } from "@/lib/data/products"
import { cn } from "@/lib/utils/format"

export type GalleryThumbnailsProps = {
  images: ProductImage[]
  /** Product title, for building each thumbnail's label. */
  title: string
  selected: number
  onSelect: (index: number) => void
  orientation?: "vertical" | "horizontal"
  className?: string
}

/**
 * Thumbnail strip that drives the main image.
 *
 * Built as a **tablist**, not a row of plain buttons. That buys the keyboard
 * behaviour the task asks for from the platform's own conventions: one tab stop
 * for the whole strip via roving `tabIndex`, arrow keys to move, Home/End to
 * jump. Tabbing through six separate buttons to reach the price would be worse
 * for a keyboard user than tabbing past one control.
 *
 * Selection follows focus (automatic activation). For images that is right —
 * swapping the picture is instant and reversible, so there is no reason to make
 * someone press Enter as well.
 */
export function GalleryThumbnails({
  images,
  title,
  selected,
  onSelect,
  orientation = "vertical",
  className,
}: GalleryThumbnailsProps) {
  const strip = useRef<HTMLDivElement>(null)
  // Only move focus when the change came from a keypress. Without this, the
  // strip would steal focus on first render and on every click.
  const viaKeyboard = useRef(false)

  useEffect(() => {
    if (!viaKeyboard.current) {
      return
    }

    viaKeyboard.current = false
    const tabs = strip.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    tabs?.[selected]?.focus()
  }, [selected])

  // A single image is not a gallery — the strip would be one thumbnail of the
  // picture already on screen.
  if (images.length < 2) {
    return null
  }

  const vertical = orientation === "vertical"

  const move = (next: number) => {
    viaKeyboard.current = true
    // Wraps, so the strip has no dead ends at either extreme.
    onSelect((next + images.length) % images.length)
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    const back = vertical ? "ArrowUp" : "ArrowLeft"
    const forward = vertical ? "ArrowDown" : "ArrowRight"

    if (event.key === back) {
      event.preventDefault()
      move(selected - 1)
    } else if (event.key === forward) {
      event.preventDefault()
      move(selected + 1)
    } else if (event.key === "Home") {
      event.preventDefault()
      move(0)
    } else if (event.key === "End") {
      event.preventDefault()
      move(images.length - 1)
    }
  }

  return (
    <div
      ref={strip}
      role="tablist"
      aria-label="Product images"
      aria-orientation={orientation}
      onKeyDown={onKeyDown}
      className={cn(
        "flex gap-2",
        vertical
          ? "flex-col"
          : // Scrolls rather than wraps: six thumbnails wrapping to a second row
            // would push the buy area down.
            "overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className
      )}
    >
      {images.map((image, i) => {
        const active = i === selected

        return (
          <button
            key={image.id}
            type="button"
            role="tab"
            aria-selected={active}
            // Roving tabindex: the strip is one stop, arrows move within it.
            tabIndex={active ? 0 : -1}
            onClick={() => onSelect(i)}
            className={cn(
              "relative aspect-[3/4] w-16 shrink-0 overflow-hidden rounded-md",
              "border bg-cream transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand",
              // Two signals, not one: colour alone would vanish for anyone who
              // cannot separate navy from the default border.
              active
                ? "border-brand ring-1 ring-brand"
                : "border-line opacity-70 hover:opacity-100"
            )}
          >
            <Image
              src={image.url}
              alt={`${title} — image ${i + 1} of ${images.length}`}
              fill
              sizes="64px"
              className="object-contain"
            />
          </button>
        )
      })}
    </div>
  )
}

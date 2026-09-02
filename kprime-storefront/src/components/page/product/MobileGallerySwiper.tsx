"use client"

import Image from "next/image"
import { useRef, useState } from "react"

import type { ProductImage } from "@/lib/data/products"
import { cn } from "@/lib/utils/format"

export type MobileGallerySwiperProps = {
  images: ProductImage[]
  /** Product title, for alt text. */
  title: string
  priority?: boolean
  className?: string
}

/**
 * Full-width swipeable gallery for phones.
 *
 * **Native scroll snapping, not a carousel library.** A `snap-x mandatory`
 * scroller gives momentum, rubber-banding and accessibility for free, matches
 * what a thumb already expects, and ships no JavaScript to do the swiping. The
 * only script here is the one that keeps the dots in step.
 *
 * **No arrows**, per the task: at 360px they would sit on top of the product,
 * and swiping is the gesture people already use.
 *
 * The index is derived from `scrollLeft` rather than tracked through touch
 * events, so a fling, a drag, a dot tap and a keyboard scroll all report the
 * same position.
 */
export function MobileGallerySwiper({
  images,
  title,
  priority = false,
  className,
}: MobileGallerySwiperProps) {
  const track = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)

  const onScroll = () => {
    const el = track.current

    if (!el) {
      return
    }

    // Round, don't floor: mid-swipe the dot should follow the slide the scroll
    // has mostly settled on rather than lagging a frame behind.
    const next = Math.round(el.scrollLeft / el.clientWidth)

    setIndex((current) => (current === next ? current : next))
  }

  const goTo = (i: number) => {
    const el = track.current
    el?.scrollTo({ left: i * el.clientWidth, behavior: "smooth" })
  }

  if (images.length === 0) {
    return (
      <div
        className={cn(
          "flex aspect-[3/4] w-full items-center justify-center",
          "rounded-md border border-line bg-cream",
          className
        )}
      >
        <span className="text-6xl font-bold text-line">
          {title.charAt(0).toUpperCase()}
        </span>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div
        ref={track}
        onScroll={onScroll}
        role="group"
        aria-roledescription="carousel"
        aria-label={`${title} images`}
        className={cn(
          "flex w-full snap-x snap-mandatory overflow-x-auto",
          "rounded-md border border-line bg-cream",
          "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        )}
      >
        {images.map((image, i) => (
          <div
            key={image.id}
            // Same 3/4 box as the card and the desktop gallery, so the height
            // is reserved before anything loads and nothing shifts.
            className="relative aspect-[3/4] w-full shrink-0 snap-center"
            aria-roledescription="slide"
            aria-label={`Image ${i + 1} of ${images.length}`}
          >
            <Image
              src={image.url}
              alt={i === 0 ? title : `${title} — image ${i + 1}`}
              fill
              priority={priority && i === 0}
              sizes="100vw"
              className="object-contain"
            />
          </div>
        ))}
      </div>

      {images.length > 1 && (
        <div className="flex items-center justify-center gap-2">
          {images.map((image, i) => (
            <button
              key={image.id}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Go to image ${i + 1}`}
              aria-current={i === index}
              // 44px tap target around a small visual dot: the dot itself is
              // 8px, which no thumb can hit reliably.
              className="flex size-11 items-center justify-center focus-visible:outline-none"
            >
              <span
                className={cn(
                  "block size-2 rounded-full transition-colors",
                  i === index ? "bg-brand" : "bg-line"
                )}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

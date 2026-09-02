"use client"

import Image from "next/image"
import { useRef, useState } from "react"

import { GalleryThumbnails } from "@/components/page/product/GalleryThumbnails"
import type { ProductImage } from "@/lib/data/products"
import { cn } from "@/lib/utils/format"

/** How far the image grows under the cursor. Enough to read fine print. */
const ZOOM = 2.2

export type ProductGalleryProps = {
  images: ProductImage[]
  /** Product title, used for alt text. */
  title: string
  priority?: boolean
  className?: string
}

/**
 * Main product image with hover zoom.
 *
 * **Fixed `aspect-[3/4]`, matched to `ProductCard`.** Two reasons. The box is
 * reserved before the image loads, so there is no layout shift; and a shopper
 * arriving from a listing sees the same shape they clicked, rather than the
 * page reflowing around a taller or wider photo.
 *
 * **`object-contain` on cream, not `object-cover`.** The card crops to fill
 * because a grid needs even tiles, but cropping the detail page hides part of
 * what someone is deciding to buy. Contain letterboxes instead: a 1600×900
 * landscape and a 900×1200 portrait both render whole and undistorted, and the
 * cream backdrop makes the letterboxing look deliberate rather than broken.
 *
 * Zoom follows the cursor by moving `transform-origin` to wherever the pointer
 * is, so the magnified area is the part being pointed at. Desktop only — task
 * 84's swiper handles mobile, and this is rendered behind `hidden lg:block` in
 * the page assembly.
 *
 * Owns which image is showing, and renders the thumbnail strip beside it — the
 * "desktop pair" task 91 places. The state lives here rather than in the page
 * so the page can stay a server component.
 */
export function ProductGallery({
  images,
  title,
  priority = false,
  className,
}: ProductGalleryProps) {
  const [index, setIndex] = useState(0)
  const [zoomed, setZoomed] = useState(false)
  // Percentages, not pixels: they feed transform-origin directly and survive a
  // resize without recalculation.
  const [origin, setOrigin] = useState({ x: 50, y: 50 })

  const frame = useRef<HTMLDivElement>(null)

  const current = images[index] ?? images[0] ?? null

  const onMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const box = frame.current?.getBoundingClientRect()

    if (!box) {
      return
    }

    setOrigin({
      x: ((event.clientX - box.left) / box.width) * 100,
      y: ((event.clientY - box.top) / box.height) * 100,
    })
  }

  return (
    <div className={cn("flex gap-3", className)}>
      <GalleryThumbnails
        images={images}
        title={title}
        selected={index}
        onSelect={setIndex}
      />

      <div
        ref={frame}
        // `group` so the zoom hint can react to hover without more state.
        className={cn(
          "group relative aspect-[3/4] min-w-0 flex-1 overflow-hidden",
          "rounded-md border border-line bg-cream"
        )}
        onMouseEnter={() => current && setZoomed(true)}
        onMouseLeave={() => setZoomed(false)}
        onMouseMove={onMove}
      >
        {current ? (
          <Image
            key={current.id}
            src={current.url}
            alt={title}
            fill
            // Only the first image is an LCP candidate; the rest are swapped in
            // after an interaction and must not compete with it for bandwidth.
            priority={priority && index === 0}
            // One column on mobile, roughly half the container on desktop.
            sizes="(max-width: 1024px) 100vw, 50vw"
            className={cn(
              "object-contain transition-transform duration-200 ease-out",
              zoomed && "cursor-zoom-in"
            )}
            style={{
              transform: zoomed ? `scale(${ZOOM})` : undefined,
              transformOrigin: `${origin.x}% ${origin.y}%`,
            }}
          />
        ) : (
          // Every product was in this state before task 10's photography, so it
          // has to look deliberate rather than broken. Same as the card.
          <div className="flex size-full items-center justify-center">
            <span className="text-6xl font-bold text-line">
              {title.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

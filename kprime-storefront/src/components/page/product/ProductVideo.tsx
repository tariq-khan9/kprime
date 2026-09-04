"use client"

import Image from "next/image"
import { useState } from "react"

import { cn } from "@/lib/utils/format"
import { youtubeEmbedUrl, youtubePosterUrl } from "@/lib/utils/youtube"

/**
 * Optional YouTube video, between the gallery and the tabs.
 *
 * **A facade, not an iframe.** A YouTube embed pulls roughly a megabyte of
 * player JavaScript and sets cookies the moment it mounts, on every product
 * page view, whether or not anyone watches. On a shop whose traffic is mostly
 * mobile data that is the single most expensive thing on the page. So the rest
 * state is one poster image and a play button; the real iframe is mounted on
 * click, already autoplaying, which costs the viewer one extra tap and everyone
 * else nothing.
 *
 * 16:9, not the gallery's 3:4 — letterboxing a landscape video into a portrait
 * frame wastes half the width it needs.
 *
 * Renders nothing without a video. The caller checks too, so this is the second
 * of two guards, not the only one.
 */
export function ProductVideo({
  videoId,
  title,
  className,
}: {
  videoId: string | null
  title: string
  className?: string
}) {
  const [playing, setPlaying] = useState(false)

  if (!videoId) {
    return null
  }

  return (
    <section className={cn(className)} aria-labelledby="product-video-heading">
      <h2 id="product-video-heading" className="text-xl font-bold sm:text-2xl">
        Product video
      </h2>

      {/* Capped, not full-width. 16:9 across the whole container works out to
          1214x683 on a desktop — 89% of a 768px laptop screen, so the video
          alone fills the viewport and dwarfs the gallery, which is deliberately
          only 2/5 wide. 48rem keeps it a component of the page rather than the
          whole of it, and below that breakpoint it is full-bleed as before. */}
      <div className="mt-4 max-w-3xl overflow-hidden rounded-lg border border-line bg-brand">
        <div className="relative aspect-video w-full">
          {playing ? (
            <iframe
              src={youtubeEmbedUrl(videoId)}
              title={`${title} — product video`}
              // `presentation-when-fullscreen` is deliberately absent: this is
              // a product demo, not something to autoplay picture-in-picture.
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
              className="absolute inset-0 size-full"
            />
          ) : (
            <button
              type="button"
              onClick={() => setPlaying(true)}
              aria-label={`Play the ${title} product video`}
              className="group absolute inset-0 size-full cursor-pointer"
            >
              <Image
                src={youtubePosterUrl(videoId)}
                alt=""
                fill
                // Never the LCP element — it sits below the fold on every
                // breakpoint, under the gallery and the buy panel.
                loading="lazy"
                sizes="(min-width: 768px) 48rem, 100vw"
                className="object-cover"
              />

              {/* Navy, not amber. Amber means "buy this" and nothing else; a
                  second amber control on the page would compete with Add to
                  cart for the one meaning it is allowed to carry. */}
              <span className="absolute inset-0 grid place-items-center">
                <span className="grid size-16 place-items-center rounded-full bg-brand/80 ring-2 ring-cream/70 transition group-hover:bg-brand-light group-focus-visible:bg-brand-light">
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="ml-1 size-7 fill-cream"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
              </span>
            </button>
          )}
        </div>
      </div>
    </section>
  )
}

"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/Button"
import { HERO_SLIDES, type HeroSlide } from "@/config/site"
import { cn } from "@/lib/utils/format"

const ADVANCE_MS = 7000
/** How long after the last scroll event the position is treated as settled. */
const SETTLE_MS = 150
/** How long a tap or click holds the carousel still before it resumes. */
const RESUME_MS = 10000

const COUNT = HERO_SLIDES.length

/**
 * Full-bleed slides that loop forward forever.
 *
 * The slides are rendered TWICE and the carousel only ever scrolls right. When
 * the position settles inside the second set, scrollLeft is reduced by one set
 * width instantly — landing on a visually identical slide, so the eye sees
 * uninterrupted forward motion.
 *
 * The naive approach, scrollTo({ left: 0, behavior: "smooth" }) after the last
 * slide, rewinds visibly through every slide backwards. That is what this
 * replaces.
 *
 * Native scroll container rather than a transform track on purpose: touch
 * momentum and rubber-banding come free, and a transform slider would mean
 * hand-writing drag handling to get them back.
 */
export function HeroCarousel({ className }: { className?: string }) {
  const scroller = useRef<HTMLDivElement>(null)
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [index, setIndex] = useState(0)

  // Two independent reasons to hold still, tracked separately.
  //
  // Hover pauses for exactly as long as the pointer is over the carousel.
  // Touching or clicking pauses for a fixed window instead — on a phone there
  // is no mouseleave, so a single tap would otherwise stop the carousel
  // permanently for the rest of the visit.
  const [hovering, setHovering] = useState(false)
  const [interacted, setInteracted] = useState(false)
  const paused = hovering || interacted

  /** One slide forward. The wrap is handled on settle, not here. */
  const advance = () => {
    const el = scroller.current
    if (!el) return
    el.scrollBy({ left: el.clientWidth, behavior: "smooth" })
  }

  const noteInteraction = () => {
    setInteracted(true)

    if (resumeTimer.current) {
      clearTimeout(resumeTimer.current)
    }

    resumeTimer.current = setTimeout(() => setInteracted(false), RESUME_MS)
  }

  /**
   * Clicking or tapping the slide advances it.
   *
   * Clicks that land on the CTA — or any link or button added later — are left
   * alone, or the slide would move out from under the thing being tapped and
   * the button would still navigate.
   */
  const onSlideClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("a, button")) {
      return
    }

    noteInteraction()
    advance()
  }

  useEffect(() => {
    if (paused || COUNT < 2) {
      return
    }

    const timer = setInterval(advance, ADVANCE_MS)

    return () => clearInterval(timer)
  }, [paused])

  const onScroll = () => {
    const el = scroller.current
    if (!el) return

    // Dot state tracks the real scroll position, so swiping and auto-advance
    // never disagree about which slide is showing.
    setIndex(Math.round(el.scrollLeft / el.clientWidth) % COUNT)

    if (settleTimer.current) {
      clearTimeout(settleTimer.current)
    }

    // Debounced rather than the `scrollend` event, which Safari only gained
    // recently. Repositioning mid-scroll would fight the smooth animation.
    settleTimer.current = setTimeout(() => {
      const setWidth = el.clientWidth * COUNT

      if (el.scrollLeft >= setWidth) {
        // Instant, and onto an identical-looking slide — invisible to the eye.
        el.scrollTo({ left: el.scrollLeft - setWidth, behavior: "auto" })
      }
    }, SETTLE_MS)
  }

  useEffect(() => {
    return () => {
      if (settleTimer.current) clearTimeout(settleTimer.current)
      if (resumeTimer.current) clearTimeout(resumeTimer.current)
    }
  }, [])

  // A dot is a deliberate jump, not part of the loop, so it targets the first
  // set absolutely rather than scrolling by a delta.
  const goTo = (i: number) => {
    const el = scroller.current
    if (!el) return
    noteInteraction()
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" })
  }

  // Duplicated for the loop. The clones are aria-hidden so a screen reader
  // does not announce every slide a second time.
  const slides: { slide: HeroSlide; clone: boolean }[] = [
    ...HERO_SLIDES.map((slide) => ({ slide, clone: false })),
    ...HERO_SLIDES.map((slide) => ({ slide, clone: true })),
  ]

  return (
    <section
      aria-label="Featured"
      aria-roledescription="carousel"
      className={cn("relative w-full", className)}
      onPointerDown={noteInteraction}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div
        ref={scroller}
        onScroll={onScroll}
        className={cn(
          "flex snap-x snap-mandatory overflow-x-auto",
          "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        )}
      >
        {slides.map(({ slide, clone }, i) => (
          <div
            key={`${slide.heading}-${clone ? "clone" : "real"}`}
            role="group"
            aria-roledescription="slide"
            aria-label={`${(i % COUNT) + 1} of ${COUNT}`}
            aria-hidden={clone || undefined}
            className="w-full shrink-0 snap-start"
          >
            {/* Just over three quarters of the viewport, capped — on a tall
                desktop monitor 78vh is 800px+ of gradient around one heading. */}
            <div
              onClick={onSlideClick}
              className={cn(
                "flex min-h-[78vh] max-h-[46rem] cursor-pointer items-center bg-gradient-to-br",
                slide.gradient
              )}
            >
              <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
                <div className="max-w-lg">
                  <h2 className="text-2xl font-bold text-cream sm:text-3xl lg:text-4xl">
                    {slide.heading}
                  </h2>
                  <p className="mt-2 text-cream/80 sm:text-lg">
                    {slide.subheading}
                  </p>
                  <Button asChild className="mt-6">
                    <Link href={slide.ctaHref} tabIndex={clone ? -1 : undefined}>
                      {slide.ctaLabel}
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {COUNT > 1 && (
        <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2">
          {HERO_SLIDES.map((slide, i) => (
            <button
              key={slide.heading}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === index}
              // 44px hit area around an 8px dot — the dot is what you see, the
              // padding is what a thumb needs.
              className="flex size-11 items-center justify-center"
            >
              <span
                className={cn(
                  "block size-2 rounded-full transition-all duration-300",
                  i === index ? "w-6 bg-cream" : "bg-cream/50"
                )}
              />
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

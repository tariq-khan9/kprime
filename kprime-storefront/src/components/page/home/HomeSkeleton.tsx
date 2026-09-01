import { Container } from "@/components/layout/Container"
import { ProductCardSkeleton } from "@/components/shared/ProductCard"
import { Skeleton } from "@/components/ui/Skeleton"

/**
 * Mirrors the home page's stack at the same dimensions.
 *
 * Every block below matches a real section's height and breakpoint behaviour,
 * so the swap to real content moves nothing. A skeleton that is roughly the
 * right shape causes the layout shift it was added to prevent.
 */

function RailSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-6 w-40" />
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 6 }, (_, i) => (
          // Same fractional widths as ProductRail.
          <div key={i} className="w-[40%] shrink-0 sm:w-[28%] lg:w-[23%]">
            <ProductCardSkeleton />
          </div>
        ))}
      </div>
    </div>
  )
}

export function HomeSkeleton() {
  return (
    <div className="flex flex-col gap-10 pb-10">
      {/* Hero — matches HeroCarousel's min-heights exactly. */}
      <Skeleton className="min-h-[78vh] max-h-[46rem] w-full rounded-none" />

      <Container>
        <Skeleton className="mb-4 h-6 w-48" />
        {/* Mirrors CategoryRail: a scrolling row, three visible from md, same
            3:2 landscape tiles. */}
        <div className="flex gap-3 overflow-hidden md:gap-4">
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              className="w-[45%] shrink-0 sm:w-[30%] md:w-[calc((100%-2rem)/3)]"
            >
              <Skeleton className="aspect-[3/2] w-full" />
            </div>
          ))}
        </div>
      </Container>

      <Container>
        <RailSkeleton />
      </Container>

      <Container>
        <RailSkeleton />
      </Container>

      <Container>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
          <Skeleton className="aspect-[2/1] w-full sm:aspect-[5/2]" />
          <Skeleton className="aspect-[2/1] w-full sm:aspect-[5/2]" />
        </div>
      </Container>

      <Container>
        <Skeleton className="mb-4 h-6 w-40" />
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-11 w-28" />
          ))}
        </div>
      </Container>

      <Container>
        <Skeleton className="h-40 w-full rounded-lg" />
      </Container>
    </div>
  )
}

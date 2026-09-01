import { HomeSkeleton } from "@/components/page/home/HomeSkeleton"

/**
 * Streams while the home page's data resolves.
 *
 * Applies to the whole `(shop)` segment, so a slow category page gets it too —
 * imperfect, but a skeleton at roughly the right shape beats a blank screen on
 * a 3G connection. Task 74 adds a dedicated one for category routes.
 */
export default function Loading() {
  return <HomeSkeleton />
}

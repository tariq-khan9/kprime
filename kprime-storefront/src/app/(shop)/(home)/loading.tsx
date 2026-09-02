import { HomeSkeleton } from "@/components/page/home/HomeSkeleton"

/**
 * Streams while the home page's data resolves.
 *
 * Scoped to the home route by the `(home)` route group, which adds no URL
 * segment. It must NOT sit at `(shop)` level: a Suspense boundary there makes
 * every route stream, so `notFound()` on a bad category handle could never set
 * a 404 status — a soft 404 on every unknown URL. Task 74 adds a category one.
 */
export default function Loading() {
  return <HomeSkeleton />
}

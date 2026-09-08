import { createHash, timingSafeEqual } from "node:crypto"

import { revalidateTag } from "next/cache"
import { NextResponse } from "next/server"

/**
 * On-demand cache invalidation, called by the Medusa backend.
 *
 * The catalogue is cached with `unstable_cache` and product pages are static
 * with an hourly revalidate. Without this endpoint a price changed in admin can
 * take up to an hour to appear, which on a live shop is indistinguishable from
 * the edit not having saved.
 *
 * Best-effort by design. The backend never fails an admin save because this
 * call failed — see `lib/revalidate-storefront.ts` there.
 */

/**
 * Allow-list, kept in step with the `tags` passed to `unstable_cache` in
 * `lib/data/`. An unknown tag is rejected rather than ignored: a typo'd tag
 * name is exactly the silent failure this endpoint exists to remove, and a
 * no-op would look like success forever.
 */
const KNOWN_TAGS = new Set([
  "products",
  "categories",
  "collections",
  "regions",
  "reviews",
  "shipping-cities",
])

/**
 * Compared through SHA-256 digests rather than the raw strings.
 *
 * `timingSafeEqual` throws on a length mismatch, so a naive guard would have to
 * compare lengths first and leak the secret's length through the response. Two
 * digests are always 32 bytes, so the comparison is constant-time for any
 * input.
 */
function secretMatches(given: string, expected: string): boolean {
  const a = createHash("sha256").update(given).digest()
  const b = createHash("sha256").update(expected).digest()

  return timingSafeEqual(a, b)
}

export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET

  // Honest 503 rather than a cheerful 200, matching /api/newsletter. A silent
  // success here would mean stale pages that nobody ever traces back to a
  // missing variable.
  if (!secret) {
    return NextResponse.json(
      {
        configured: false,
        error: "Revalidation is not configured. Set REVALIDATE_SECRET.",
      },
      { status: 503 }
    )
  }

  const given = request.headers.get("x-revalidate-secret")

  if (!given || !secretMatches(given, secret)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  let tags: unknown

  try {
    ;({ tags } = await request.json())
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  }

  if (!Array.isArray(tags) || !tags.length) {
    return NextResponse.json(
      { error: "Body must be { tags: string[] } with at least one tag." },
      { status: 400 }
    )
  }

  const unknown = tags.filter((tag) => !KNOWN_TAGS.has(tag as string))

  if (unknown.length) {
    return NextResponse.json(
      {
        error: `Unknown tag(s): ${unknown.join(", ")}. Known tags: ${[
          ...KNOWN_TAGS,
        ].join(", ")}.`,
      },
      { status: 400 }
    )
  }

  // Next 16 requires a cache-life profile as the second argument. "max" expires
  // the entry outright, which is what a content change means here.
  for (const tag of tags as string[]) {
    revalidateTag(tag, "max")
  }

  return NextResponse.json({ revalidated: tags, now: Date.now() })
}

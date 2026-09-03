import { NextResponse, type NextRequest } from "next/server"

/**
 * Blocks the diagnostic pages outside development.
 *
 * Named `proxy`, not `middleware`: Next 16 deprecated the middleware file
 * convention, and the old name logs a warning on every build.
 *
 * `/dev/*` renders payload sizes, the raw category tree, cache behaviour and a
 * component styleguide. None of it is secret, but all of it is a map of how the
 * shop is built and none of it is for customers — so in production it does not
 * exist at all.
 *
 * **Rewritten to a 404, not redirected.** A redirect confirms the route exists;
 * a 404 is indistinguishable from a path that was never there.
 *
 * The check is on NODE_ENV rather than a feature flag on purpose: a flag can be
 * left on by accident, and the one thing this must not do is depend on someone
 * remembering.
 */
export default function proxy(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.rewrite(new URL("/not-found", request.url), {
      status: 404,
    })
  }

  return NextResponse.next()
}

export const config = {
  // Scoped so the middleware runs on nothing else. Every other request skips it
  // entirely rather than paying for a check it can never fail.
  matcher: "/dev/:path*",
}

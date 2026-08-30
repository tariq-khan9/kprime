import {
  defineMiddlewares,
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";

/**
 * Rate limits for the two unauthenticated endpoints that take an email address.
 *
 * Order numbers are sequential and both routes confirm whether an email matches
 * one. Unthrottled, that is an offline oracle: walk the numbers, guess emails,
 * and learn who bought what. A limit does not make the design secret-free — the
 * email is still the only gate — but it turns an automated sweep into something
 * slow enough to notice.
 *
 * Counted in the cache module, which this project already registers against
 * Redis, so the limit is shared across backend containers rather than being
 * per-process.
 */

const WINDOW_SECONDS = 15 * 60;

/**
 * Off outside production.
 *
 * These limits exist for the public internet. In development they only get in
 * the way: `npm run verify` alone makes seven review submissions per run, so two
 * runs inside the window would start failing on the limit rather than on
 * anything real. Set RATE_LIMIT=on to exercise them locally.
 */
const ENABLED =
  process.env.NODE_ENV === "production" || process.env.RATE_LIMIT === "on";

/**
 * The caller's address.
 *
 * `x-forwarded-for` is only trustworthy because Caddy is the sole public
 * listener in docker-compose.prod.yml and it sets the header itself. If the
 * backend is ever exposed directly, this becomes spoofable and the limit
 * becomes decorative.
 */
const clientKey = (req: MedusaRequest) => {
  const forwarded = req.headers["x-forwarded-for"];
  const first = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return (first?.split(",")[0] ?? req.ip ?? "unknown").trim();
};

const rateLimit = (name: string, limit: number) => {
  return async (
    req: MedusaRequest,
    res: MedusaResponse,
    next: MedusaNextFunction
  ) => {
    if (!ENABLED) {
      return next();
    }

    const cache: any = req.scope.resolve(Modules.CACHE);
    const key = `ratelimit:${name}:${clientKey(req)}`;

    try {
      // `cache` is resolved as `any`, so the generic form of `get` is not
      // available here — cast the result instead.
      const used = ((await cache.get(key)) as number | null) ?? 0;

      if (used >= limit) {
        res.setHeader("Retry-After", String(WINDOW_SECONDS));
        return res.status(429).json({
          message:
            "Too many attempts. Please wait a few minutes and try again.",
        });
      }

      // Re-setting the TTL on every request means the window slides: someone
      // hammering the endpoint stays blocked until they stop for the full
      // window, rather than getting a fresh allowance on a fixed boundary.
      //
      // Read-then-write is not atomic, so a burst of simultaneous requests can
      // slip a few past the limit. That is acceptable here — this exists to make
      // enumeration slow, not to enforce an exact quota.
      await cache.set(key, used + 1, WINDOW_SECONDS);
    } catch {
      // A cache outage must not take the storefront's order lookup down with
      // it. Failing open loses the limit; failing closed loses the sale.
    }

    next();
  };
};

export default defineMiddlewares({
  routes: [
    {
      matcher: "/store/order-lookup",
      method: "POST",
      middlewares: [rateLimit("order-lookup", 20)],
    },
    {
      // Lower, because a review is a deliberate act — nobody legitimately
      // submits ten in a quarter of an hour.
      matcher: "/store/reviews",
      method: "POST",
      middlewares: [rateLimit("review-submit", 10)],
    },
  ],
});

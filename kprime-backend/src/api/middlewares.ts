import {
  defineMiddlewares,
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils";

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

/**
 * A product cannot be created without at least one category.
 *
 * The admin form labels Categories "(Optional)" and offers no way to change
 * that, so the rule lives here: the request is refused and the admin shows the
 * message as an error toast.
 *
 * Covers the admin create form only. CSV import and `medusa exec` scripts
 * create products through workflows without this route, so they are not checked.
 */
const requireCategory = (
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) => {
  const categories = (req.body as { categories?: unknown } | undefined)
    ?.categories;

  if (!Array.isArray(categories) || !categories.length) {
    return res.status(400).json({
      type: "invalid_data",
      message: "Choose at least one category before saving this product.",
    });
  }

  next();
};

/**
 * A product cannot be published unless every variant has a PKR price.
 *
 * Medusa treats prices as optional, but on a PKR-only store an unpriced
 * product lists with no price and then fails at add-to-cart. Drafts are left
 * alone so a product can be created first and priced later.
 *
 * The admin drops empty price cells before sending, so an unpriced variant
 * arrives as `prices: []`. The PKR column and the Pakistan region column both
 * send `currency_code: "pkr"`, so either one counts.
 *
 * Same caveat as `requireCategory`: CSV import and scripts are not checked.
 */
const PRICE_MESSAGE =
  "Enter a PKR price for every variant before publishing, or save as draft.";

type PriceLike = { currency_code?: string | null; amount?: unknown } | null;

const hasPkrPrice = (prices: PriceLike[] | null | undefined) =>
  (prices ?? []).some(
    (price) =>
      price?.currency_code?.toLowerCase() === "pkr" &&
      Number(price.amount) > 0
  );

const refusePrice = (res: MedusaResponse) =>
  res.status(400).json({ type: "invalid_data", message: PRICE_MESSAGE });

const requirePriceToPublish = (
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) => {
  const body = req.body as
    | { status?: string; variants?: { prices?: PriceLike[] }[] }
    | undefined;

  if (body?.status !== "published") {
    return next();
  }

  const variants = body.variants ?? [];

  if (!variants.length || !variants.every((v) => hasPkrPrice(v.prices))) {
    return refusePrice(res);
  }

  next();
};

/**
 * The same rule for a draft published later from the Edit form. That request
 * carries only the status, so the saved prices are read back.
 *
 * Only the draft-to-published step is checked. A product that is already
 * published keeps saving normally, so fixing a typo in its title is never
 * blocked by this.
 */
const requirePriceOnPublish = async (
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) => {
  if ((req.body as { status?: string } | undefined)?.status !== "published") {
    return next();
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  const {
    data: [product],
  } = await query.graph({
    entity: "product",
    fields: [
      "status",
      "variants.id",
      "variants.prices.amount",
      "variants.prices.currency_code",
    ],
    filters: { id: req.params.id },
  });

  // An unknown id is the route's own 404 to give, not this check's.
  if (!product || product.status === "published") {
    return next();
  }

  // `prices` comes through the variant–price-set link, which the generated
  // entity types do not include.
  const variants = (product.variants ?? []) as { prices?: PriceLike[] }[];

  if (!variants.length || !variants.every((v) => hasPkrPrice(v?.prices))) {
    return refusePrice(res);
  }

  next();
};

export default defineMiddlewares({
  routes: [
    {
      matcher: "/admin/products",
      method: "POST",
      middlewares: [requireCategory, requirePriceToPublish],
    },
    {
      matcher: "/admin/products/:id",
      method: "POST",
      middlewares: [requirePriceOnPublish],
    },
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
    // Without these a custom admin route is open to every role. See
    // src/policies/review.ts.
    {
      matcher: "/admin/reviews*",
      method: "GET",
      policies: [{ resource: "review", operation: "read" }],
    },
    {
      matcher: "/admin/reviews/:id",
      method: "POST",
      policies: [{ resource: "review", operation: "update" }],
    },
    {
      matcher: "/admin/reviews/:id",
      method: "DELETE",
      policies: [{ resource: "review", operation: "delete" }],
    },
  ],
});

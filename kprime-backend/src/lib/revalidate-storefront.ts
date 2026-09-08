/**
 * Tells the storefront to drop cached data after an admin edit.
 *
 * The storefront caches the catalogue with `unstable_cache` and prerenders
 * product pages with an hourly revalidate, so without this a price or stock
 * change is invisible for up to an hour.
 *
 * Three properties, all deliberate:
 *
 *   - **Never throws.** By the time a subscriber runs, the edit is committed.
 *     A failed cache hint must not surface as a failed save — the worst case is
 *     that the hourly timer catches up, which is exactly today's behaviour.
 *   - **No-ops when unconfigured.** A fresh clone, the test suite and CI have
 *     no storefront to call.
 *   - **Coalesces bursts.** A catalogue re-seed fires one event per product;
 *     389 products would otherwise be 389 HTTP round trips for what one request
 *     accomplishes.
 */

/** Must match KNOWN_TAGS in the storefront's app/api/revalidate/route.ts. */
export type RevalidateTag =
  | "products"
  | "categories"
  | "collections"
  | "regions"
  | "reviews"
  | "shipping-cities";

type Logger = {
  info: (message: string) => void;
  warn?: (message: string) => void;
  error: (message: string) => void;
};

/**
 * How long tags accumulate before one request is sent.
 *
 * A leading-edge window, not a debounce: the first call schedules the flush and
 * later calls only add to it. A debounce would reset on every event and, during
 * a long import, never flush at all — bounded staleness beats none.
 */
const WINDOW_MS = 2000;

/** The storefront is not expected to be slow; a hung one must not pile up. */
const TIMEOUT_MS = 5000;

const pending = new Set<RevalidateTag>();
let timer: NodeJS.Timeout | null = null;
let pendingLogger: Logger = console;

async function flush(): Promise<void> {
  timer = null;

  const tags = [...pending];
  pending.clear();

  if (!tags.length) {
    return;
  }

  // The internal URL wins where it exists (Docker): the public host would send
  // this call out of the box and back in through nginx for no reason, and that
  // hairpin is not reliable on every VPS. Falls back to the public URL, which
  // is what a bare-metal or local setup has.
  const base =
    process.env.STOREFRONT_INTERNAL_URL || process.env.STOREFRONT_URL;
  const secret = process.env.REVALIDATE_SECRET;
  const logger = pendingLogger;

  // Checked at flush rather than at call time so the no-op is logged once per
  // window instead of once per event.
  if (!base || !secret) {
    return;
  }

  try {
    const response = await fetch(
      `${base.replace(/\/$/, "")}/api/revalidate`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-revalidate-secret": secret,
        },
        body: JSON.stringify({ tags }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      }
    );

    if (!response.ok) {
      const body = await response.text().catch(() => "");

      logger.error(
        `[revalidate] storefront returned ${response.status} for ` +
          `${tags.join(", ")}. ${body.slice(0, 200)}`
      );

      return;
    }

    logger.info(`[revalidate] storefront cleared: ${tags.join(", ")}`);
  } catch (error) {
    // A storefront that is down or restarting is the common case here, and it
    // is not an admin's problem. The hourly revalidate remains the backstop.
    const message = error instanceof Error ? error.message : String(error);

    logger.error(
      `[revalidate] could not reach the storefront (${tags.join(", ")}): ${message}`
    );
  }
}

/**
 * Queues one or more tags for invalidation. Returns immediately — the request
 * happens after the coalescing window, off the caller's path.
 */
export function revalidateStorefront(
  tags: RevalidateTag[],
  logger: Logger = console
): void {
  const configured =
    (process.env.STOREFRONT_INTERNAL_URL || process.env.STOREFRONT_URL) &&
    process.env.REVALIDATE_SECRET;

  if (!configured) {
    return;
  }

  for (const tag of tags) {
    pending.add(tag);
  }

  pendingLogger = logger;

  if (timer) {
    return;
  }

  timer = setTimeout(() => {
    void flush();
  }, WINDOW_MS);

  // A pending cache hint must not keep the process alive on shutdown.
  timer.unref?.();
}

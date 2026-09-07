/**
 * The customer-facing order number: `KP-26-148`.
 *
 * Mirrors `lib/utils/order-number.ts` in the storefront — the two repos do not
 * share code (they run different React majors), so this is duplicated the same
 * way `normalizePhone` is. **Keep the two in step.**
 *
 * `148` is Medusa's `display_id` and remains the source of truth: it is an
 * indexed integer, and /track, /store/reviews and /store/order-lookup all still
 * filter on it. The prefix and year are presentation only, with no per-year
 * reset — see the storefront copy for why.
 */
export const ORDER_PREFIX = "KP";

/** The year is the ORDER's, not today's — see the storefront copy. */
export function formatOrderNumber(
  displayId: number | string | null | undefined,
  createdAt: string | Date | null | undefined
): string {
  if (displayId === null || displayId === undefined || displayId === "") {
    return "—";
  }

  const date = createdAt ? new Date(createdAt) : null;

  if (!date || Number.isNaN(date.getTime())) {
    return `${ORDER_PREFIX}-${displayId}`;
  }

  const yy = String(date.getFullYear() % 100).padStart(2, "0");

  return `${ORDER_PREFIX}-${yy}-${displayId}`;
}

/**
 * Accepts `148`, `#148`, `KP-26-148`, `kp 26 148`, `26-148`.
 *
 * The year is parsed off and discarded rather than validated: the phone is what
 * proves ownership, so checking the year would only add a way to fail.
 */
export function parseOrderNumber(raw: unknown): number | null {
  if (typeof raw !== "string") {
    return typeof raw === "number" && Number.isInteger(raw) && raw > 0
      ? raw
      : null;
  }

  const cleaned = raw
    .trim()
    .toUpperCase()
    .replace(/^#/, "")
    .replace(/^KP/, "")
    .replace(/[\s\-_/]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const withYear = /^(\d{2})-(\d+)$/.exec(cleaned);

  if (withYear) {
    const id = Number(withYear[2]);
    return Number.isInteger(id) && id > 0 ? id : null;
  }

  if (/^\d+$/.test(cleaned)) {
    const id = Number(cleaned);
    return Number.isInteger(id) && id > 0 ? id : null;
  }

  return null;
}

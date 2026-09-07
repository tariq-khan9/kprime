/**
 * The customer-facing order number: `KP-26-148`.
 *
 * `148` is Medusa's `display_id` and stays the source of truth — it is an
 * indexed integer column, and every lookup still filters on it. The prefix and
 * year are presentation only.
 *
 * **The year comes from the order's own creation date, never from today.**
 * An order placed in December 2026 has to still read `KP-26-148` when someone
 * types it off a screenshot the following March. Deriving it from the current
 * year would silently rewrite every old order's number on 1 January.
 *
 * Deliberately NOT a per-year reset. Medusa's counter cannot be reset, so a
 * real reset would mean our own number in JSONB metadata, an unindexed lookup
 * on all three routes that resolve orders, and a compound uniqueness rule —
 * and afterwards "order 148" would be ambiguous without the year attached.
 * The number stays globally unique; the year is there to read at a glance.
 */
export const ORDER_PREFIX = "KP"

export function formatOrderNumber(
  displayId: number,
  createdAt: string | Date | null | undefined
): string {
  const date = createdAt ? new Date(createdAt) : null

  // Degrades to the bare number rather than guessing a year. `parseOrderNumber`
  // accepts that form too, so a receipt printed this way still works.
  if (!date || Number.isNaN(date.getTime())) {
    return `${ORDER_PREFIX}-${displayId}`
  }

  const yy = String(date.getFullYear() % 100).padStart(2, "0")

  return `${ORDER_PREFIX}-${yy}-${displayId}`
}

/**
 * Every shape a customer might type back, mapped to the integer we look up.
 *
 * Tolerant on purpose: the number is copied off screenshots, read down the
 * phone and pasted out of emails, and a shopper who is told "we can't find that
 * order" because they included the prefix we printed has been failed by us.
 * Accepts `148`, `#148`, `KP-26-148`, `kp 26 148`, `26-148`.
 *
 * **The year is parsed off and discarded, never checked.** Validating it would
 * add a way to fail with no security gained — the phone number is what actually
 * proves ownership, and a customer who mistypes the year should still find
 * their order.
 */
export function parseOrderNumber(raw: unknown): number | null {
  if (typeof raw !== "string") {
    return typeof raw === "number" && Number.isInteger(raw) && raw > 0
      ? raw
      : null
  }

  const cleaned = raw
    .trim()
    .toUpperCase()
    .replace(/^#/, "")
    .replace(/^KP/, "")
    .replace(/[\s\-_/]+/g, "-")
    .replace(/^-+|-+$/g, "")

  // `26-148` — a two-digit year in front of the id.
  const withYear = /^(\d{2})-(\d+)$/.exec(cleaned)

  if (withYear) {
    const id = Number(withYear[2])
    return Number.isInteger(id) && id > 0 ? id : null
  }

  if (/^\d+$/.test(cleaned)) {
    const id = Number(cleaned)
    return Number.isInteger(id) && id > 0 ? id : null
  }

  return null
}

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

/**
 * Guest order tracking, by order number AND phone.
 *
 * ⚠️ **There is deliberately no code path that accepts a phone alone (§2.2).**
 * Pakistani mobile numbers are an enumerable space — `03XX` plus seven digits —
 * so a phone-only lookup would hand a stranger's name, address and purchase
 * history to anyone who has their number in their contacts. The order number is
 * required as the second factor.
 *
 * The reverse is equally true: display ids are sequential, so the number alone
 * is trivially guessable. Neither field is optional, and neither is sufficient.
 *
 * Three further rules, all of which exist to stop this becoming an oracle:
 *
 * - A wrong number, a wrong phone, and a non-existent order all return the
 *   identical 404 body. Nothing here reveals which order numbers exist.
 * - Rate limited per IP, because sequential numbers plus unlimited guesses is
 *   an offline enumeration attack against phone numbers.
 * - Only fields the buyer already saw on their own confirmation page come back.
 *   No internal ids, no customer record, no payment details.
 *
 * Phone normalisation is duplicated from the storefront's `lib/identity/phone.ts`
 * rather than imported — the two run in different processes. The rules must
 * stay identical; a number normalised one way here and another way there simply
 * never matches.
 */

const SYNTHETIC_DOMAIN = "nomail.kprime.pk";

/** `92` + `3` + nine digits. Landlines are not valid contact numbers here. */
const NORMALISED = /^923\d{9}$/;

const SEPARATORS = /[\s\-().]/g;

/** Mirrors `normalizePhone` in the storefront. Keep the two in step. */
function normalizePhone(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw) {
    return null;
  }

  let digits = raw.replace(SEPARATORS, "").trim();

  if (digits.startsWith("+")) {
    digits = digits.slice(1);
  }

  if (!/^\d+$/.test(digits)) {
    return null;
  }

  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  if (digits.startsWith("92")) {
    if (digits.startsWith("920")) {
      digits = `92${digits.slice(3)}`;
    }
  } else if (digits.startsWith("0")) {
    digits = `92${digits.slice(1)}`;
  } else if (digits.startsWith("3")) {
    digits = `92${digits}`;
  }

  return NORMALISED.test(digits) ? digits : null;
}

/**
 * One message for every failure.
 *
 * Saying "that order does not exist" versus "the phone does not match" would
 * turn this into a way to confirm which order numbers are real.
 */
const GENERIC_ERROR =
  "We could not find an order with that number and phone. Check both and try again.";

/** Per-IP window. Generous for a human, useless for enumeration. */
const RATE_LIMIT = { max: 10, windowMs: 60_000 };

/**
 * In-memory, per-process. Adequate for a single instance; behind more than one
 * this needs to move to Redis, which the project already runs.
 */
const attempts = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);

  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT.windowMs });
    return false;
  }

  entry.count += 1;

  // Swept opportunistically rather than on a timer, so the map cannot grow
  // without bound across a long uptime.
  if (attempts.size > 5000) {
    for (const [key, value] of attempts) {
      if (now > value.resetAt) {
        attempts.delete(key);
      }
    }
  }

  return entry.count > RATE_LIMIT.max;
}

type TrackBody = {
  order_number?: string | number;
  phone?: string;
};

export async function POST(req: MedusaRequest<TrackBody>, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown";

  if (rateLimited(ip)) {
    return res
      .status(429)
      .json({ message: "Too many attempts. Please wait a minute." });
  }

  const rawNumber = req.body?.order_number;

  // Trimmed before the "#" is stripped, not after: people paste " #22 " and
  // stripping first leaves the leading space, which yields NaN.
  const orderNumber = Number(
    typeof rawNumber === "string"
      ? rawNumber.trim().replace(/^#/, "").trim()
      : rawNumber
  );

  const phone = normalizePhone(req.body?.phone);

  // BOTH are required. This is the check that makes phone-only lookup
  // impossible; do not relax it.
  if (!Number.isInteger(orderNumber) || orderNumber <= 0 || !phone) {
    return res.status(400).json({
      message: "An order number and the phone used at checkout are both required.",
    });
  }

  const { data: matches } = await query.graph({
    entity: "order",
    fields: ["id"],
    // query.graph types display_id as a string even though the column is an int.
    filters: { display_id: String(orderNumber) },
  });

  const candidate = matches?.[0];

  const { data: orders } = candidate
    ? await query.graph({
        entity: "order",
        fields: [
          "id",
          "display_id",
          "email",
          "status",
          "created_at",
          "currency_code",
          "item_total",
          "shipping_total",
          "discount_total",
          "total",
          "items.id",
          "items.title",
          "items.variant_title",
          "items.quantity",
          "items.unit_price",
          "items.thumbnail",
          "shipping_methods.name",
          "shipping_address.first_name",
          "shipping_address.last_name",
          "shipping_address.address_1",
          "shipping_address.city",
          "shipping_address.province",
          "shipping_address.phone",
          "fulfillments.shipped_at",
          "fulfillments.provider_id",
          "fulfillments.metadata",
          "fulfillments.delivered_at",
          "fulfillments.labels.tracking_number",
          "fulfillments.labels.tracking_url",
          "fulfillments.labels.label_url",
        ],
        filters: { id: candidate.id },
      })
    : { data: [] };

  const order = orders?.[0];

  // The phone is matched against the synthetic email, which is derived from it
  // and nothing else, with the shipping address phone as a fallback for orders
  // placed through admin.
  const syntheticEmail = `${phone}@${SYNTHETIC_DOMAIN}`;
  const addressPhone = normalizePhone(order?.shipping_address?.phone);

  const matchesPhone =
    order &&
    ((order.email ?? "").trim().toLowerCase() === syntheticEmail ||
      addressPhone === phone);

  // Identical response for "no such order" and "phone does not match".
  if (!order || !matchesPhone) {
    return res.status(404).json({ message: GENERIC_ERROR });
  }

  const fulfillments = (order.fulfillments ?? []).filter(Boolean);
  const shipped = fulfillments.some((f: any) => f?.shipped_at);
  const delivered = fulfillments.some((f: any) => f?.delivered_at);

  // Booking is manual, so the carrier differs per order and the label is
  // whatever the shop typed in (§5.1). Nothing is assumed about the courier.
  const withLabel = fulfillments.find((f: any) =>
    (f?.labels ?? []).some((l: any) => l?.tracking_number)
  );

  const label = (withLabel?.labels ?? []).find((l: any) => l?.tracking_number);

  // The carrier is whatever the shop recorded when they booked. `metadata.carrier`
  // is the field the admin fills in; provider_id is the fallback for a
  // fulfilment created through a provider integration. Never guessed — booking
  // is manual and the courier genuinely differs per order (§5.1).
  const carrier =
    (typeof withLabel?.metadata?.carrier === "string"
      ? withLabel.metadata.carrier
      : null) ??
    (withLabel?.provider_id && withLabel.provider_id !== "manual_manual"
      ? String(withLabel.provider_id)
      : null);

  return res.json({
    order: {
      display_id: order.display_id,
      status: order.status,
      created_at: order.created_at,
      currency_code: order.currency_code,
      item_total: order.item_total,
      shipping_total: order.shipping_total,
      discount_total: order.discount_total,
      total: order.total,
      delivery_state: delivered
        ? "delivered"
        : shipped
          ? "shipped"
          : order.status === "canceled"
            ? "canceled"
            : "processing",
      shipping_method: order.shipping_methods?.[0]?.name ?? null,
      items: (order.items ?? []).map((item: any) => ({
        id: item.id,
        title: item.title,
        variant_title: item.variant_title,
        quantity: item.quantity,
        unit_price: item.unit_price,
        thumbnail: item.thumbnail,
      })),
      shipping_address: order.shipping_address
        ? {
            name: [
              order.shipping_address.first_name,
              order.shipping_address.last_name,
            ]
              .filter(Boolean)
              .join(" "),
            address_1: order.shipping_address.address_1,
            city: order.shipping_address.city,
            province: order.shipping_address.province,
          }
        : null,
      tracking: label
        ? {
            carrier,
            number: label.tracking_number,
            url: label.tracking_url ?? null,
          }
        : null,
    },
  });
}

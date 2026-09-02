import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

/**
 * Attaches a customer record to every guest order, and flags it unverified.
 *
 * Runs on the backend rather than in the storefront for two reasons. The store
 * API has no way for a guest to create a customer — registration requires auth —
 * and an order placed by any other client (admin, a future app) needs the same
 * treatment. Doing it here means there is one implementation, not one per
 * caller.
 *
 * **The phone is the identity, not the email (§2.2).** `cart.email` is the
 * synthetic `{phone}@nomail.kprime.pk` address, which is deterministic, so
 * looking a customer up by it is the same as looking them up by phone. That is
 * what makes a second order from the same number land under the same customer
 * record instead of creating a stranger.
 *
 * `phone` is set as a native Customer column, so it is searchable in
 * Admin -> Customers rather than buried in JSON.
 *
 * Runs after the order is committed and never rethrows: an order that exists
 * must not be lost because a customer row could not be written. A failure is
 * logged and leaves the order intact but unlinked.
 */

/** Matches the storefront's SYNTHETIC_EMAIL_DOMAIN. Do not change one alone. */
const SYNTHETIC_DOMAIN = "nomail.kprime.pk";

/** `923001234567@nomail.kprime.pk` -> `923001234567`. */
function phoneFromSyntheticEmail(email: string | null | undefined) {
  if (!email || !email.endsWith(`@${SYNTHETIC_DOMAIN}`)) {
    return null;
  }

  const local = email.slice(0, -(SYNTHETIC_DOMAIN.length + 1));

  return /^923\d{9}$/.test(local) ? local : null;
}

export default async function orderIdentityHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const orderModule = container.resolve(Modules.ORDER);
  const customerModule = container.resolve(Modules.CUSTOMER);

  try {
    const order = await orderModule.retrieveOrder(data.id, {
      select: ["id", "email", "customer_id", "metadata"],
      relations: ["shipping_address"],
    });

    // Fall back to the address phone: an order placed through admin will not
    // carry a synthetic email.
    const phone =
      phoneFromSyntheticEmail(order.email) ??
      order.shipping_address?.phone ??
      null;

    const metadata = {
      ...(order.metadata ?? {}),
      // Always false at placement. A human rings to verify, and nothing in this
      // flow proves the number answers.
      phone_verified: false,
    };

    if (!phone) {
      logger.warn(
        `order.placed: no phone on ${order.id}; flagging unverified only`
      );

      await orderModule.updateOrders([{ id: order.id, metadata }]);
      return;
    }

    const name =
      [order.shipping_address?.first_name, order.shipping_address?.last_name]
        .filter(Boolean)
        .join(" ") || null;

    // Looked up by the synthetic email rather than the phone column, because
    // `phone` is not a filterable customer property in Medusa. It is the same
    // lookup either way: the address is derived from the phone and nothing
    // else, which is exactly why its format is frozen (§2.2).
    const syntheticEmail = `${phone}@${SYNTHETIC_DOMAIN}`;

    const [existing] = await customerModule.listCustomers(
      { email: syntheticEmail },
      { select: ["id"], take: 1 }
    );

    let customerId = existing?.id ?? null;

    if (customerId) {
      // Medusa creates a guest customer from `cart.email` during completion, so
      // by the time this runs the record usually exists already — with a null
      // phone, because nothing in that path knows about it. Setting it here is
      // what makes the number searchable in Admin -> Customers rather than
      // living only on the order's address.
      //
      // The name is refreshed too, in case they gave a fuller one this time;
      // an empty value never blanks what is already stored.
      await customerModule.updateCustomers(customerId, {
        phone,
        ...(name
          ? {
              first_name: order.shipping_address?.first_name ?? undefined,
              last_name: order.shipping_address?.last_name ?? undefined,
            }
          : {}),
      });
    } else {
      const created = await customerModule.createCustomers({
        email: syntheticEmail,
        phone,
        first_name: order.shipping_address?.first_name ?? undefined,
        last_name: order.shipping_address?.last_name ?? undefined,
        has_account: false,
      });

      customerId = created.id;
    }

    await orderModule.updateOrders([
      { id: order.id, customer_id: customerId, metadata },
    ]);

    logger.info(
      `order.placed: ${order.id} linked to customer ${customerId} (${phone}), phone_verified=false`
    );
  } catch (error) {
    // Deliberately swallowed. The order is already committed and paid on
    // delivery; losing the customer link is recoverable, losing the order is
    // not.
    logger.error(
      `order.placed: could not attach identity to ${data.id}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
};

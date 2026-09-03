/**
 * Where customer mail may actually be sent.
 *
 * ⚠️ **`order.email` is never a real mailbox.** Guest checkout always sets it to
 * the synthetic `{phone}@nomail.kprime.pk` address, which exists so one phone
 * number resolves to one customer (§2.2). Sending there produces a hard bounce
 * for every order, and enough of those damage the sending domain's reputation
 * for the mail that does matter.
 *
 * A real address only exists when the shopper chose to give one, and it is kept
 * in `metadata.contact_email`. Most orders have none — that is the expected
 * case, not a failure, so callers skip quietly rather than logging an error.
 */

const SYNTHETIC_DOMAIN = "nomail.kprime.pk";

export function isSyntheticEmail(email: string | null | undefined): boolean {
  return Boolean(email && email.toLowerCase().endsWith(`@${SYNTHETIC_DOMAIN}`));
}

/** The address to write to, or null when there is nowhere real to send. */
export function customerEmailFor(order: {
  email?: string | null;
  metadata?: Record<string, unknown> | null;
}): string | null {
  const contact = order.metadata?.contact_email;

  if (typeof contact === "string" && contact.trim() && !isSyntheticEmail(contact)) {
    return contact.trim();
  }

  // Falls back to `email` only if it is somehow a real address — an order
  // placed through admin, for instance. Never a synthetic one.
  if (order.email && !isSyntheticEmail(order.email)) {
    return order.email;
  }

  return null;
}

/**
 * Phone normalisation and the synthetic email derived from it.
 *
 * **Runs at the API boundary, never in a component (§2.2).** Every raw phone
 * string entering the system passes through `normalizePhone` once, and nothing
 * downstream — no component, no action, no template — touches an unnormalised
 * number. One number typed five different ways has to become one identity, or
 * a returning customer becomes five customers and their order history splits.
 */

/**
 * Pakistani mobile numbers, normalised.
 *
 * `92` + `3` + nine digits. Landlines (`042…`, `051…`) are deliberately not
 * valid: this shop delivers by courier and confirms by phone call, and a
 * landline cannot receive the WhatsApp message that follows an order.
 */
const NORMALISED = /^923\d{9}$/

/** Everything a human might type between the digits. */
const SEPARATORS = /[\s\-().]/g

/**
 * A raw phone string reduced to `923001234567`, or null if it is not a valid
 * Pakistani mobile number.
 *
 * Accepts `03xxxxxxxxx`, `+923xxxxxxxxx`, `00923xxxxxxxxx` and a bare
 * `3xxxxxxxxx`, with any mix of spaces, dashes, dots and brackets.
 *
 * Returns null rather than throwing: an invalid number is a form validation
 * message, not an exception. The caller decides what to say about it.
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) {
    return null
  }

  let digits = raw.replace(SEPARATORS, "").trim()

  // A leading + carries no information once the country code is explicit.
  if (digits.startsWith("+")) {
    digits = digits.slice(1)
  }

  // Anything left that is not a digit means the input was never a number —
  // letters, a second +, an emoji. Rejecting here keeps the branches below
  // from having to reason about them.
  if (!/^\d+$/.test(digits)) {
    return null
  }

  // 00 is the international prefix in the format Pakistani carriers print.
  if (digits.startsWith("00")) {
    digits = digits.slice(2)
  }

  if (digits.startsWith("92")) {
    // "+920300…" — both the country code and the trunk 0. Malformed, but
    // unambiguous and common enough to accept rather than reject.
    if (digits.startsWith("920")) {
      digits = `92${digits.slice(3)}`
    }
  } else if (digits.startsWith("0")) {
    // National format: the trunk 0 becomes the country code.
    digits = `92${digits.slice(1)}`
  } else if (digits.startsWith("3")) {
    // Typed without either prefix.
    digits = `92${digits}`
  }

  return NORMALISED.test(digits) ? digits : null
}

/** True when a string is already in normalised form. */
export function isNormalisedPhone(value: string): boolean {
  return NORMALISED.test(value)
}

/**
 * The domain guest orders are filed under.
 *
 * ⚠️ **FROZEN. Never change this.**
 *
 * Medusa requires an email on every cart, but this shop has no accounts and
 * asks for no email. The synthetic address is what makes a phone number the
 * identity instead: it is deterministic, so the same number always produces the
 * same address, and every order from that number lands under one customer.
 *
 * It is also the lookup key that would let a v2 account claim its guest
 * history. Changing the domain orphans every order placed before the change.
 */
export const SYNTHETIC_EMAIL_DOMAIN = "nomail.kprime.pk"

/**
 * `923001234567` → `923001234567@nomail.kprime.pk`.
 *
 * Always set on `cart.email`, **even when the shopper typed a real one**. The
 * real address goes to `cart.metadata.contact_email` and is only ever used to
 * write to them. Putting a real email in `cart.email` would break the identity
 * rule the moment two people share an address, or one person uses two.
 *
 * Throws on an unnormalised input, because a synthetic address built from a
 * raw string would silently create a second identity for the same person —
 * exactly the failure this whole module exists to prevent.
 */
export function syntheticEmail(normalised: string): string {
  if (!isNormalisedPhone(normalised)) {
    throw new Error(
      `syntheticEmail requires a normalised phone, got "${normalised}". ` +
        "Call normalizePhone at the API boundary first."
    )
  }

  return `${normalised}@${SYNTHETIC_EMAIL_DOMAIN}`
}

/** `923001234567` → `0300 1234567`, for reading back to a shopper. */
export function formatPhoneForDisplay(normalised: string): string {
  if (!isNormalisedPhone(normalised)) {
    return normalised
  }

  const national = `0${normalised.slice(2)}`

  return `${national.slice(0, 4)} ${national.slice(4)}`
}

import { describe, expect, it } from "vitest"

import {
  formatPhoneForDisplay,
  isNormalisedPhone,
  normalizePhone,
  SYNTHETIC_EMAIL_DOMAIN,
  syntheticEmail,
} from "@/lib/identity/phone"

/** One real number, written every way a shopper might write it. */
const SAME_NUMBER = [
  "03001234567",
  "0300 123 4567",
  "0300-123-4567",
  "0300 1234567",
  "(0300) 123-4567",
  "+923001234567",
  "+92 300 123 4567",
  "+92-300-1234567",
  "00923001234567",
  "0092 300 123 4567",
  "3001234567",
  "923001234567",
  "  03001234567  ",
]

const EXPECTED = "923001234567"

describe("normalizePhone", () => {
  it("reduces every way of writing one number to the same string", () => {
    for (const input of SAME_NUMBER) {
      expect(normalizePhone(input), input).toBe(EXPECTED)
    }

    // The property that matters: one identity, not thirteen.
    const outputs = new Set(SAME_NUMBER.map((input) => normalizePhone(input)))
    expect(outputs.size).toBe(1)
  })

  it("accepts each of the four documented input shapes", () => {
    expect(normalizePhone("03331234567")).toBe("923331234567")
    expect(normalizePhone("+923331234567")).toBe("923331234567")
    expect(normalizePhone("00923331234567")).toBe("923331234567")
    expect(normalizePhone("3331234567")).toBe("923331234567")
  })

  it("accepts a country code written with the trunk zero as well", () => {
    // Malformed but unambiguous, and people do type it.
    expect(normalizePhone("+9203001234567")).toBe(EXPECTED)
  })

  it("rejects a number that is too short", () => {
    expect(normalizePhone("0300123")).toBeNull()
    expect(normalizePhone("+92300")).toBeNull()
    expect(normalizePhone("3")).toBeNull()
  })

  it("rejects a number that is too long", () => {
    expect(normalizePhone("030012345678")).toBeNull()
    expect(normalizePhone("+9230012345670")).toBeNull()
  })

  it("rejects non-digits", () => {
    expect(normalizePhone("abcdefghijk")).toBeNull()
    expect(normalizePhone("0300abc4567")).toBeNull()
    expect(normalizePhone("++923001234567")).toBeNull()
    expect(normalizePhone("0300_123_4567")).toBeNull()
  })

  it("rejects empty and missing input", () => {
    expect(normalizePhone("")).toBeNull()
    expect(normalizePhone("   ")).toBeNull()
    expect(normalizePhone(null)).toBeNull()
    expect(normalizePhone(undefined)).toBeNull()
  })

  it("rejects landlines", () => {
    // Couriers phone to confirm and WhatsApp afterwards; a landline does
    // neither, so it is not a valid contact number for this shop.
    expect(normalizePhone("0421234567")).toBeNull()
    expect(normalizePhone("+924212345678")).toBeNull()
    expect(normalizePhone("0519876543")).toBeNull()
  })

  it("is idempotent", () => {
    const once = normalizePhone("0300 123 4567")!
    expect(normalizePhone(once)).toBe(once)
  })
})

describe("syntheticEmail", () => {
  it("builds the frozen format", () => {
    // If this assertion ever needs changing, every order placed before the
    // change is orphaned from its customer. Change the code, not the test.
    expect(syntheticEmail(EXPECTED)).toBe("923001234567@nomail.kprime.pk")
    expect(SYNTHETIC_EMAIL_DOMAIN).toBe("nomail.kprime.pk")
  })

  it("gives one address for every way of writing the number", () => {
    const addresses = new Set(
      SAME_NUMBER.map((input) => syntheticEmail(normalizePhone(input)!))
    )

    expect(addresses.size).toBe(1)
  })

  it("refuses an unnormalised phone", () => {
    // Silently accepting one would create a second identity for one person.
    expect(() => syntheticEmail("03001234567")).toThrow()
    expect(() => syntheticEmail("not a phone")).toThrow()
  })
})

describe("isNormalisedPhone", () => {
  it("recognises normalised numbers only", () => {
    expect(isNormalisedPhone(EXPECTED)).toBe(true)
    expect(isNormalisedPhone("03001234567")).toBe(false)
    expect(isNormalisedPhone("924212345678")).toBe(false)
  })
})

describe("formatPhoneForDisplay", () => {
  it("reads back in the format people recognise", () => {
    expect(formatPhoneForDisplay(EXPECTED)).toBe("0300 1234567")
  })

  it("passes anything unnormalised through untouched", () => {
    expect(formatPhoneForDisplay("whatever")).toBe("whatever")
  })
})

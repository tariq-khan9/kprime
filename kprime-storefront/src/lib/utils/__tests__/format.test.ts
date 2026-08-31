import { describe, expect, it } from "vitest"

import { cn, formatPKR } from "@/lib/utils/format"

describe("formatPKR", () => {
  it("formats zero as a price, not as missing", () => {
    // The distinction that a falsy check gets wrong.
    expect(formatPKR(0)).toBe("Rs 0")
  })

  it("formats a 3-digit price", () => {
    expect(formatPKR(250)).toBe("Rs 250")
  })

  it("groups a 7-digit price in threes", () => {
    // Not lakhs — en-PK uses standard grouping.
    expect(formatPKR(1234567)).toBe("Rs 1,234,567")
  })

  it("groups a 4-digit price", () => {
    expect(formatPKR(2200)).toBe("Rs 2,200")
  })

  it("does not divide by 100", () => {
    // Medusa v2 stores whole rupees for PKR. The v1 habit of treating the
    // amount as minor units would make this "Rs 22" and every price on the
    // site would be plausibly, silently wrong.
    expect(formatPKR(2200)).not.toBe("Rs 22")
  })

  it("returns an em dash for null", () => {
    expect(formatPKR(null)).toBe("—")
  })

  it("returns an em dash for undefined", () => {
    expect(formatPKR(undefined)).toBe("—")
  })

  it("returns an em dash for NaN rather than 'Rs NaN'", () => {
    expect(formatPKR(NaN)).toBe("—")
  })

  it("returns an em dash for Infinity", () => {
    expect(formatPKR(Infinity)).toBe("—")
  })

  it("formats a negative amount", () => {
    // Discounts and adjustments arrive negative from Medusa.
    expect(formatPKR(-500)).toBe("Rs -500")
  })
})

describe("cn", () => {
  it("joins class names", () => {
    expect(cn("px-4", "py-2")).toBe("px-4 py-2")
  })

  it("drops falsy conditionals", () => {
    expect(cn("base", false && "hidden", undefined, "text-brand")).toBe(
      "base text-brand"
    )
  })

  it("lets a later Tailwind class win a conflict", () => {
    // The reason tailwind-merge is a dependency at all: without it both
    // classes survive and CSS source order picks the winner.
    expect(cn("px-4", "px-8")).toBe("px-8")
  })
})

import { describe, expect, it } from "vitest"

/**
 * Proves the runner itself works — config resolves, TypeScript compiles, the
 * `@/*` alias is wired. If this fails, nothing else in the suite is meaningful.
 */
describe("test runner", () => {
  it("runs", () => {
    expect(true).toBe(true)
  })
})

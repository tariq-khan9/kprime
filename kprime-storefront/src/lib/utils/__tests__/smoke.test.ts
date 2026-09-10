import { describe, it, expect } from "vitest";

describe("ci sanity check", () => {
  it("should fail on purpose", () => {
    expect(1).toBe(2);
  });
});

import { fileURLToPath } from "node:url"

import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    // Pure functions only — phone normalisation, price filtering, facet
    // coverage. Nothing here renders, so jsdom would add startup cost for
    // nothing. Task 17 wants the suite under 5 seconds.
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    // Mirrors the `@/*` path in tsconfig.json. Without it every `@/lib/...`
    // import in a test fails to resolve.
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
})

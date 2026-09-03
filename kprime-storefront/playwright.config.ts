import { defineConfig, devices } from "@playwright/test"

/**
 * Smoke tests only (task 157).
 *
 * **Mobile Chrome, not desktop.** 80%+ of this shop's traffic is a phone, and
 * the layouts genuinely differ — the cart, the gallery and the checkout summary
 * all render different components below `lg`. Testing the desktop path would
 * pass while the path most customers take was broken.
 *
 * Serial, not parallel: the tests share one backend and place real orders, so
 * running them concurrently would have them fighting over inventory.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:8000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "mobile-chrome", use: { ...devices["Pixel 5"] } },
  ],
})

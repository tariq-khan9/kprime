import { expect, test } from "@playwright/test"

/**
 * Five smoke tests: the path a customer actually walks.
 *
 * Not a substitute for the unit tests — these prove the pieces are wired
 * together against a running backend, which is exactly what unit tests cannot
 * see. They need a seeded database; a fresh one with no products will fail the
 * first test rather than pass vacuously.
 */

test("home loads with products", async ({ page }) => {
  await page.goto("/")

  await expect(page).toHaveTitle(/Karkhano Prime/)

  // At least one real product card, not just the skeleton.
  const cards = page.locator('a[href^="/products/"]')
  await expect(cards.first()).toBeVisible()
  expect(await cards.count()).toBeGreaterThan(0)
})

test("a category filter changes the results", async ({ page }) => {
  await page.goto("/categories/electronics")

  const before = await page.locator('a[href^="/products/"]').count()
  expect(before).toBeGreaterThan(0)

  // Price is the filter every catalogue has, whatever the facets happen to be.
  await page.goto("/categories/electronics?price=0-1000")

  const after = await page.locator('a[href^="/products/"]').count()

  // Fewer, or the same if everything genuinely is under Rs 1000 — never more.
  expect(after).toBeLessThanOrEqual(before)
})

test("add to cart persists across a reload", async ({ page }) => {
  await page.goto("/")
  await page.locator('a[href^="/products/"]').first().click()

  await page.getByRole("button", { name: /add to cart/i }).first().click()

  // The drawer opens on success.
  await expect(page.getByRole("link", { name: /view cart/i })).toBeVisible({
    timeout: 15_000,
  })

  // The cart lives in an httpOnly cookie, so it must survive a full reload.
  await page.goto("/cart")
  await expect(page.getByRole("heading", { name: /your cart/i })).toBeVisible()

  // `:visible` matters here. The cart renders a desktop row and a mobile card
  // for every line; on a phone viewport the desktop one is first in the DOM and
  // is display:none, so `.first()` would resolve to a hidden element.
  await expect(
    page.locator('a[href^="/products/"]:visible').first()
  ).toBeVisible()
})

test("checkout places an order", async ({ page }) => {
  await page.goto("/")
  await page.locator('a[href^="/products/"]').first().click()
  await page.getByRole("button", { name: /add to cart/i }).first().click()

  // Wait for the drawer before navigating. The add is a server action, and
  // going to checkout while it is still in flight lands on an empty cart.
  await expect(page.getByRole("link", { name: /view cart/i })).toBeVisible({
    timeout: 15_000,
  })

  await page.goto("/checkout")

  await page.getByLabel(/full name/i).fill("Smoke Test")
  await page.getByLabel(/mobile number/i).fill("03001234567")
  await page.getByRole("button", { name: /continue to address/i }).click()

  await page.getByLabel(/street address/i).fill("House 1, Street 1")
  await page.getByLabel(/province/i).selectOption({ label: "Punjab" })
  await page.getByLabel(/^city/i).selectOption({ label: "Lahore" })
  await page.getByRole("button", { name: /continue to delivery/i }).click()

  await page.getByRole("button", { name: /continue to review/i }).click()

  await page.getByRole("button", { name: /place order/i }).click()

  // The receipt, which is the only one a customer gets.
  await expect(
    page.getByRole("heading", { name: /we have received your order/i })
  ).toBeVisible({ timeout: 30_000 })

  await expect(page.getByText(/screenshot this page/i)).toBeVisible()
})

test("track finds the order", async ({ page }) => {
  // Runs after the checkout test in file order, so an order exists. The order
  // number is read off the confirmation page rather than assumed.
  await page.goto("/")
  await page.locator('a[href^="/products/"]').first().click()
  await page.getByRole("button", { name: /add to cart/i }).first().click()

  // Wait for the drawer before navigating. The add is a server action, and
  // going to checkout while it is still in flight lands on an empty cart.
  await expect(page.getByRole("link", { name: /view cart/i })).toBeVisible({
    timeout: 15_000,
  })

  await page.goto("/checkout")

  await page.getByLabel(/full name/i).fill("Track Test")
  await page.getByLabel(/mobile number/i).fill("03009998877")
  await page.getByRole("button", { name: /continue to address/i }).click()
  await page.getByLabel(/street address/i).fill("House 2, Street 2")
  await page.getByLabel(/province/i).selectOption({ label: "Punjab" })
  await page.getByLabel(/^city/i).selectOption({ label: "Lahore" })
  await page.getByRole("button", { name: /continue to delivery/i }).click()
  await page.getByRole("button", { name: /continue to review/i }).click()
  await page.getByRole("button", { name: /place order/i }).click()

  const number = await page
    .locator("button[aria-label^='Order number']")
    .innerText()
  const orderNumber = number.replace(/\D/g, "")

  await page.goto("/track")
  await page.getByLabel(/order number/i).fill(orderNumber)
  await page.getByLabel(/phone number/i).fill("03009998877")
  await page.getByRole("button", { name: /find my order/i }).click()

  await expect(page.getByText(orderNumber).first()).toBeVisible({
    timeout: 20_000,
  })
})

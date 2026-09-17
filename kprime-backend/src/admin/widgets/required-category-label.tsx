import { defineWidgetConfig } from "@medusajs/admin-sdk"

/**
 * Hides "(Optional)" beside Categories on the Create product form.
 *
 * Categories are required — `requireCategory` in src/api/middlewares.ts refuses
 * a product without one — but the dashboard hard-codes `optional: true` on that
 * label, and form extension configs cannot reach core fields. So the hint is
 * hidden in the DOM instead.
 *
 * Runs at module load, like discountable-default-off.tsx, because the create
 * form is a modal route that mounts none of our widget zones.
 *
 * Hidden rather than removed: React owns that node, and taking it out from
 * under React can crash the form's next re-render. The anchor is the muted text
 * the dashboard's Form.Label renders right after the label. If a Medusa upgrade
 * reshapes Form.Label, that selector is the one thing to recheck.
 */
if (typeof document !== "undefined") {
  new MutationObserver(() => {
    if (!location.pathname.endsWith("/products/create")) {
      return
    }

    for (const label of document.querySelectorAll("label")) {
      if (label.textContent?.trim() !== "Categories") {
        continue
      }

      const hint = label.nextElementSibling

      if (
        hint instanceof HTMLElement &&
        hint.classList.contains("text-ui-fg-muted") &&
        hint.style.display !== "none"
      ) {
        hint.style.display = "none"
      }
    }
  }).observe(document.body, { childList: true, subtree: true })
}

const RequiredCategoryLabel = () => null

export const config = defineWidgetConfig({
  zone: "product.list.before",
})

export default RequiredCategoryLabel

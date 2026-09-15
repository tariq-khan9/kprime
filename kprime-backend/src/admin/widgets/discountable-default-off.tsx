import { defineWidgetConfig } from "@medusajs/admin-sdk"

/**
 * Starts the Discountable switch off on the Create product form.
 *
 * The dashboard hard-codes `discountable: true` as the create form's default,
 * and form extension configs only reach `additional_data`, never core fields.
 * So the switch is flipped once, the way a person would, when the form first
 * renders it. Whatever the admin does after that is respected, including
 * switching it back on. The Edit form is left alone — it shows the saved value.
 *
 * Runs at module load, like login-branding.tsx, because the create form is a
 * modal route that mounts none of our widget zones.
 *
 * The switch carries no id of its own. The anchor is the hidden checkbox Radix
 * renders beside it inside a form. If a Medusa upgrade reshapes the field, the
 * selector is the one thing to recheck.
 */
if (typeof document !== "undefined") {
  let flipped = false

  new MutationObserver(() => {
    if (!location.pathname.endsWith("/products/create")) {
      flipped = false
      return
    }

    if (flipped) {
      return
    }

    const toggle = document.querySelector('input[name="discountable"]')?.previousElementSibling

    if (toggle instanceof HTMLButtonElement) {
      flipped = true

      if (toggle.getAttribute("aria-checked") === "true") {
        toggle.click()
      }
    }
  }).observe(document.body, { childList: true, subtree: true })
}

const DiscountableDefaultOff = () => null

export const config = defineWidgetConfig({
  zone: "product.list.before",
})

export default DiscountableDefaultOff

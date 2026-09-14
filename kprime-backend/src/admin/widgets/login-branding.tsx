import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Heading, Text } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

import logo from "../assets/logo.png"

const BRAND = "Karkhano Prime"
const NAVY = "#0F1E3D"
const CREAM = "#F6F4EF"

/**
 * Tab title and favicon, app-wide.
 *
 * Both are hard-coded in the dashboard ("Orders - Medusa", a blank favicon) with
 * no config to change them. This runs at module load rather than inside the
 * component: every widget module is imported when the admin boots, so it
 * applies on every page, not only while the login screen is mounted.
 */
if (typeof document !== "undefined") {
  const rebrandTitle = () => {
    if (document.title.includes("Medusa")) {
      document.title = document.title.replace(/Medusa/g, BRAND)
    }
  }

  new MutationObserver(rebrandTitle).observe(document.head, {
    subtree: true,
    childList: true,
    characterData: true,
  })
  rebrandTitle()

  const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="${NAVY}"/><text x="32" y="47" text-anchor="middle" font-family="Arial,sans-serif" font-size="44" font-weight="700" fill="${CREAM}">P</text></svg>`

  const link =
    document.querySelector<HTMLLinkElement>("link[rel='icon']") ??
    document.head.appendChild(
      Object.assign(document.createElement("link"), { rel: "icon" })
    )
  link.href = `data:image/svg+xml,${encodeURIComponent(favicon)}`
}

/**
 * Replaces Medusa's hexagon and heading on the login page with our logo.
 *
 * The dashboard offers no slot above the form, only `login.before` inside it,
 * so the stock avatar and heading are hidden with CSS and redrawn here. The
 * rule lives in this component, so it exists only while the login page is
 * mounted. If a Medusa upgrade reshapes the login page, the selector is the
 * one thing to recheck.
 *
 * The logo is cream and amber on transparent — it needs the navy plate.
 */
const LoginBranding = () => {
  const { t } = useTranslation()

  return (
    <>
      <style>{`
        .min-h-dvh.bg-ui-bg-subtle > div > div:nth-child(-n + 2) { display: none; }
      `}</style>
      <div className="mb-4 flex flex-col items-center gap-y-4">
        <div
          className="flex w-full items-center justify-center rounded-xl px-6 py-5"
          style={{ backgroundColor: NAVY }}
        >
          <img src={logo} alt={BRAND} className="h-auto w-full max-w-[200px]" />
        </div>
        <div className="flex flex-col items-center">
          <Heading>{t("login.title")}</Heading>
          <Text size="small" className="text-ui-fg-subtle text-center">
            {t("login.hint")}
          </Text>
        </div>
      </div>
    </>
  )
}

export const config = defineWidgetConfig({
  zone: "login.before",
})

export default LoginBranding

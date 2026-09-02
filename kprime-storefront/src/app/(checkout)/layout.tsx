import type { ReactNode } from "react"

import { Logo } from "@/components/layout/Logo"
import { TrustStrip } from "@/components/layout/TrustStrip"
import { ToastProvider } from "@/components/ui/Toast"

/**
 * The stripped checkout shell.
 *
 * **Every exit is deliberately removed** — no nav, no mega menu, no search, no
 * cart button, no footer links, no WhatsApp float. Someone who is three fields
 * into a COD order should have nothing to click except the next step, and
 * removing the exits measurably reduces drop-off (§4.10).
 *
 * The logo is the single way out, and it goes home rather than back to the
 * cart, so leaving is one clear decision instead of a half-step.
 *
 * TrustStrip stays: cash on delivery and the returns note are exactly what
 * someone hesitates over at this point.
 *
 * The stepper is rendered per page rather than here, because only the page
 * knows which step it is on.
 */
export default function CheckoutLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <ToastProvider>
      <div className="flex min-h-screen flex-col bg-paper">
        <header className="border-b border-line bg-header">
          <div className="mx-auto flex h-16 max-w-3xl items-center justify-center px-4">
            <Logo />
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <TrustStrip />
      </div>
    </ToastProvider>
  )
}

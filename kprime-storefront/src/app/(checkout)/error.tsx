"use client"

import Link from "next/link"
import { useEffect } from "react"

import { Button } from "@/components/ui/Button"
import { whatsappLink } from "@/config/site"

/**
 * The checkout error boundary.
 *
 * Separate from the root one because the stakes are different (§3). Someone who
 * hits an error three fields into a cash-on-delivery order needs two things the
 * generic page does not give them: to be told **their basket is safe**, and a
 * way to finish the order by talking to a person instead.
 *
 * **The cart genuinely survives.** It lives in an httpOnly cookie and on the
 * server, not in React state, so nothing in this boundary needs to restore it —
 * the "back to your cart" link simply works. That is why the promise below is
 * safe to make.
 *
 * No `reset()` retry as the primary action here. Retrying a failed checkout
 * step is the one place a blind retry could plausibly place a second order, so
 * the cart is offered first and retry second.
 */
export default function CheckoutError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Checkout error", error.digest ?? error.message)
  }, [error])

  return (
    <main className="flex min-h-[60vh] items-center justify-center px-4 py-16">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <h1 className="text-2xl font-bold text-brand">
          Something went wrong at checkout
        </h1>

        <p className="text-brand">
          <strong>Your basket is safe.</strong> Nothing has been ordered and
          nothing has been charged — you pay in cash on delivery in any case.
        </p>

        <p className="text-muted">
          Go back to your basket and try again, or send us the order on WhatsApp
          and we will place it for you.
        </p>

        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <Button variant="primary" asChild>
            <Link href="/cart">Back to your basket</Link>
          </Button>

          <Button variant="secondary" asChild>
            <a
              href={whatsappLink(
                "Hi, I had a problem at checkout and would like to place my order."
              )}
              target="_blank"
              rel="noopener noreferrer"
            >
              Order on WhatsApp
            </a>
          </Button>
        </div>

        <button
          type="button"
          onClick={reset}
          className="mt-2 min-h-11 text-sm text-muted underline underline-offset-2 hover:text-brand"
        >
          Try that step again
        </button>
      </div>
    </main>
  )
}

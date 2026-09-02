"use client"

import { useEffect, useRef, useState } from "react"

import { ensurePaymentSessionAction } from "@/lib/data/checkout.actions"

function CashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="size-5 shrink-0">
      <rect
        x="2"
        y="6"
        width="20"
        height="12"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

/**
 * Cash on delivery.
 *
 * **Display only — there are no card fields and no provider to choose.** This
 * shop takes cash at the door and nothing else, so a payment step with options
 * would be a decision with one answer. It is shown inside Review rather than as
 * its own stepper step for the same reason.
 *
 * It still has work to do: Medusa needs a payment session on the cart before
 * completion will authorise anything, so this initialises the manual one as
 * soon as the review step renders. Doing it here rather than inside the place
 * button means a failure surfaces while the shopper is still reading, not when
 * they commit.
 *
 * The call is idempotent — Medusa returns the cart's existing collection rather
 * than making a second — and the ref guards React's double-invoked effect in
 * development on top of that.
 */
export function PaymentStep() {
  const started = useRef(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (started.current) {
      return
    }

    started.current = true

    ensurePaymentSessionAction()
      .then((result) => {
        if (!result.ok) {
          setError(result.errors[0]?.message ?? null)
        }
      })
      .catch(() => setError("Could not prepare your order for placement."))
  }, [])

  return (
    <section className="flex flex-col gap-2 rounded-md border border-line bg-cream p-4">
      <h3 className="flex items-center gap-2 font-medium text-brand">
        <CashIcon />
        Cash on delivery
      </h3>

      <p className="text-sm text-muted">
        Pay the rider in cash when your order arrives. Nothing is charged now,
        and we do not ask for card details.
      </p>

      <p className="text-sm text-muted">
        Please keep the exact amount ready if you can — riders do not always
        carry change.
      </p>

      {error && (
        <p role="alert" className="text-sm text-sale">
          {error}
        </p>
      )}
    </section>
  )
}

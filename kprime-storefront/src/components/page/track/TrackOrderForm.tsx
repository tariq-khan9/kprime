"use client"

import { useState, useTransition, type FormEvent } from "react"

import { OrderStatusTimeline } from "@/components/page/track/OrderStatusTimeline"
import { OrderItemsList } from "@/components/shared/OrderItemsList"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { trackOrderAction } from "@/lib/data/track.actions"
import type { TrackedOrder } from "@/lib/data/track"
import { normalizePhone, formatPhoneForDisplay } from "@/lib/identity/phone"
import { formatPKR } from "@/lib/utils/format"

/**
 * Order number and phone, both required.
 *
 * ⚠️ **Both, always.** A phone on its own would make every customer's address
 * and order history readable by anyone with their number (§2.2). The form
 * cannot submit without each field, and the backend refuses the pair anyway —
 * two independent checks, because this is the one that matters.
 *
 * **The error message never changes.** A wrong order number, a wrong phone, and
 * an order that does not exist all produce the same sentence. Saying "that
 * order exists but the phone is wrong" would confirm which numbers are real.
 *
 * The phone is normalised locally only to *show* what will be looked up. The
 * raw string is what gets sent; normalisation for the query happens at the API
 * boundary, not here.
 */
export function TrackOrderForm() {
  const [pending, startTransition] = useTransition()
  const [order, setOrder] = useState<TrackedOrder | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [phone, setPhone] = useState("")

  const normalised = normalizePhone(phone)

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const form = new FormData(event.currentTarget)
    const orderNumber = String(form.get("orderNumber") ?? "").trim()
    const rawPhone = String(form.get("phone") ?? "").trim()

    // Belt and braces with the `required` attributes: a submit that bypassed
    // them must not reach the action with one field missing.
    if (!orderNumber || !rawPhone) {
      setError("Enter both your order number and your phone number.")
      return
    }

    startTransition(async () => {
      const result = await trackOrderAction(orderNumber, rawPhone)

      if (result.ok) {
        setError(null)
        setOrder(result.order)
      } else {
        setOrder(null)
        setError(result.message)
      }
    })
  }

  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-4">
        <Input
          name="orderNumber"
          label="Order number"
          required
          inputMode="numeric"
          placeholder="138"
          hint="The number on your confirmation page."
        />

        <Input
          name="phone"
          label="Phone number"
          required
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="0300 1234567"
          hint={
            normalised
              ? `Looking up ${formatPhoneForDisplay(normalised)}`
              : "The number you gave when ordering."
          }
        />

        {error && (
          <p role="alert" className="text-sm text-sale">
            {error}
          </p>
        )}

        <Button type="submit" variant="primary" disabled={pending} aria-busy={pending}>
          {pending ? "Looking…" : "Find my order"}
        </Button>
      </form>

      {order && (
        <div className="flex flex-col gap-6">
          <div className="rounded-md border border-line bg-paper p-4">
            <p className="text-sm text-muted">Order number</p>
            <p className="text-2xl font-bold tabular-nums text-brand">
              {order.displayId}
            </p>
            {order.shippingMethod && (
              <p className="mt-1 text-sm text-muted">{order.shippingMethod}</p>
            )}
          </div>

          <OrderStatusTimeline order={order} />

          <div className="rounded-md border border-line bg-paper p-4">
            <h2 className="mb-3 font-bold text-brand">What you ordered</h2>
            <OrderItemsList items={order.items} />

            <dl className="mt-4 flex flex-col gap-2 border-t border-line pt-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Subtotal</dt>
                <dd className="text-brand">{formatPKR(order.itemTotal)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Delivery</dt>
                <dd className="text-brand">{formatPKR(order.shippingTotal)}</dd>
              </div>
              <div className="mt-1 flex justify-between gap-4 border-t border-line pt-3">
                <dt className="font-bold text-brand">Total</dt>
                <dd className="font-bold text-brand">{formatPKR(order.total)}</dd>
              </div>
            </dl>
          </div>

          {order.address && (
            <div className="rounded-md border border-line bg-paper p-4">
              <h2 className="mb-2 font-bold text-brand">Delivering to</h2>
              <p className="text-sm text-brand">{order.address.name}</p>
              <p className="text-sm text-muted">{order.address.address1}</p>
              <p className="text-sm text-muted">{order.address.city}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

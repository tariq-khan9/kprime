import Link from "next/link"

import { PaymentStep } from "@/components/page/checkout/PaymentStep"
import type { CheckoutState } from "@/lib/data/checkout"
import type { ShippingOption } from "@/lib/data/shipping"
import { formatPhoneForDisplay } from "@/lib/identity/phone"
import { formatPKR } from "@/lib/utils/format"

export type OrderReviewStepProps = {
  state: CheckoutState
  /** The chosen option, resolved by the page. Null if it vanished. */
  method: ShippingOption | null
  provinceName: string | null
}

function Row({
  label,
  editHref,
  editLabel,
  children,
}: {
  label: string
  editHref: string
  editLabel: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-1 border-b border-line py-4 last:border-b-0">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="font-medium text-brand">{label}</h3>

        {/* Every block is editable. A review someone cannot correct is a
            dead end at the most expensive moment in the flow. */}
        <Link
          href={editHref}
          className="min-h-11 shrink-0 text-sm text-muted underline underline-offset-2 hover:text-brand"
        >
          {editLabel}
        </Link>
      </div>

      <div className="text-sm text-brand">{children}</div>
    </section>
  )
}

/**
 * Read-only recap before placing.
 *
 * Every block links back to the step that owns it, and the values survive the
 * trip because they live on the cart rather than in React state — the step
 * components read them back as defaults (task 114).
 *
 * The phone is shown in the format it was typed in (`0300 1234567`), not the
 * normalised `923001234567` the system stores. The normalised form is an
 * implementation detail; showing it would make people think we got their number
 * wrong.
 */
export function OrderReviewStep({
  state,
  method,
  provinceName,
}: OrderReviewStepProps) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-lg font-bold text-brand">Review your order</h2>

      <div className="rounded-md border border-line bg-paper px-4">
        <Row label="Contact" editHref="/checkout?step=contact" editLabel="Edit">
          <p>{state.contactName}</p>
          <p className="text-muted">
            {state.contactPhone
              ? formatPhoneForDisplay(state.contactPhone)
              : null}
          </p>
          {state.contactEmail && (
            <p className="text-muted">{state.contactEmail}</p>
          )}
        </Row>

        <Row
          label="Delivery address"
          editHref="/checkout?step=address"
          editLabel="Edit"
        >
          <p>{state.address1}</p>
          <p className="text-muted">
            {[state.city, provinceName].filter(Boolean).join(", ")}
          </p>
          {state.landmark && (
            <p className="text-muted">Landmark: {state.landmark}</p>
          )}
          {state.deliveryPhone &&
            state.deliveryPhone !== state.contactPhone && (
              <p className="text-muted">
                Delivery phone: {formatPhoneForDisplay(state.deliveryPhone)}
              </p>
            )}
        </Row>

        <Row
          label="Delivery method"
          editHref="/checkout?step=delivery"
          editLabel="Change"
        >
          {method ? (
            <p>
              {method.name}
              <span className="ml-2 text-muted">{formatPKR(method.amount)}</span>
            </p>
          ) : (
            // The option was removed between choosing it and reaching here.
            <p className="text-sale">
              This delivery option is no longer available. Choose another.
            </p>
          )}
        </Row>
      </div>

      <PaymentStep />
    </div>
  )
}

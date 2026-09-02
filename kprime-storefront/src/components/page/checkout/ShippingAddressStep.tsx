"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition, type FormEvent } from "react"

import { ProvinceCitySelect } from "@/components/page/checkout/ProvinceCitySelect"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { saveAddressAction } from "@/lib/data/checkout.actions"
import type { CheckoutError, CheckoutState } from "@/lib/data/checkout"
import type { Province } from "@/lib/data/shipping"

export type ShippingAddressStepProps = {
  state: CheckoutState
  provinces: Province[]
}

/**
 * Street address, province and city, plus two optional fields.
 *
 * **No postal code (§2.2).** Pakistani couriers route on city and address, not
 * on a code most people do not know. A required field nobody can fill is a
 * drop-off point, and an optional one nobody fills is clutter on a 360px form.
 *
 * The delivery phone is separate from the contact phone on purpose: orders
 * often go to a relative, a shop, or an office. When given it is preserved
 * as-is and used on the shipping address; the contact number stays the
 * identity.
 */
export function ShippingAddressStep({
  state,
  provinces,
}: ShippingAddressStepProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [errors, setErrors] = useState<CheckoutError[]>([])

  const errorFor = (field: string) =>
    errors.find((error) => error.field === field)?.message

  const general = errors.find((error) => !error.field)?.message

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const form = new FormData(event.currentTarget)

    startTransition(async () => {
      const result = await saveAddressAction(
        {
          address1: String(form.get("address1") ?? ""),
          city: String(form.get("city") ?? ""),
          province: String(form.get("province") ?? ""),
          deliveryPhone: String(form.get("deliveryPhone") ?? ""),
          landmark: String(form.get("landmark") ?? ""),
        },
        state.contactName ?? "",
        state.contactPhone ?? ""
      )

      if (result.ok) {
        setErrors([])
        router.push("/checkout?step=delivery")
      } else {
        setErrors(result.errors)
      }
    })
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <h2 className="text-lg font-bold text-brand">Delivery address</h2>

      <Input
        name="address1"
        label="Street address"
        required
        autoComplete="street-address"
        defaultValue={state.address1 ?? ""}
        hint="House or shop number, street, and area."
        error={errorFor("address1")}
      />

      <ProvinceCitySelect
        provinces={provinces}
        defaultProvince={state.province}
        defaultCity={state.city}
        provinceError={errorFor("province")}
        cityError={errorFor("city")}
      />

      <Input
        name="deliveryPhone"
        label="Delivery phone (optional)"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        defaultValue={state.deliveryPhone ?? ""}
        hint="Only if the courier should call someone else at the door."
        error={errorFor("deliveryPhone")}
      />

      <Input
        name="landmark"
        label="Landmark (optional)"
        defaultValue={state.landmark ?? ""}
        hint="Anything that helps the rider find you, like a nearby shop."
        error={errorFor("landmark")}
      />

      {general && (
        <p role="alert" className="text-sm text-sale">
          {general}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="primary" disabled={pending} aria-busy={pending}>
          {pending ? "Saving…" : "Continue to delivery"}
        </Button>

        <Link
          href="/checkout?step=contact"
          className="min-h-11 text-sm text-muted underline underline-offset-2 hover:text-brand"
        >
          Back to your details
        </Link>
      </div>
    </form>
  )
}

"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { Button } from "@/components/ui/Button"
import { RadioGroup } from "@/components/ui/RadioGroup"
import { whatsappLink } from "@/config/site"
import { saveShippingMethodAction } from "@/lib/data/checkout.actions"
import type { ShippingOption } from "@/lib/data/shipping"
import { formatPKR } from "@/lib/utils/format"

export type ShippingMethodStepProps = {
  options: ShippingOption[]
  city: string
  selected: string | null
}

/**
 * Live delivery options for the saved address.
 *
 * **This step cannot render before the address exists** — options resolve
 * against the city's geo zone, so without one Medusa returns nothing and the
 * page would show an empty list that looks broken (§5.1). The checkout page
 * clamps the step, so reaching here means an address is saved.
 *
 * The option name already carries the SLA — "Standard Delivery (2–4 days)" —
 * because it is written once in `setup-shipping-options.ts` and read here. A
 * second table of delivery windows in the storefront would be a copy that could
 * disagree with what the courier is actually paid for.
 *
 * **Zero options is a real answer, not an error.** A city with no zone, or one
 * whose zone lost its options, gets a way out via WhatsApp rather than an empty
 * radio group and a dead end.
 */
export function ShippingMethodStep({
  options,
  city,
  selected,
}: ShippingMethodStepProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [choice, setChoice] = useState(selected ?? options[0]?.id ?? "")
  const [error, setError] = useState<string | null>(null)

  const submit = () => {
    if (!choice) {
      setError("Choose a delivery option.")
      return
    }

    startTransition(async () => {
      const result = await saveShippingMethodAction(choice)

      if (result.ok) {
        setError(null)
        router.push("/checkout?step=review")
      } else {
        setError(result.errors[0]?.message ?? "Could not save that option.")
      }
    })
  }

  if (options.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-bold text-brand">Delivery</h2>

        <div role="alert" className="rounded-md border border-sale bg-paper p-4">
          <p className="font-medium text-sale">
            We cannot deliver to {city} yet
          </p>
          <p className="mt-1 text-sm text-brand">
            Message us on WhatsApp and we will tell you whether we can arrange
            something, or help you pick a nearby city.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" asChild>
            <a
              href={whatsappLink(
                `Hi, I want to order but there is no delivery option for ${city}.`
              )}
              target="_blank"
              rel="noopener noreferrer"
            >
              Message us on WhatsApp
            </a>
          </Button>

          <Link
            href="/checkout?step=address"
            className="min-h-11 text-sm text-muted underline underline-offset-2 hover:text-brand"
          >
            Change address
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-bold text-brand">Delivery</h2>

      <p className="text-sm text-muted">
        Delivering to <span className="text-brand">{city}</span>.
      </p>

      <RadioGroup
        label="Delivery option"
        name="shippingOption"
        value={choice}
        onValueChange={setChoice}
        options={options.map((option) => ({
          value: option.id,
          label: option.name,
          description: formatPKR(option.amount),
        }))}
      />

      {error && (
        <p role="alert" className="text-sm text-sale">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="primary"
          onClick={submit}
          disabled={pending}
          aria-busy={pending}
        >
          {pending ? "Saving…" : "Continue to review"}
        </Button>

        <Link
          href="/checkout?step=address"
          className="min-h-11 text-sm text-muted underline underline-offset-2 hover:text-brand"
        >
          Back to address
        </Link>
      </div>
    </div>
  )
}

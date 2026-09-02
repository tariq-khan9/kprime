"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition, type FormEvent } from "react"

import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { saveContactAction } from "@/lib/data/checkout.actions"
import type { CheckoutError, CheckoutState } from "@/lib/data/checkout"

export type ContactStepProps = {
  state: CheckoutState
}

/**
 * Name, phone, optional email.
 *
 * **The phone is never normalised here.** The raw string goes straight to the
 * action, which normalises it at the API boundary (§2.2). A component that
 * "helpfully" cleaned it first would be a second place the rule could drift.
 *
 * Email is genuinely optional and labelled as such. It never becomes
 * `cart.email` — the synthetic address derived from the phone does. Asking for
 * an email at all is only so we can write to someone who wants that; a required
 * email on a COD checkout is a drop-off point for no gain.
 */
export function ContactStep({ state }: ContactStepProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [errors, setErrors] = useState<CheckoutError[]>([])

  const errorFor = (field: string) =>
    errors.find((error) => error.field === field)?.message

  // Anything without a field is a failure of the whole submit, not one input.
  const general = errors.find((error) => !error.field)?.message

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const form = new FormData(event.currentTarget)

    startTransition(async () => {
      const result = await saveContactAction({
        name: String(form.get("name") ?? ""),
        phone: String(form.get("phone") ?? ""),
        email: String(form.get("email") ?? ""),
      })

      if (result.ok) {
        setErrors([])
        router.push("/checkout?step=address")
      } else {
        setErrors(result.errors)
      }
    })
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <h2 className="text-lg font-bold text-brand">Your details</h2>

      <Input
        name="name"
        label="Full name"
        required
        autoComplete="name"
        defaultValue={state.contactName ?? ""}
        error={errorFor("name")}
      />

      <Input
        name="phone"
        label="Mobile number"
        required
        // A phone keypad, not a full keyboard. `tel` also lets the browser
        // offer a saved number.
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        defaultValue={state.contactPhone ?? ""}
        hint="We call this number to confirm your order."
        error={errorFor("phone")}
      />

      <Input
        name="email"
        label="Email (optional)"
        type="email"
        inputMode="email"
        autoComplete="email"
        defaultValue={state.contactEmail ?? ""}
        hint="Only if you want written updates. We confirm by phone either way."
        error={errorFor("email")}
      />

      {general && (
        <p role="alert" className="text-sm text-sale">
          {general}
        </p>
      )}

      <Button type="submit" variant="primary" disabled={pending} aria-busy={pending}>
        {pending ? "Saving…" : "Continue to address"}
      </Button>
    </form>
  )
}

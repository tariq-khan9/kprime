"use client"

import { useState, useTransition, type FormEvent } from "react"

import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { sendContactAction } from "@/lib/data/contact.actions"
import { cn } from "@/lib/utils/format"

/**
 * The contact form.
 *
 * **Phone required, email optional** — the same shape as checkout, and for the
 * same reason: this shop answers on WhatsApp and by phone, so a number is what
 * actually lets us reply.
 *
 * WhatsApp is offered first on the page above; this is the fallback for people
 * who would rather write than message.
 */
export function ContactForm({ className }: { className?: string }) {
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(
    null
  )

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const form = new FormData(event.currentTarget)
    const name = String(form.get("name") ?? "").trim()
    const phone = String(form.get("phone") ?? "").trim()
    const message = String(form.get("message") ?? "").trim()

    if (!name || !phone || !message) {
      setResult({
        ok: false,
        message: "Please give your name, phone number and a message.",
      })
      return
    }

    startTransition(async () => {
      setResult(
        await sendContactAction({
          name,
          phone,
          email: String(form.get("email") ?? "").trim() || undefined,
          message,
        })
      )
    })
  }

  // The form is replaced rather than kept: leaving the fields filled invites a
  // second identical message.
  if (result?.ok) {
    return (
      <div
        role="status"
        className={cn(
          "rounded-md border border-success bg-cream p-4",
          className
        )}
      >
        <p className="font-medium text-success">Message sent</p>
        <p className="mt-1 text-sm text-brand">{result.message}</p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} noValidate className={cn("flex flex-col gap-4", className)}>
      <Input name="name" label="Your name" required autoComplete="name" />

      <Input
        name="phone"
        label="Phone number"
        required
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        hint="So we can reply on WhatsApp or call you back."
      />

      <Input
        name="email"
        label="Email (optional)"
        type="email"
        inputMode="email"
        autoComplete="email"
      />

      <div className="flex flex-col gap-1">
        <label htmlFor="contact-message" className="text-sm font-medium text-brand">
          Message
        </label>
        <textarea
          id="contact-message"
          name="message"
          rows={5}
          required
          maxLength={4000}
          // text-base: below 16px iOS zooms on focus and does not zoom back.
          className={cn(
            "w-full rounded-md border border-line bg-paper p-3 text-base text-brand",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          )}
        />
      </div>

      {result && !result.ok && (
        <p role="alert" className="text-sm text-sale">
          {result.message}
        </p>
      )}

      <Button type="submit" variant="primary" disabled={pending} aria-busy={pending}>
        {pending ? "Sending…" : "Send message"}
      </Button>
    </form>
  )
}

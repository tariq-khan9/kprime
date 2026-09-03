"use client"

import { useState, useTransition, type FormEvent } from "react"

import { StarRating } from "@/components/shared/StarRating"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { submitReviewAction } from "@/lib/data/reviews.actions"
import { cn } from "@/lib/utils/format"

export type ReviewFormProps = {
  productId: string
  /** Prefilled when the form is opened from a tracked order. */
  defaultOrderNumber?: string
  defaultPhone?: string
  className?: string
}

/**
 * Write a review.
 *
 * **Credentials, not an account.** There are no logins (§2.2), so the order
 * number and phone are how someone proves they bought this — the same pair
 * `/track` uses. Opened from a tracked order both are prefilled, which is the
 * path most people will take; typed in directly it still works for someone who
 * has their receipt to hand.
 *
 * **Success is honest about moderation.** The review is created `pending` and
 * the message says so. Showing it on the page immediately, then having it
 * disappear on reload, is worse than a short wait — and every rejection message
 * comes from the backend, so "your order has not been delivered yet" reaches
 * the person who needs to read it rather than being flattened into a generic
 * failure.
 */
export function ReviewForm({
  productId,
  defaultOrderNumber,
  defaultPhone,
  className,
}: ReviewFormProps) {
  const [pending, startTransition] = useTransition()
  const [rating, setRating] = useState(0)
  const [result, setResult] = useState<
    { ok: boolean; message: string } | null
  >(null)

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const form = new FormData(event.currentTarget)

    if (rating < 1) {
      setResult({ ok: false, message: "Choose a rating from one to five stars." })
      return
    }

    startTransition(async () => {
      const response = await submitReviewAction({
        productId,
        orderNumber: String(form.get("orderNumber") ?? "").trim(),
        // Raw, as typed. Normalised at the API boundary (§2.2).
        phone: String(form.get("phone") ?? "").trim(),
        rating,
        title: String(form.get("title") ?? "").trim() || undefined,
        content: String(form.get("content") ?? "").trim() || undefined,
      })

      setResult(response)
    })
  }

  // Kept on screen instead of the form: re-showing the fields invites a second
  // submission, which the backend would reject as a duplicate anyway.
  if (result?.ok) {
    return (
      <div
        role="status"
        className={cn(
          "rounded-md border border-success bg-cream p-4 text-center",
          className
        )}
      >
        <p className="font-medium text-success">Thank you</p>
        <p className="mt-1 text-sm text-brand">{result.message}</p>
        <p className="mt-2 text-sm text-muted">
          We read every review before it goes up, so it will not appear straight
          away.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} noValidate className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-brand">Your rating</span>
        <StarRating
          value={rating}
          interactive
          onChange={setRating}
          label="Your rating"
        />
      </div>

      <Input
        name="orderNumber"
        label="Order number"
        required
        inputMode="numeric"
        defaultValue={defaultOrderNumber}
        hint="From your confirmation page. It proves you bought this."
      />

      <Input
        name="phone"
        label="Phone number"
        required
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        defaultValue={defaultPhone}
        hint="The number you ordered with."
      />

      <Input name="title" label="Title (optional)" maxLength={80} />

      <div className="flex flex-col gap-1">
        <label htmlFor="review-content" className="text-sm font-medium text-brand">
          Your review (optional)
        </label>
        <textarea
          id="review-content"
          name="content"
          rows={4}
          maxLength={2000}
          // text-base, like every other field: below 16px iOS zooms on focus
          // and does not zoom back out.
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
        {pending ? "Submitting…" : "Submit review"}
      </Button>
    </form>
  )
}

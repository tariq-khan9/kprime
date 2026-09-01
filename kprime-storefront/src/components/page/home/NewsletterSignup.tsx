"use client"

import { useState, type FormEvent } from "react"

import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { useToast } from "@/components/ui/Toast"
import { cn } from "@/lib/utils/format"

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Email capture.
 *
 * Validation errors render inline under the field, not as a toast — the task is
 * explicit about that, and rightly: a toast about a field you are looking at
 * disappears before you have finished reading it, and does not point at the
 * input that needs fixing. Toasts are for the outcome of the submit.
 *
 * Copy promises nothing. No discount code is offered, because none is sent.
 */
export function NewsletterSignup({ className }: { className?: string }) {
  const { toast } = useToast()
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const value = email.trim()

    if (!EMAIL.test(value)) {
      setError("Enter a valid email address.")
      return
    }

    setError(null)
    setLoading(true)

    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: value }),
      })

      const body = await response.json().catch(() => ({}))

      if (response.ok) {
        setEmail("")
        toast({
          title: body.alreadySubscribed
            ? "You're already on the list"
            : "Thanks — you're subscribed",
          variant: "success",
        })
        return
      }

      // 503 means the Brevo credentials are missing. Surfaced honestly rather
      // than as a generic failure, so it is obvious this is configuration and
      // not the visitor's fault.
      if (response.status === 503) {
        toast({
          title: "Newsletter isn't connected yet",
          description: "Nothing was saved. This is a setup step, not your error.",
          variant: "error",
        })
        return
      }

      if (response.status === 400) {
        setError(body.error ?? "Enter a valid email address.")
        return
      }

      toast({ title: body.error ?? "Something went wrong.", variant: "error" })
    } catch {
      toast({ title: "Could not reach the server.", variant: "error" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <section
      aria-labelledby="newsletter"
      className={cn("w-full rounded-lg bg-cream p-6 sm:p-8", className)}
    >
      <div className="mx-auto max-w-xl text-center">
        <h2 id="newsletter" className="text-lg font-bold sm:text-xl">
          New arrivals, now and then
        </h2>
        <p className="mt-1 text-muted">
          Occasional email when something worth knowing about lands. No spam.
        </p>

        {/* Stacked at 360px so the input gets full width; inline from sm.
            items-start keeps the button aligned to the input rather than
            jumping when the inline error appears below it. */}
        <form
          onSubmit={submit}
          noValidate
          className="mt-5 flex flex-col items-start gap-3 sm:flex-row"
        >
          <Input
            type="email"
            inputMode="email"
            autoComplete="email"
            aria-label="Email address"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (error) setError(null)
            }}
            error={error ?? undefined}
            className="text-left"
          />
          <Button type="submit" loading={loading} className="w-full sm:w-auto">
            Subscribe
          </Button>
        </form>
      </div>
    </section>
  )
}

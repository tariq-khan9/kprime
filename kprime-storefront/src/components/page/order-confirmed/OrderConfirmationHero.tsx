"use client"

import { useState } from "react"

import { useToast } from "@/components/ui/Toast"
import { cn } from "@/lib/utils/format"

function CheckMark() {
  return (
    <span className="flex size-12 items-center justify-center rounded-full bg-success text-paper">
      <svg viewBox="0 0 24 24" fill="none" aria-hidden className="size-7">
        <path
          d="M5 12.5l4.5 4.5L19 7.5"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden className="size-4">
      <rect
        x="7"
        y="7"
        width="9"
        height="9"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M13 7V5.5A1.5 1.5 0 0011.5 4h-6A1.5 1.5 0 004 5.5v6A1.5 1.5 0 005.5 13H7"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  )
}

export type OrderConfirmationHeroProps = {
  orderNumber: number
  className?: string
}

/**
 * The top of the only receipt this shop issues.
 *
 * **The order number is the largest text on the page.** There is no email and
 * no SMS (§2.2) — someone who closes this tab has nothing but what they wrote
 * down or screenshotted, and the number is what they will be asked for on the
 * phone. It outranks the headline deliberately.
 *
 * **Green here is a status marker, not a call to action** (§2.3). It is the
 * tick, and nothing else on the page is green.
 *
 * The copy: "received", never "confirmed" or "dispatching". A human rings to
 * verify afterwards, and that call must not contradict this page.
 */
export function OrderConfirmationHero({
  orderNumber,
  className,
}: OrderConfirmationHeroProps) {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(String(orderNumber))
      setCopied(true)
      toast({ title: "Order number copied", variant: "success" })

      // Reverts so the control does not read "Copied" forever, which would stop
      // it looking like something you can press again.
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard access can be refused — an insecure origin, or a browser that
      // asks. The number is still on screen and selectable, so this is a
      // downgrade rather than a failure.
      toast({
        title: "Could not copy",
        description: "Long-press the number to copy it.",
        variant: "error",
      })
    }
  }

  return (
    <div className={cn("flex flex-col items-center gap-3 text-center", className)}>
      <CheckMark />

      <h1 className="text-xl font-bold text-brand sm:text-2xl">
        We have received your order
      </h1>

      <div className="flex flex-col items-center gap-1">
        <span className="text-sm uppercase tracking-wide text-muted">
          Order number
        </span>

        <button
          type="button"
          onClick={copy}
          aria-label={`Order number ${orderNumber}. Tap to copy.`}
          className={cn(
            "flex min-h-11 items-center gap-3 rounded-md px-3 py-1",
            "hover:bg-cream focus-visible:outline-none focus-visible:ring-2",
            "focus-visible:ring-brand"
          )}
        >
          {/* The biggest thing on the page, by design. */}
          <span className="text-4xl font-bold tabular-nums text-brand sm:text-5xl">
            {orderNumber}
          </span>

          <span className="flex items-center gap-1 text-sm text-muted">
            <CopyIcon />
            {copied ? "Copied" : "Copy"}
          </span>
        </button>
      </div>

      <p className="max-w-md text-muted">
        We will call you to confirm before we dispatch. You pay the rider in
        cash when it arrives.
      </p>
    </div>
  )
}

import { cn } from "@/lib/utils/format"

/**
 * The four checkout steps, in order.
 *
 * Payment is not one of them. It is cash on delivery with no choice to make, so
 * a step that only said "you will pay the courier" would be a click for
 * nothing — it is shown inside Review instead (§4.10).
 */
export const CHECKOUT_STEPS = [
  { id: "contact", label: "Contact" },
  { id: "address", label: "Address" },
  { id: "delivery", label: "Delivery" },
  { id: "review", label: "Review" },
] as const

export type CheckoutStepId = (typeof CHECKOUT_STEPS)[number]["id"]

function Tick() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden className="size-4">
      <path
        d="M5 10.5l3.5 3.5L15 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export type CheckoutStepperProps = {
  current: CheckoutStepId
  className?: string
}

/**
 * Progress through checkout.
 *
 * Three states, and the difference has to survive a bright phone screen: a
 * completed step gets a filled navy circle with a tick, the current one a navy
 * ring and navy text, an upcoming one stays muted. Never amber — amber means
 * "act on this", and the only thing to act on is the button below.
 *
 * Completed steps show a tick rather than their number, so "done" reads at a
 * glance instead of making someone compare digits against their position.
 */
export function CheckoutStepper({ current, className }: CheckoutStepperProps) {
  const currentIndex = CHECKOUT_STEPS.findIndex((step) => step.id === current)

  return (
    <nav aria-label="Checkout progress" className={className}>
      <ol className="flex items-center gap-1 sm:gap-2">
        {CHECKOUT_STEPS.map((step, i) => {
          const done = i < currentIndex
          const active = i === currentIndex

          return (
            <li key={step.id} className="flex min-w-0 flex-1 items-center gap-2">
              <span
                aria-current={active ? "step" : undefined}
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full",
                  "text-xs font-bold transition-colors",
                  done && "bg-brand text-paper",
                  active && "border-2 border-brand text-brand",
                  !done && !active && "border border-line text-muted"
                )}
              >
                {done ? <Tick /> : i + 1}
                <span className="sr-only">
                  {done ? " completed" : active ? " current step" : " upcoming"}
                </span>
              </span>

              <span
                className={cn(
                  "truncate text-sm",
                  // Hidden on the narrowest screens, where four labels would
                  // wrap or truncate to nothing useful. The numbered circles
                  // still convey position.
                  "hidden sm:inline",
                  active ? "font-medium text-brand" : "text-muted"
                )}
              >
                {step.label}
              </span>

              {i < CHECKOUT_STEPS.length - 1 && (
                <span
                  aria-hidden
                  className={cn(
                    "h-px min-w-4 flex-1",
                    done ? "bg-brand" : "bg-line"
                  )}
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

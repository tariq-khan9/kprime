import type { DeliveryState, TrackedOrder } from "@/lib/data/track"
import { cn } from "@/lib/utils/format"

/**
 * The four states an order moves through.
 *
 * "Confirmed" is the verification phone call, not a system event — this shop
 * rings every COD order before dispatch, so it is a real step a customer
 * experiences and belongs on the timeline.
 */
const STEPS: { state: DeliveryState | "confirmed"; label: string; hint: string }[] = [
  { state: "processing", label: "Placed", hint: "We have your order" },
  { state: "confirmed", label: "Confirmed", hint: "We called to confirm" },
  { state: "shipped", label: "Shipped", hint: "With the courier" },
  { state: "delivered", label: "Delivered", hint: "Paid on delivery" },
]

/** How far along the timeline a delivery state sits. */
function reachedIndex(state: DeliveryState): number {
  switch (state) {
    case "delivered":
      return 3
    case "shipped":
      return 2
    default:
      // "Placed" only. Confirmation is a phone call the system cannot observe,
      // so it is never auto-marked — claiming we called when we did not would
      // be worse than showing less progress.
      return 0
  }
}

function Tick() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden className="size-4">
      <path
        d="M5 10.5l3.5 3.5L15 7"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function OrderStatusTimeline({
  order,
  className,
}: {
  order: TrackedOrder
  className?: string
}) {
  if (order.deliveryState === "canceled") {
    return (
      <div
        role="status"
        className={cn("rounded-md border border-sale bg-paper p-4", className)}
      >
        <p className="font-medium text-sale">This order was cancelled</p>
        <p className="mt-1 text-sm text-muted">
          If that is unexpected, message us on WhatsApp with your order number.
        </p>
      </div>
    )
  }

  const reached = reachedIndex(order.deliveryState)

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <ol className="flex flex-col">
        {STEPS.map((step, i) => {
          const done = i <= reached
          const current = i === reached

          return (
            <li key={step.label} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  aria-hidden
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    done
                      ? "bg-success text-paper"
                      : "border border-line text-muted"
                  )}
                >
                  {done ? <Tick /> : i + 1}
                </span>

                {i < STEPS.length - 1 && (
                  <span
                    aria-hidden
                    className={cn(
                      "w-px flex-1",
                      i < reached ? "bg-success" : "bg-line"
                    )}
                  />
                )}
              </div>

              <div className={cn("pb-6", i === STEPS.length - 1 && "pb-0")}>
                <p
                  className={cn(
                    "font-medium",
                    current ? "text-brand" : done ? "text-brand" : "text-muted"
                  )}
                >
                  {step.label}
                  {current && (
                    <span className="ml-2 text-xs font-normal text-success">
                      Current
                    </span>
                  )}
                </p>
                <p className="text-sm text-muted">{step.hint}</p>
              </div>
            </li>
          )
        })}
      </ol>

      {/* Only when a fulfilment actually exists. An empty tracking block on an
          unshipped order reads as a system that has lost the parcel. */}
      {order.tracking && (
        <div className="rounded-md border border-line bg-cream p-4">
          <h3 className="font-medium text-brand">Courier tracking</h3>

          <dl className="mt-2 flex flex-col gap-1 text-sm">
            {order.tracking.carrier && (
              <div className="flex gap-2">
                <dt className="text-muted">Carrier</dt>
                <dd className="text-brand">{order.tracking.carrier}</dd>
              </div>
            )}

            <div className="flex gap-2">
              <dt className="text-muted">Tracking number</dt>
              <dd className="break-all font-medium text-brand">
                {order.tracking.number}
              </dd>
            </div>
          </dl>

          {order.tracking.url && (
            <a
              href={order.tracking.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block min-h-11 text-sm text-brand underline underline-offset-2"
            >
              Track on the courier&rsquo;s site
            </a>
          )}
        </div>
      )}
    </div>
  )
}

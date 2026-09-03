import { DELIVERY_ZONES, RETURNS_WINDOW_DAYS } from "@/config/policies"
import { cn } from "@/lib/utils/format"

/**
 * Zones come from `config/policies.ts`, which the shipping page, the FAQ and
 * the returns page all read too — so this box and those pages cannot disagree
 * about a delivery window (§5.1).
 */
function TruckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="size-5 shrink-0">
      <path d="M2 7h11v9H2z" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M13 10h4l3 3v3h-7z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="7" cy="18" r="1.6" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="17" cy="18" r="1.6" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

function CashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="size-5 shrink-0">
      <rect x="2" y="6" width="20" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

function ReturnIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="size-5 shrink-0">
      <path
        d="M4 12a8 8 0 0111.6-7.1L20 4l-1 4.2M20 12a8 8 0 01-11.6 7.1L4 20l1-4.2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

export type DeliveryEstimateBoxProps = {
  /** Hides the per-city table on the confirmation page, where the city is known. */
  compact?: boolean
  className?: string
}

/**
 * COD availability, delivery windows and the returns note.
 *
 * **No free-delivery claim anywhere.** Delivery is charged per zone and
 * CLAUDE.md rules a threshold out of v1; promising free shipping here and then
 * adding a charge at checkout is the fastest way to lose a COD order.
 *
 * Windows are stated per zone rather than as one number, because they genuinely
 * differ by a factor of four across the country and a single "2–5 days" would
 * be wrong for both Peshawar and Gilgit.
 *
 * Reused on the order confirmation page (Block M).
 */
export function DeliveryEstimateBox({
  compact = false,
  className,
}: DeliveryEstimateBoxProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-md border border-line bg-cream p-4",
        className
      )}
    >
      <p className="flex items-center gap-2 text-sm font-medium text-brand">
        <CashIcon />
        Cash on delivery available across Pakistan
      </p>

      <div className="flex items-start gap-2 text-sm text-brand">
        <TruckIcon />
        <div className="flex min-w-0 flex-col gap-1">
          <p className="font-medium">Delivery</p>

          {compact ? (
            <p className="text-muted">1–8 days depending on your city.</p>
          ) : (
            <ul className="flex flex-col gap-0.5 text-muted">
              {DELIVERY_ZONES.map((zone) => (
                <li key={zone.name} className="flex flex-wrap gap-x-2">
                  <span>{zone.name}</span>
                  <span className="text-brand">{zone.standard}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Stated plainly rather than buried: a shopper deciding on COD is
              entitled to know delivery is charged before they commit. */}
          <p className="text-muted">Delivery charges are shown at checkout.</p>
        </div>
      </div>

      <p className="flex items-start gap-2 text-sm text-muted">
        <ReturnIcon />
        <span>
          Damaged or wrong item? Tell us within {RETURNS_WINDOW_DAYS} days of
          delivery and we will replace it.
        </span>
      </p>
    </div>
  )
}

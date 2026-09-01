import { cn } from "@/lib/utils/format"

const ICON = "size-6 shrink-0 text-brand"

function CashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={ICON}>
      <rect x="2" y="6" width="20" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

function TruckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={ICON}>
      <path d="M2 7h11v9H2z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M13 10h4l3 3v3h-7z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="7" cy="18" r="1.6" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="17" cy="18" r="1.6" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

function ReturnIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={ICON}>
      <path
        d="M4 9h11a5 5 0 010 10h-4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path d="M7 5L3.5 9 7 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={ICON}>
      <path
        d="M20 12a8 8 0 11-3.2-6.4M20 12a8 8 0 01-11.6 7.1L4 20l1-4.2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * Reassurance row. Used on home, cart and the checkout layout.
 *
 * Copy states only what the configuration actually delivers — the delivery
 * window matches the shipping option names from task 6, and there is no
 * free-delivery claim because every zone charges.
 */
const ITEMS = [
  { icon: <CashIcon />, title: "Cash on delivery", note: "Pay when it arrives" },
  { icon: <TruckIcon />, title: "2–5 day delivery", note: "Nationwide" },
  { icon: <ReturnIcon />, title: "Easy returns", note: "Contact us within 7 days" },
  { icon: <ChatIcon />, title: "WhatsApp support", note: "We reply quickly" },
]

export function TrustStrip({ className }: { className?: string }) {
  return (
    <section
      aria-label="Why shop with us"
      className={cn("w-full border-y border-line bg-cream", className)}
    >
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* 2x2 at 360px — four across would give each item ~80px, too narrow
            for the label to sit beside its icon. One row from lg. */}
        <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
          {ITEMS.map((item) => (
            <li key={item.title} className="flex items-start gap-3">
              {item.icon}
              <div className="flex min-w-0 flex-col">
                <span className="font-medium text-brand">{item.title}</span>
                <span className="text-sm text-muted">{item.note}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

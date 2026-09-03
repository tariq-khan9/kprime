import { Breadcrumbs } from "@/components/layout/Breadcrumbs"
import { Container } from "@/components/layout/Container"
import { TrackOrderForm } from "@/components/page/track/TrackOrderForm"
import { whatsappLink } from "@/config/site"

/**
 * Order tracking for guests.
 *
 * There are no accounts (§2.2), so this and the confirmation page are the only
 * two ways back to an order. Both require something only the buyer has: the
 * confirmation page needs the unguessable order id, this needs the order number
 * *and* the phone.
 *
 * Dynamic — the result depends entirely on what is submitted, and nothing here
 * should ever be cached or prerendered with someone's order in it.
 */
export const dynamic = "force-dynamic"

export const metadata = {
  title: "Track your order",
}

export default function TrackPage() {
  return (
    <Container className="py-6">
      <Breadcrumbs
        items={[{ label: "Home", href: "/" }, { label: "Track order" }]}
      />

      <div className="mx-auto mt-4 max-w-xl">
        <h1 className="text-2xl font-bold sm:text-3xl">Track your order</h1>

        <p className="mt-2 text-muted">
          Enter your order number and the phone number you gave when ordering.
          We ask for both so nobody else can see your order.
        </p>

        <TrackOrderForm />

        <p className="mt-8 text-sm text-muted">
          Lost your order number?{" "}
          <a
            href={whatsappLink("Hi, I cannot find my order number.")}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand underline underline-offset-2"
          >
            Message us on WhatsApp
          </a>{" "}
          and we will find it for you.
        </p>
      </div>
    </Container>
  )
}

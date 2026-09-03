import Link from "next/link"
import { notFound } from "next/navigation"

import { Container } from "@/components/layout/Container"
import { DeliveryEstimateBox } from "@/components/page/product/DeliveryEstimateBox"
import { OrderConfirmationHero } from "@/components/page/order-confirmed/OrderConfirmationHero"
import { OrderItemsList } from "@/components/shared/OrderItemsList"
import { Button } from "@/components/ui/Button"
import { WHATSAPP_NUMBER, whatsappLink } from "@/config/site"
import { getOrder } from "@/lib/data/orders"
import { formatPhoneForDisplay } from "@/lib/identity/phone"
import { formatPKR } from "@/lib/utils/format"

/**
 * The order receipt.
 *
 * ⚠️ **This is the only receipt a customer gets.** No email, no SMS (§2.2). If
 * they close this tab without a screenshot they have nothing, so everything
 * they might need later is on one screen: the order number, what they bought,
 * what they will pay, when it arrives, and how to reach us. It is deliberately
 * over-built relative to how a confirmation page usually looks.
 *
 * That is also why the screenshot prompt is near the top rather than buried at
 * the bottom — it has to be read before someone navigates away.
 *
 * Dynamic and uncached: an order belongs to one person.
 *
 * Safe to open with only the id because order ids are ULIDs, not sequential.
 * The *display* number is sequential, which is exactly why `/track` demands a
 * phone number alongside it (task 118).
 */
export const dynamic = "force-dynamic"

export const metadata = {
  title: "Order received",
}

function Panel({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-md border border-line bg-paper p-4">
      <h2 className="mb-3 font-bold text-brand">{title}</h2>
      {children}
    </section>
  )
}

export default async function OrderConfirmedPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const order = await getOrder(id)

  if (!order) {
    notFound()
  }

  return (
    <Container className="py-8">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <OrderConfirmationHero orderNumber={order.displayId} />

        {/* Above the fold on a phone, not at the bottom. Someone who scrolls
            past it and closes the tab has lost their only copy. */}
        <p
          role="note"
          className="rounded-md border border-action bg-cream p-4 text-center font-medium text-brand"
        >
          Please screenshot this page. It is your only receipt — we do not send
          an email or SMS.
        </p>

        <Panel title="What you ordered">
          <OrderItemsList items={order.items} />

          <dl className="mt-4 flex flex-col gap-2 border-t border-line pt-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Subtotal</dt>
              <dd className="text-brand">{formatPKR(order.itemTotal)}</dd>
            </div>

            <div className="flex justify-between gap-4">
              <dt className="text-muted">
                Delivery
                {order.shippingMethod && (
                  <span className="ml-1 text-brand">
                    · {order.shippingMethod}
                  </span>
                )}
              </dt>
              <dd className="text-brand">{formatPKR(order.shippingTotal)}</dd>
            </div>

            {order.discountTotal > 0 && (
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Discount</dt>
                <dd className="text-sale">
                  −{formatPKR(order.discountTotal)}
                </dd>
              </div>
            )}

            <div className="mt-1 flex justify-between gap-4 border-t border-line pt-3">
              <dt className="font-bold text-brand">Total to pay in cash</dt>
              <dd className="font-bold text-brand">{formatPKR(order.total)}</dd>
            </div>
          </dl>
        </Panel>

        {order.address && (
          <Panel title="Delivering to">
            <div className="text-sm text-brand">
              <p>{order.address.name}</p>
              <p className="text-muted">{order.address.address1}</p>
              <p className="text-muted">{order.address.city}</p>
              {order.address.phone && (
                <p className="text-muted">
                  {formatPhoneForDisplay(order.address.phone)}
                </p>
              )}
            </div>
          </Panel>
        )}

        <DeliveryEstimateBox compact />

        <Panel title="Any questions?">
          <p className="text-sm text-muted">
            Message us on WhatsApp with your order number and we will help.
          </p>

          <p className="mt-2 text-sm">
            <span className="text-muted">WhatsApp: </span>
            {/* Written out as text, not only as a link, so it survives a
                screenshot — a tapped link is useless in a picture. */}
            <span className="font-medium text-brand">
              {formatPhoneForDisplay(WHATSAPP_NUMBER)}
            </span>
          </p>

          <Button variant="secondary" asChild className="mt-3">
            <a
              href={whatsappLink(
                `Hi, I have a question about order ${order.displayId}.`
              )}
              target="_blank"
              rel="noopener noreferrer"
            >
              Message us on WhatsApp
            </a>
          </Button>
        </Panel>

        <div className="flex flex-wrap justify-center gap-3">
          <Button variant="primary" asChild>
            <Link href="/">Continue shopping</Link>
          </Button>

          <Button variant="secondary" asChild>
            <Link href="/track">Track this order</Link>
          </Button>
        </div>
      </div>
    </Container>
  )
}

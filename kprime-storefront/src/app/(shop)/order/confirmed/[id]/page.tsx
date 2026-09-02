import Link from "next/link"

import { Container } from "@/components/layout/Container"
import { Button } from "@/components/ui/Button"

/**
 * Order confirmation.
 *
 * A placeholder that exists so task 112's redirect lands somewhere real. Block M
 * (tasks 115–118) builds the receipt: items, totals, delivery estimate, the
 * WhatsApp number and the "screenshot this" prompt.
 *
 * Dynamic — the order id comes from the URL and the page is per-order.
 *
 * The copy is already the soft version (§2.2): "received", never "confirmed" or
 * "dispatching", because a human still rings to verify and that call must not
 * contradict this page.
 */
export const dynamic = "force-dynamic"

export const metadata = {
  title: "Order received",
}

export default async function OrderConfirmedPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <Container className="py-10">
      <div className="mx-auto flex max-w-xl flex-col gap-4 text-center">
        <h1 className="text-2xl font-bold sm:text-3xl">
          We have received your order
        </h1>

        <p className="text-muted">
          Please screenshot this page. We will call you to confirm before we
          dispatch, and you pay the rider in cash when it arrives.
        </p>

        <p className="rounded-md border border-line bg-cream p-4 text-sm">
          <span className="text-muted">Order reference</span>
          <br />
          <span className="break-all font-bold text-brand">{id}</span>
        </p>

        <p className="text-sm text-muted">
          The full receipt lands in Block M.
        </p>

        <Button variant="secondary" asChild className="mx-auto">
          <Link href="/">Continue shopping</Link>
        </Button>
      </div>
    </Container>
  )
}

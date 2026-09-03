import Link from "next/link"

import { Prose } from "@/components/page/content/Prose"
import { RETURNS_WINDOW_DAYS } from "@/config/policies"
import { SITE } from "@/config/site"

export const metadata = {
  title: "Terms",
  description: "The terms you agree to when you order from us.",
}

export default function TermsPage() {
  return (
    <Prose
      title="Terms"
      intro="Plain terms for a cash-on-delivery shop."
    >
      <h2>Who we are</h2>
      <p>
        {SITE.name}, an online shop trading from Karkhano Market, Peshawar,
        delivering across Pakistan.
      </p>

      <h2>Placing an order</h2>
      <p>
        Placing an order is a request to buy, not a completed sale. The sale is
        made when we confirm it with you by phone and dispatch it. We may
        decline an order — if the item has sold out, if we cannot deliver to the
        address, or if we cannot reach you to confirm.
      </p>

      <h2>Prices</h2>
      <p>
        All prices are in Pakistani rupees and include any tax that applies.
        Delivery is charged separately and shown at checkout before you place
        the order.
      </p>
      <p>
        We try hard to keep prices and stock accurate. If something is listed at
        an obviously wrong price, we will contact you rather than simply
        cancelling, and you decide whether to go ahead.
      </p>

      <h2>Paying</h2>
      <p>
        Orders are paid in cash to the rider on delivery. We do not take card
        payments and will never ask you for card or bank details — if anyone
        claiming to be us does, it is not us.
      </p>

      <h2>Delivery</h2>
      <p>
        Delivery times on the{" "}
        <Link href="/shipping-and-delivery">shipping page</Link> are estimates
        from dispatch, not guarantees. Couriers are occasionally delayed by
        weather, strikes or road closures, and that is outside our control.
      </p>
      <p>
        If nobody is available to receive the parcel, the courier will normally
        try again. Repeated failed attempts may mean the order is returned to
        us.
      </p>

      <h2>Refusing a parcel</h2>
      <p>
        You may refuse a parcel at the door. Please only do so if something is
        genuinely wrong — every refused cash-on-delivery parcel costs the shop
        the courier charge both ways, and it is why some shops stop offering COD
        altogether.
      </p>

      <h2>Returns</h2>
      <p>
        Covered in full on the{" "}
        <Link href="/returns-and-refunds">returns and refunds</Link> page. In
        short: tell us within {RETURNS_WINDOW_DAYS} days if something is
        damaged, wrong or not as described.
      </p>

      <h2>Reviews</h2>
      <p>
        Only customers with a delivered order can review the product they
        bought. We read every review before publishing it and will not publish
        abuse, or anything containing someone&rsquo;s personal details. We do not
        remove a review for being critical.
      </p>

      <h2>Your details</h2>
      <p>
        How we handle your name, number and address is set out on the{" "}
        <Link href="/privacy">privacy page</Link>.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms. The version on this page at the time you
        place an order is the one that applies to it.
      </p>
    </Prose>
  )
}

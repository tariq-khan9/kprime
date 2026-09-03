import Link from "next/link"

import { Prose } from "@/components/page/content/Prose"
import { Accordion } from "@/components/ui/Accordion"
import {
  DELIVERY_ZONES,
  EXPRESS_RATE,
  RETURNS_WINDOW_DAYS,
  STANDARD_RATE,
} from "@/config/policies"
import { formatPKR } from "@/lib/utils/format"

export const metadata = {
  title: "Frequently asked questions",
  description:
    "Ordering, cash on delivery, delivery times and returns, answered.",
}

/**
 * Grouped by what someone is actually worried about, in the order they worry
 * about it: how do I order, what does it cost, when does it come, what if it is
 * wrong.
 *
 * **Every number here comes from `config/policies.ts`** — the same source the
 * shipping page and the product delivery box read. That is what task 139's
 * "factually consistent with the shipping and returns pages" requires, and
 * hardcoding them here is exactly how that consistency would quietly break.
 */
function Group({
  heading,
  items,
}: {
  heading: string
  items: { q: string; a: React.ReactNode }[]
}) {
  return (
    <section className="mt-2">
      <h2>{heading}</h2>
      <Accordion
        type="multiple"
        items={items.map((item, i) => ({
          value: `${heading}-${i}`,
          trigger: item.q,
          content: <div className="flex flex-col gap-2">{item.a}</div>,
        }))}
      />
    </section>
  )
}

export default function FaqPage() {
  const fastest = DELIVERY_ZONES[0]
  const slowest = DELIVERY_ZONES[DELIVERY_ZONES.length - 1]

  return (
    <Prose title="Frequently asked questions">
      <Group
        heading="Ordering"
        items={[
          {
            q: "Do I need an account?",
            a: (
              <p>
                No. There are no accounts. You order with your name, phone
                number and address, and you can check on your order later using
                your order number and the same phone number on the{" "}
                <Link href="/track">tracking page</Link>.
              </p>
            ),
          },
          {
            q: "Do I have to give an email address?",
            a: (
              <p>
                No. Email is optional. We confirm everything by phone and
                WhatsApp, so a phone number is all we need.
              </p>
            ),
          },
          {
            q: "Will someone call me?",
            a: (
              <p>
                Yes. We ring to confirm every order before we send it. On a
                cash-on-delivery order that call is how we make sure the address
                is right before a rider is sent across the country.
              </p>
            ),
          },
          {
            q: "Can I change or cancel my order?",
            a: (
              <p>
                Yes, while it is still with us. Message us on WhatsApp with your
                order number. Once it has left with the courier it is easier to
                refuse it at the door.
              </p>
            ),
          },
        ]}
      />

      <Group
        heading="Paying"
        items={[
          {
            q: "How do I pay?",
            a: (
              <p>
                Cash, to the rider, when the parcel reaches you. Nothing is
                charged before that and we never ask for card details.
              </p>
            ),
          },
          {
            q: "Can I pay online or by card?",
            a: (
              <p>
                Not at the moment. Cash on delivery is the only option.
              </p>
            ),
          },
          {
            q: "Should I have the exact amount ready?",
            a: (
              <p>
                Please, if you can. Riders do not always carry change, and it
                makes the handover quicker for both of you.
              </p>
            ),
          },
          {
            q: "Can I open the parcel before paying?",
            a: (
              <p>
                You can check that the box is the right item and is not damaged.
                Riders are usually not able to wait while a product is unpacked
                and tested — if something is wrong once you open it, message us
                and we will sort it out.
              </p>
            ),
          },
        ]}
      />

      <Group
        heading="Delivery"
        items={[
          {
            q: "How long will it take?",
            a: (
              <p>
                Between {fastest.standard.toLowerCase()} in{" "}
                {fastest.name.toLowerCase()} and {slowest.standard.toLowerCase()}{" "}
                for {slowest.name.toLowerCase()}. The{" "}
                <Link href="/shipping-and-delivery">shipping page</Link> lists
                every area.
              </p>
            ),
          },
          {
            q: "What does delivery cost?",
            a: (
              <p>
                {formatPKR(STANDARD_RATE)} standard, {formatPKR(EXPRESS_RATE)}{" "}
                express where it is offered. The exact charge appears at
                checkout before you place the order. We do not offer free
                delivery.
              </p>
            ),
          },
          {
            q: "Do you deliver everywhere in Pakistan?",
            a: (
              <p>
                Most of it. If your city is not in the list at checkout we
                cannot reach it yet — message us and we will tell you whether we
                can arrange something.
              </p>
            ),
          },
          {
            q: "How do I track my order?",
            a: (
              <p>
                On the <Link href="/track">tracking page</Link>, with your order
                number and phone number. We ask for both so that nobody else can
                see your order.
              </p>
            ),
          },
        ]}
      />

      <Group
        heading="Returns"
        items={[
          {
            q: "What if it arrives damaged or wrong?",
            a: (
              <p>
                Tell us within {RETURNS_WINDOW_DAYS} days of delivery and we
                will replace it or refund you. A photo usually settles it in one
                message. See{" "}
                <Link href="/returns-and-refunds">returns and refunds</Link>.
              </p>
            ),
          },
          {
            q: "Can I return something I simply did not want?",
            a: (
              <p>
                Only if it is unused and in its original packaging, and the
                return postage would be yours. Opened cosmetics and earphones
                cannot be returned at all, for hygiene reasons.
              </p>
            ),
          },
          {
            q: "Who pays to send it back?",
            a: (
              <p>
                We do, when the fault is ours. You do, if you changed your mind.
              </p>
            ),
          },
          {
            q: "How is a refund paid?",
            a: (
              <p>
                In cash or as a transfer to the number you ordered with, since
                the order was paid in cash to begin with.
              </p>
            ),
          },
        ]}
      />
    </Prose>
  )
}

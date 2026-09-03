import Link from "next/link"

import { Prose } from "@/components/page/content/Prose"
import { ORIGIN_CITY } from "@/config/policies"
import { SITE } from "@/config/site"

export const metadata = {
  title: "About us",
  description: `${SITE.name} ships electronics, cosmetics, kitchenware and bedding across Pakistan, cash on delivery.`,
}

export default function AboutPage() {
  return (
    <Prose
      title="About us"
      intro={`We are a ${ORIGIN_CITY} shop selling online across Pakistan.`}
    >
      <p>
        {SITE.name} started in Karkhano Market, {ORIGIN_CITY}. We stock the
        things people actually come in for — chargers, cables, power banks,
        headphones, kitchenware, bedding and cosmetics — and we now send them
        anywhere in the country.
      </p>

      <h2>Why cash on delivery</h2>
      <p>
        Most people in Pakistan would rather see a thing before they pay for it,
        and we would rather earn that trust than argue about it. You pay the
        rider when the parcel reaches you. Nothing is charged before that, and
        we never ask for card details.
      </p>
      <p>
        It costs us more to run and it means we call to confirm every order
        before dispatch. We think that is a fair trade.
      </p>

      <h2>Where we ship from</h2>
      <p>
        Everything leaves from our shop in {ORIGIN_CITY} and travels by courier.
        Delivery takes between one and eight days depending on where you are —
        the{" "}
        <Link href="/shipping-and-delivery">shipping page</Link> lists the
        window for each part of the country.
      </p>

      <h2>If something goes wrong</h2>
      <p>
        Message us on WhatsApp. A person reads it. We would rather replace a
        damaged item quickly than have you tell people we were difficult about
        it — see{" "}
        <Link href="/returns-and-refunds">returns and refunds</Link> for what we
        cover.
      </p>
    </Prose>
  )
}

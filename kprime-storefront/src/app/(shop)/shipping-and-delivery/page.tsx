import Link from "next/link"

import { Prose } from "@/components/page/content/Prose"
import {
  DELIVERY_ZONES,
  EXPRESS_RATE,
  ORIGIN_CITY,
  STANDARD_RATE,
} from "@/config/policies"
import { formatPKR } from "@/lib/utils/format"

export const metadata = {
  title: "Shipping and delivery",
  description:
    "Delivery windows and charges for every part of Pakistan, and how cash on delivery works.",
}

/**
 * Every figure here comes from `config/policies.ts`, which mirrors the shipping
 * options configured on the backend. Nothing on this page is typed twice.
 */
export default function ShippingPage() {
  return (
    <Prose
      title="Shipping and delivery"
      intro="We deliver across Pakistan, cash on delivery."
    >
      <h2>Delivery charges</h2>
      <p>
        Standard delivery is {formatPKR(STANDARD_RATE)}. Express, where it is
        available, is {formatPKR(EXPRESS_RATE)}. The exact charge for your city
        is shown at checkout before you place the order.
      </p>
      <p>
        We do not offer free delivery. Quoting a free rate and then adding a
        charge at the door is the fastest way to have a parcel refused, so we
        show the real number up front.
      </p>

      <h2>How long it takes</h2>
      <p>
        Orders leave {ORIGIN_CITY} once we have confirmed them by phone.
        Timings below are from dispatch, not from when you place the order.
      </p>

      {/* Scrolls on a narrow screen rather than squeezing four columns into
          360px, which would make every cell two words wide. */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left">
              <th className="py-2 pr-4 font-medium">Area</th>
              <th className="py-2 pr-4 font-medium">Standard</th>
              <th className="py-2 font-medium">Express</th>
            </tr>
          </thead>
          <tbody>
            {DELIVERY_ZONES.map((zone) => (
              <tr key={zone.name} className="border-b border-line align-top">
                <td className="py-3 pr-4">
                  <span className="font-medium text-brand">{zone.name}</span>
                  <span className="mt-1 block text-muted">
                    {zone.cities.join(", ")}
                  </span>
                </td>
                <td className="py-3 pr-4 text-brand">{zone.standard}</td>
                <td className="py-3 text-brand">
                  {zone.express ?? (
                    <span className="text-muted">Not available</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>We call before we dispatch</h2>
      <p>
        Someone from the shop rings the number you gave us to confirm the order
        and the address. This is not a sales call — it is how we avoid sending a
        parcel to a wrong address on a cash-on-delivery basis.
      </p>
      <p>
        If we cannot reach you after a couple of tries, the order waits rather
        than being cancelled. Message us on WhatsApp and we will pick it up from
        there.
      </p>

      <h2>Paying</h2>
      <p>
        Pay the rider in cash when the parcel arrives. Please keep the exact
        amount ready if you can, because riders do not always carry change.
      </p>
      <p>
        You can check where your order is on the{" "}
        <Link href="/track">tracking page</Link> using your order number and
        phone number.
      </p>
    </Prose>
  )
}

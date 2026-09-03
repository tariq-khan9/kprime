import Link from "next/link"

import { Prose } from "@/components/page/content/Prose"
import { RETURNS_WINDOW_DAYS } from "@/config/policies"
import { WHATSAPP_NUMBER, whatsappLink } from "@/config/site"
import { formatPhoneForDisplay } from "@/lib/identity/phone"

export const metadata = {
  title: "Returns and refunds",
  description:
    "What we replace, how long you have, and how to tell us something is wrong.",
}

/**
 * The window is `RETURNS_WINDOW_DAYS`, shared with the FAQ and with
 * `DeliveryEstimateBox` on every product page — so all three say the same
 * number.
 *
 * There is no returns portal in v1 and this page does not pretend otherwise:
 * the process is a WhatsApp message to a person.
 */
export default function ReturnsPage() {
  return (
    <Prose
      title="Returns and refunds"
      intro={`Tell us within ${RETURNS_WINDOW_DAYS} days and we will put it right.`}
    >
      <h2>What we cover</h2>
      <p>We replace or refund an item if:</p>
      <ul>
        <li>it arrived damaged or broken</li>
        <li>we sent the wrong item, colour or size</li>
        <li>it does not work as described</li>
      </ul>
      <p>
        Tell us within {RETURNS_WINDOW_DAYS} days of delivery. Photographs help
        and usually settle it in one message.
      </p>

      <h2>What we cannot take back</h2>
      <p>
        Cosmetics and personal-care items cannot be returned once opened, for
        hygiene reasons. The same applies to earphones and anything else worn in
        or on the body.
      </p>
      <p>
        We also cannot take back an item that has been used normally and simply
        was not wanted. Check the listing before ordering, and message us if you
        are unsure — we would rather answer a question than handle a return.
      </p>

      <h2>Condition</h2>
      <p>
        Send the item back as it arrived: with its box, accessories and
        anything that came in the packet. A charger without its cable is not the
        item we sent.
      </p>

      <h2>How to start</h2>
      <p>
        There is no form. Message us on WhatsApp with your order number and what
        went wrong, and a person will answer.
      </p>
      <ol>
        <li>
          <a
            href={whatsappLink("Hi, there is a problem with my order.")}
            target="_blank"
            rel="noopener noreferrer"
          >
            Message us on WhatsApp
          </a>{" "}
          ({formatPhoneForDisplay(WHATSAPP_NUMBER)}) with your order number.
        </li>
        <li>Send a photo if something is damaged or wrong.</li>
        <li>
          We arrange collection or ask you to send it back, and confirm the
          replacement or refund.
        </li>
      </ol>

      <h2>Who pays the return postage</h2>
      <p>
        <strong>We do</strong>, when the fault is ours — damaged, wrong item, or
        not as described.
      </p>
      <p>
        If the item is fine and you have changed your mind, the return postage
        is yours, and the original delivery charge is not refunded.
      </p>

      <h2>Refunds</h2>
      <p>
        Orders are paid in cash on delivery, so refunds are paid back the same
        way — by cash or a transfer to the number you ordered with, whichever
        suits you. We confirm the amount before sending it.
      </p>

      <p>
        Not sure whether something is covered? Check the{" "}
        <Link href="/faq">FAQ</Link> or just ask.
      </p>
    </Prose>
  )
}

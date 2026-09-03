import Link from "next/link"

import { Prose } from "@/components/page/content/Prose"
import { RETURNS_WINDOW_DAYS } from "@/config/policies"
import { SITE, WHATSAPP_NUMBER, whatsappLink } from "@/config/site"
import { SYNTHETIC_EMAIL_DOMAIN } from "@/lib/identity/phone"
import { formatPhoneForDisplay } from "@/lib/identity/phone"

export const metadata = {
  title: "Privacy",
  description:
    "What we collect, why, and what we do not do with it.",
}

/**
 * Describes what the system actually stores, including the synthetic email —
 * which is the one part a reader could otherwise discover for themselves and
 * reasonably wonder about.
 */
export default function PrivacyPage() {
  return (
    <Prose
      title="Privacy"
      intro="We collect what is needed to deliver an order, and not much else."
    >
      <h2>What we collect</h2>
      <p>When you place an order we store:</p>
      <ul>
        <li>your name</li>
        <li>your phone number</li>
        <li>the delivery address, and a landmark if you give one</li>
        <li>a second delivery phone number, if you give one</li>
        <li>what you ordered and what it cost</li>
        <li>an email address, only if you choose to give one</li>
      </ul>
      <p>
        There are no accounts and no passwords, so there is nothing of that kind
        to store or lose.
      </p>

      <h2>Your phone number is your identity here</h2>
      <p>
        Because there are no accounts, your phone number is how we recognise a
        returning customer and how you look up your own order later.
      </p>
      <p>
        Our systems need an email address for every order, so when you do not
        give one we generate a placeholder from your phone number in the form{" "}
        <code>your-number@{SYNTHETIC_EMAIL_DOMAIN}</code>. It is not a real
        mailbox, nothing is ever sent to it, and it cannot receive mail. It
        exists so two orders from the same number are recognised as the same
        person.
      </p>

      <h2>What we do with it</h2>
      <ul>
        <li>call or message you to confirm the order before dispatch</li>
        <li>give the courier your name, address and phone so they can deliver</li>
        <li>handle returns and replacements within {RETURNS_WINDOW_DAYS} days</li>
        <li>keep the order record for our own accounts</li>
      </ul>

      <h2>What we do not do</h2>
      <ul>
        <li>we do not sell or rent your details to anyone</li>
        <li>we do not take card or bank details — orders are cash on delivery</li>
        <li>
          we do not send marketing messages unless you asked for them, and you
          can tell us to stop at any time
        </li>
      </ul>

      <h2>Who else sees it</h2>
      <p>
        The courier delivering your parcel receives your name, address and phone
        number, because they cannot deliver without them. Nobody else does.
      </p>

      <h2>Reviews</h2>
      <p>
        If you write a <Link href="/faq">review</Link>, we publish your first
        name and the initial of your surname &mdash; &ldquo;Ahmed K.&rdquo; &mdash;
        with the rating and
        what you wrote. We never publish your phone number, your address or your
        full name.
      </p>

      <h2>Cookies</h2>
      <p>
        We store one small cookie to remember what is in your basket between
        visits. It holds a basket reference and nothing about you. There is no
        advertising tracking on this site.
      </p>

      <h2>Asking us to delete your details</h2>
      <p>
        Message us on WhatsApp at{" "}
        <a
          href={whatsappLink("Hi, I have a question about my personal details.")}
          target="_blank"
          rel="noopener noreferrer"
        >
          {formatPhoneForDisplay(WHATSAPP_NUMBER)}
        </a>{" "}
        and we will remove what we are not required to keep for our accounts.
      </p>

      <p className="text-muted">
        {SITE.name}, Karkhano Market, Peshawar, Pakistan.
      </p>
    </Prose>
  )
}

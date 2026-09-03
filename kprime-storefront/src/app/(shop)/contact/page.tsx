import { Prose } from "@/components/page/content/Prose"
import { ContactForm } from "@/components/page/content/ContactForm"
import { Button } from "@/components/ui/Button"
import { ORIGIN_CITY, SUPPORT_HOURS } from "@/config/policies"
import { WHATSAPP_NUMBER, whatsappLink } from "@/config/site"
import { formatPhoneForDisplay } from "@/lib/identity/phone"

export const metadata = {
  title: "Contact us",
  description:
    "Message us on WhatsApp, call, or send a note. A person answers.",
}

/**
 * WhatsApp first, deliberately.
 *
 * It is how almost everyone here actually gets in touch, it is the fastest way
 * for us to answer, and it is the only channel that works when someone is
 * standing at their door with a rider. The form is the fallback.
 */
export default function ContactPage() {
  return (
    <Prose title="Contact us" intro="A person reads every message.">
      <div className="rounded-md border border-line bg-cream p-4">
        <h2 className="mt-0">WhatsApp</h2>
        <p className="text-muted">
          The quickest way to reach us. Send your order number if you have one.
        </p>

        <p className="mt-2 font-medium text-brand">
          {/* Written out as text as well as linked, so it survives a screenshot
              and can be saved as a contact. */}
          {formatPhoneForDisplay(WHATSAPP_NUMBER)}
        </p>

        <Button variant="primary" asChild className="mt-3">
          <a
            href={whatsappLink("Hi, I have a question.")}
            target="_blank"
            rel="noopener noreferrer"
          >
            Message us on WhatsApp
          </a>
        </Button>
      </div>

      <h2>Phone</h2>
      <p>
        Call <span className="font-medium">{formatPhoneForDisplay(WHATSAPP_NUMBER)}</span>{" "}
        during opening hours. The same number takes calls and WhatsApp messages.
      </p>

      <h2>Hours</h2>
      <p>{SUPPORT_HOURS}. We are closed on Sundays.</p>
      <p className="text-muted">
        Messages sent outside these hours are answered the next working day.
      </p>

      <h2>Where we are</h2>
      <p>
        Karkhano Market, {ORIGIN_CITY}. We are an online shop — orders are
        placed here on the site and delivered by courier, not collected.
      </p>

      <h2>Send us a message</h2>
      <p className="text-muted">
        If you would rather write than message, use this. We reply on WhatsApp
        or by phone.
      </p>

      <ContactForm className="mt-2" />
    </Prose>
  )
}

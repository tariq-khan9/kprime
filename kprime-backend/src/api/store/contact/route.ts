import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

/**
 * Contact form.
 *
 *   POST /store/contact  { name, phone, email?, message }
 *
 * Emails the shop owner. Lives on the backend rather than in the storefront
 * because the SMTP credentials and the notification module are here — the
 * storefront has no mailer and should not be given one.
 *
 * Rate limited per IP, like /store/track: an unauthenticated endpoint that
 * sends mail is a spam relay waiting to happen.
 *
 * **Returns an honest failure when ADMIN_NOTIFICATION_EMAIL is unset.** A form
 * that thanks someone while sending nothing is worse than one that admits it is
 * not wired up, because nobody ever finds out.
 */

const RATE_LIMIT = { max: 5, windowMs: 10 * 60_000 };

const attempts = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);

  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT.windowMs });
    return false;
  }

  entry.count += 1;

  if (attempts.size > 5000) {
    for (const [key, value] of attempts) {
      if (now > value.resetAt) {
        attempts.delete(key);
      }
    }
  }

  return entry.count > RATE_LIMIT.max;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type ContactBody = {
  name?: string;
  phone?: string;
  email?: string;
  message?: string;
};

export async function POST(
  req: MedusaRequest<ContactBody>,
  res: MedusaResponse
) {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);

  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown";

  if (rateLimited(ip)) {
    return res
      .status(429)
      .json({ message: "Too many messages. Please try again later." });
  }

  const name = (req.body?.name ?? "").trim();
  const phone = (req.body?.phone ?? "").trim();
  const email = (req.body?.email ?? "").trim();
  const message = (req.body?.message ?? "").trim();

  if (!name || !phone || !message) {
    return res
      .status(400)
      .json({ message: "Please give your name, phone number and a message." });
  }

  if (message.length > 4000) {
    return res.status(400).json({ message: "That message is too long." });
  }

  const recipients = (process.env.ADMIN_NOTIFICATION_EMAIL ?? "")
    .split(",")
    .map((address) => address.trim())
    .filter(Boolean);

  if (recipients.length === 0) {
    logger.warn(
      "contact: ADMIN_NOTIFICATION_EMAIL is unset, so the form cannot deliver."
    );

    return res.status(503).json({
      message:
        "Our contact form is not available right now. Please message us on WhatsApp instead.",
    });
  }

  const notificationModuleService = req.scope.resolve(Modules.NOTIFICATION);

  // Escaped before it reaches the template: this is untrusted input arriving in
  // an HTML email that the shop owner opens.
  const html = `
    <p><strong>Name:</strong> ${escapeHtml(name)}</p>
    <p><strong>Phone:</strong> ${escapeHtml(phone)}</p>
    ${email ? `<p><strong>Email:</strong> ${escapeHtml(email)}</p>` : ""}
    <p><strong>Message:</strong></p>
    <p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>
  `;

  let delivered = 0;

  for (const to of recipients) {
    try {
      await notificationModuleService.createNotifications({
        to,
        channel: "email",
        template: "contact-form",
        content: {
          subject: `Website enquiry from ${name}`,
          html,
          text: `Name: ${name}\nPhone: ${phone}${
            email ? `\nEmail: ${email}` : ""
          }\n\n${message}`,
        },
      });

      delivered += 1;
    } catch (error) {
      logger.error(
        `contact: could not send to ${to}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  if (delivered === 0) {
    return res.status(502).json({
      message:
        "We could not send your message. Please try WhatsApp — it reaches us straight away.",
    });
  }

  return res.json({
    message: "Thanks — we have your message and will reply soon.",
  });
}

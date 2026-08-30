import { Logger, NotificationTypes } from "@medusajs/framework/types";
import {
  AbstractNotificationProviderService,
  MedusaError,
} from "@medusajs/framework/utils";
import nodemailer, { Transporter } from "nodemailer";

type InjectedDependencies = {
  logger: Logger;
};

export type SmtpNotificationOptions = {
  /** SMTP hostname, e.g. smtp-relay.brevo.com */
  host: string;
  /** 587 for STARTTLS (default), 465 for implicit TLS. */
  port?: number;
  /** True only for port 465. Port 587 upgrades via STARTTLS and must be false. */
  secure?: boolean;
  user: string;
  pass: string;
  /** From header. Falls back to `user`, which many relays rewrite anyway. */
  from?: string;
  /**
   * Reply-To header.
   *
   * A sending domain does not have to be able to receive mail — KPrime sends as
   * info@karkhanoprime.com, which has no MX records, so replies to it bounce.
   * Pointing Reply-To at a real mailbox keeps "reply to this email" honest.
   */
  replyTo?: string;
};

/**
 * Sends transactional email over plain SMTP.
 *
 * Medusa 2.19 ships only `notification-local` (console) and
 * `notification-sendgrid`, so any other relay needs a provider like this one.
 *
 * Deliberately generic rather than tied to one vendor: KPrime uses Brevo, but
 * Gmail (smtp.gmail.com:587 with an App Password), Resend, Mailgun or a domain
 * mailbox all work by changing environment variables alone.
 */
class SmtpNotificationService extends AbstractNotificationProviderService {
  static identifier = "notification-smtp";

  protected readonly logger_: Logger;
  protected readonly options_: SmtpNotificationOptions;
  protected readonly transporter_: Transporter;

  static validateOptions(options: Record<string, unknown>) {
    for (const key of ["host", "user", "pass"]) {
      if (!options[key]) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `notification-smtp requires a \`${key}\` option. Set SMTP_HOST, ` +
            `SMTP_USER and SMTP_PASSWORD in kprime-backend/.env.`
        );
      }
    }
  }

  constructor(
    { logger }: InjectedDependencies,
    options: SmtpNotificationOptions
  ) {
    super();

    this.logger_ = logger;
    this.options_ = options;

    const port = options.port ?? 587;
    this.transporter_ = nodemailer.createTransport({
      host: options.host,
      port,
      // Implicit TLS is 465 only. Sending secure:true on 587 hangs the
      // connection rather than failing loudly, so derive it from the port
      // unless explicitly overridden.
      secure: options.secure ?? port === 465,
      auth: {
        user: options.user,
        pass: options.pass,
      },
      // Deliberately NOT pooled. With `pool: true, maxConnections: 1` exactly
      // every second send silently produced no notification at all — a clean
      // alternating pass/fail across consecutive orders, consistent with the
      // relay closing the connection after one message while the pool kept
      // handing out the dead socket. A fresh connection per message costs a
      // little latency and is reliable.
      //
      // Without these timeouts nodemailer waits forever. A hung send stalls the
      // whole subscriber, so a mail problem becomes an order-processing problem.
      connectionTimeout: 15_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
  }

  /** Checks the credentials without sending anything. */
  async verifyConnection(): Promise<void> {
    await this.transporter_.verify();
  }

  async send(
    notification: NotificationTypes.ProviderSendNotificationDTO
  ): Promise<NotificationTypes.ProviderSendNotificationResultsDTO> {
    if (!notification) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "No notification information provided"
      );
    }

    const content = notification.content;
    if (!content?.subject || !(content.html || content.text)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `notification-smtp needs content.subject and content.html or content.text ` +
          `(template "${notification.template}" supplied neither). This provider ` +
          `renders templates in the subscriber, not at the provider.`
      );
    }

    const attachments = Array.isArray(notification.attachments)
      ? notification.attachments.map((attachment) => ({
          filename: attachment.filename ?? undefined,
          content: attachment.content,
          contentType: attachment.content_type ?? undefined,
          encoding: "base64" as const,
        }))
      : undefined;

    try {
      const info = await this.transporter_.sendMail({
        from:
          notification.from?.trim() || this.options_.from || this.options_.user,
        to: notification.to,
        replyTo: this.options_.replyTo || undefined,
        subject: content.subject,
        text: content.text || undefined,
        html: content.html || undefined,
        attachments,
      });

      this.logger_.info(
        `notification-smtp: sent "${content.subject}" to ${notification.to} (${info.messageId})`
      );

      return { id: info.messageId };
    } catch (error) {
      // Rethrown rather than swallowed so the notification module records the
      // failure. The order is already committed by the time the subscriber runs,
      // so a mail outage cannot cost a sale.
      this.logger_.error(
        `notification-smtp: failed to send "${content.subject}" to ${
          notification.to
        }: ${(error as Error).message}`
      );
      throw error;
    }
  }
}

export default SmtpNotificationService;

import { Injectable, Logger } from "@nestjs/common";
import { createTransport, type Transporter } from "nodemailer";

export interface MailConfig {
  host?: string;
  port?: number;
  user?: string;
  pass?: string;
  to?: string;
  /** Where the admin panel lives, for the link in the email. */
  siteUrl?: string;
}

/** The shape an enquiry arrives in, with the service's title when it named one. */
export interface NotifiableLead {
  id: string;
  type: string;
  name: string;
  phone: string;
  email: string | null;
  message: string | null;
  locale: string;
  sourcePath: string | null;
  service?: { titleEn: string } | null;
}

const TYPE_LABEL: Record<string, string> = {
  CONTACT: "Contact", CONSULTATION: "Consultation", QUOTE: "Quote",
};

/**
 * Every character some mail client treats as the end of a line: \n and \r,
 * vertical tab, form feed, NEL and the Unicode line and paragraph separators.
 */
const LINE_BREAK = /\r\n|[\n\r\u000b\u000c\u0085\u2028\u2029]/;
/** Other control characters, which have no business in an email body. */
const CONTROL = /[\u0000-\u0008\u000e-\u001f\u007f-\u0084\u0086-\u009f]/g;

/** One line of a visitor's own words: no line breaks to add lines of their own. */
const oneLine = (value: string) =>
  value.split(LINE_BREAK).join(" ").replace(CONTROL, "").replace(/\s+/g, " ").trim();

/**
 * The visitor wrote the name and the message, so neither may pass for our
 * own text: the name is kept to one line, the real admin link comes before
 * the message, and every line of the message is quoted with "> ".
 */
export function emailForLead(lead: NotifiableLead, siteUrl: string) {
  const name = oneLine(lead.name);
  const message = (lead.message ?? "").trim();
  const lines = [
    `${name} sent an enquiry through the website.`,
    `Open it in the admin panel: ${siteUrl.replace(/\/+$/, "")}/admins/enquiries/${lead.id}`,
    "",
    `Phone:    ${lead.phone}`,
    lead.email ? `Email:    ${lead.email}` : null,
    `Type:     ${TYPE_LABEL[lead.type] ?? lead.type}`,
    lead.service ? `Service:  ${lead.service.titleEn}` : null,
    `Language: ${lead.locale === "bn" ? "Bangla" : "English"}`,
    lead.sourcePath ? `Page:     ${lead.sourcePath}` : null,
    "",
    "Their message:",
    ...(message
      ? message.split(LINE_BREAK).map((line) => `> ${line.replace(CONTROL, "")}`)
      : ["> (No message.)"]),
  ];
  return {
    subject: `New enquiry: ${name} (${TYPE_LABEL[lead.type] ?? lead.type})`,
    text: lines.filter((line) => line !== null).join("\n"),
  };
}

export function mailConfigFromEnv(env: NodeJS.ProcessEnv = process.env): MailConfig {
  return {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT ? Number(env.SMTP_PORT) : undefined,
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    to: env.LEAD_NOTIFY_TO,
    siteUrl: env.NEXT_PUBLIC_SITE_URL ?? (env.WEB_ORIGIN ?? "").split(",")[0]?.trim(),
  };
}

/**
 * Emails the company when an enquiry arrives. Off unless SMTP and a recipient
 * are configured, so development and tests need no mail server. Callers never
 * await it on the request path: a failure here must never fail an enquiry.
 */
@Injectable()
export class LeadNotifier {
  private readonly logger = new Logger(LeadNotifier.name);
  private readonly transport: Transporter | null;

  constructor(private readonly config: MailConfig = mailConfigFromEnv()) {
    const { host, user, pass, to } = config;
    this.transport = host && user && pass && to
      ? createTransport({
          host,
          port: config.port ?? 465,
          secure: (config.port ?? 465) === 465,
          auth: { user, pass },
        })
      : null;
  }

  async leadCreated(lead: NotifiableLead): Promise<void> {
    if (!this.transport) {
      this.logger.log(`Enquiry ${lead.id} saved; email is not configured, so none was sent`);
      return;
    }
    const mail = emailForLead(lead, this.config.siteUrl || "http://localhost:3000");
    await this.transport.sendMail({
      from: `Home Inn website <${this.config.user}>`,
      to: this.config.to,
      replyTo: lead.email ?? undefined,
      ...mail,
    });
  }
}

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

export function emailForLead(lead: NotifiableLead, siteUrl: string) {
  const lines = [
    `${lead.name} sent an enquiry through the website.`,
    "",
    `Phone:    ${lead.phone}`,
    lead.email ? `Email:    ${lead.email}` : null,
    `Type:     ${TYPE_LABEL[lead.type] ?? lead.type}`,
    lead.service ? `Service:  ${lead.service.titleEn}` : null,
    `Language: ${lead.locale === "bn" ? "Bangla" : "English"}`,
    lead.sourcePath ? `Page:     ${lead.sourcePath}` : null,
    "",
    lead.message ?? "(No message.)",
    "",
    `Open it in the admin panel: ${siteUrl.replace(/\/+$/, "")}/admins/enquiries/${lead.id}`,
  ];
  return {
    subject: `New enquiry: ${lead.name} (${TYPE_LABEL[lead.type] ?? lead.type})`,
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

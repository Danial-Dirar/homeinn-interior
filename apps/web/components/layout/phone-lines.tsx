import { useTranslations } from "next-intl";
import type { SiteSettingsView } from "@/lib/api.types";
import { whatsappHref } from "@/lib/whatsapp";
import { WhatsAppIcon } from "./whatsapp-icon";

/** A number the company answers, and the WhatsApp account behind it if any. */
export interface PhoneLine {
  phone: string;
  whatsapp: string | null;
}

/**
 * Every number worth calling, in order. The second line is optional, so this is
 * the one place that decides whether it exists — no component has to null-check
 * `phoneSecondary` for itself.
 */
export function phoneLines(settings: SiteSettingsView): PhoneLine[] {
  const lines: PhoneLine[] = [{ phone: settings.phone, whatsapp: settings.whatsapp || null }];

  if (settings.phoneSecondary?.trim()) {
    lines.push({
      phone: settings.phoneSecondary,
      // Falls back to the number itself: a line the company answers is usually
      // reachable on WhatsApp at the same number.
      whatsapp: settings.whatsappSecondary?.trim() || settings.phoneSecondary,
    });
  }
  return lines;
}

/**
 * Renders the numbers as `tel:` links, each with a WhatsApp control beside it.
 * `tone` picks the hover colour so it sits on either ground.
 */
export function PhoneLines({
  settings,
  className,
}: {
  settings: SiteSettingsView;
  className?: string;
}) {
  const t = useTranslations("common");

  return (
    <ul className={className}>
      {phoneLines(settings).map((line) => (
        <li key={line.phone} className="flex items-center gap-3">
          <a className="hover:text-brand" href={`tel:${line.phone}`}>
            {line.phone}
          </a>
          {line.whatsapp ? (
            <a
              href={whatsappHref(line.whatsapp)}
              target="_blank"
              rel="noreferrer noopener"
              // Named per number, so a screen reader hears which line it opens
              // rather than two identical "Chat on WhatsApp" links.
              aria-label={`${t("whatsapp")} — ${line.phone}`}
              className="text-current/60 transition-colors hover:text-brand"
            >
              <WhatsAppIcon className="size-[1.05em]" />
            </a>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

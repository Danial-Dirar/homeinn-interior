"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { useScrolled } from "@/hooks/use-scrolled";
import type { SiteSettingsView } from "@/lib/api.types";
import { whatsappHref } from "@/lib/whatsapp";
import { WhatsAppIcon } from "./whatsapp-icon";

/**
 * The persistent WhatsApp affordance spec §6 asks for, as a floating button.
 *
 * Hidden at the top of the home page so it never lands on the hero's first
 * frame, and shown everywhere else — which is exactly where it earns its keep,
 * once someone is reading about the work or looking for a way to get in touch.
 * The same rule the header uses to decide whether it is over the hero.
 */
export function WhatsAppFloat({ settings }: { settings: SiteSettingsView }) {
  const t = useTranslations("common");
  const scrolled = useScrolled(300);
  const overHero = usePathname() === "/" && !scrolled;

  if (!settings.whatsapp) return null;

  return (
    <a
      href={whatsappHref(settings.whatsapp)}
      target="_blank"
      rel="noreferrer noopener"
      aria-label={t("whatsapp")}
      data-whatsapp-float
      className={[
        // WhatsApp green, but with ink rather than their white: white on
        // #25D366 is 1.98:1 and fails AA outright. Ink on the same green is
        // 9.7:1, and the glyph is what makes the button recognisable anyway.
        "fixed bottom-5 right-5 z-40 flex items-center gap-3 rounded-full bg-[#25D366]",
        "px-4 py-3 text-ink shadow-lg transition-all duration-300",
        "hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2",
        "focus-visible:outline-brand motion-safe:hover:scale-[1.03]",
        overHero
          ? "pointer-events-none translate-y-3 opacity-0"
          : "pointer-events-auto translate-y-0 opacity-100",
      ].join(" ")}
    >
      <WhatsAppIcon className="size-6" />
      {/* The label only appears where there is room; the icon carries it alone
          on a phone, where the accessible name does the work. */}
      <span className="hidden text-sm font-medium sm:inline">{t("whatsapp")}</span>
    </a>
  );
}

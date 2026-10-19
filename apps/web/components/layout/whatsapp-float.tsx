"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { usePastHero } from "@/hooks/use-past-hero";
import type { SiteSettingsView } from "@/lib/api.types";
import { whatsappHref } from "@/lib/whatsapp";
import { companyWhatsapp } from "./phone-lines";
import { WhatsAppIcon } from "./whatsapp-icon";

/**
 * The persistent WhatsApp affordance spec §6 asks for, as a floating button.
 *
 * Hidden on the home page until the hero has scrolled away, so it never lands
 * on the rooms or their names — the phone hero is several screens long — and
 * shown everywhere else, which is exactly where it earns its keep, once
 * someone is reading about the work or looking for a way to get in touch.
 */
export function WhatsAppFloat({ settings }: { settings: SiteSettingsView }) {
  const t = useTranslations("common");
  const pastHero = usePastHero(300);
  const overHero = usePathname() === "/" && !pastHero;

  // Whichever line carries WhatsApp, not simply the first one.
  const number = companyWhatsapp(settings);
  if (!number) return null;

  return (
    <a
      href={whatsappHref(number)}
      target="_blank"
      rel="noreferrer noopener"
      aria-label={t("whatsapp")}
      data-whatsapp-float
      className={[
        // WhatsApp green, but with charcoal rather than their white: white on
        // #25D366 is 1.98:1 and fails AA outright. Charcoal on the same green
        // is 9.7:1, and the glyph is what makes the button recognisable anyway.
        // A literal, not text-ink: the green never changes, and dark mode turns
        // ink cream (1.59:1).
        "fixed bottom-5 right-5 z-40 flex items-center gap-3 rounded-full bg-[#25D366]",
        "px-4 py-3 text-[#14181A] shadow-lg transition-all duration-300",
        "hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2",
        "focus-visible:outline-accent motion-safe:hover:scale-[1.03]",
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

import type { Locale } from "@homeinn/types";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { SiteSettingsView } from "@/lib/api.types";
import { text } from "@/lib/locale-text";
import { PhoneLines } from "./phone-lines";

const SOCIALS = [
  { key: "facebookUrl", label: "Facebook" },
  { key: "instagramUrl", label: "Instagram" },
  { key: "youtubeUrl", label: "YouTube" },
] as const;

export function SiteFooter({ locale, settings }: { locale: Locale; settings: SiteSettingsView }) {
  const t = useTranslations("common");
  const nav = useTranslations("nav");

  return (
    <footer className="bg-ink text-sand-dim">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-display text-lg text-sand">{t("brand")}</p>
          <p className="mt-2 text-sm">{t("tagline")}</p>
          <p className="mt-6 text-sm">{t("since", { year: settings.establishedYear })}</p>
        </div>

        <address className="text-sm not-italic">
          <p className="eyebrow">{t("address")}</p>
          <p className="mt-2 text-sand">{text(settings, "address", locale)}</p>
          <PhoneLines settings={settings} className="mt-4 space-y-1" />
          <p className="mt-1">
            <a className="hover:text-brand" href={`mailto:${settings.email}`}>{settings.email}</a>
          </p>
          <p className="mt-4">{text(settings, "hours", locale)}</p>
        </address>

        <nav aria-label={nav("menu")} className="text-sm">
          <p className="eyebrow">{nav("menu")}</p>
          <ul className="mt-2 space-y-2">
            {(["about", "services", "projects", "clients", "blog", "contact"] as const).map((key) => (
              <li key={key}>
                <Link href={`/${key}`} className="hover:text-brand">{nav(key)}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="text-sm">
          <p className="eyebrow">{t("social")}</p>
          <ul className="mt-2 space-y-2">
            {SOCIALS.map(({ key, label }) =>
              settings[key] ? (
                <li key={key}>
                  <a
                    className="hover:text-brand"
                    href={settings[key] as string}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    {label}
                  </a>
                </li>
              ) : null,
            )}
          </ul>
        </div>
      </div>
    </footer>
  );
}

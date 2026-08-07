import type { Locale } from "@homeinn/types";
import { Marquee } from "@homeinn/ui";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { CorporateClientView, SiteSettingsView } from "@/lib/api.types";
import { Section } from "./section";

/**
 * Spec §6 section 6. The 73/57/13 counts are stated in the profile and seeded;
 * the row-level client tables are not in this repository yet. So the section is
 * built to be true either way: counts always, flagship names when they exist.
 *
 * Only `isFlagship` rows are ever surfaced here — spec §2 lists those seven by
 * name as the references worth showing, and a 73-row marquee is noise.
 */
export function TrackRecord({
  locale,
  settings,
  clients,
}: {
  locale: Locale;
  settings: SiteSettingsView;
  clients: CorporateClientView[];
}) {
  const t = useTranslations("home");
  const c = useTranslations("clients");
  const format = new Intl.NumberFormat(locale === "bn" ? "bn-BD" : "en-US");
  const flagship = clients.filter((client) => client.isFlagship);

  return (
    <Section
      numeral="05"
      eyebrow={t("trackRecordEyebrow")}
      title={t("trackRecordTitle")}
      tone="bone"
    >
      <p className="max-w-2xl text-lg text-ink/70">{t("trackRecordBody")}</p>

      <p className="display-2 mt-10">
        {format.format(settings.corporateProjectCount)} +{" "}
        {format.format(settings.residentialProjectCount)}
      </p>

      {flagship.length > 0 ? (
        <div className="mt-12 border-y border-ink/10 py-6">
          <p className="eyebrow mb-4 text-ink/70">{c("flagship")}</p>
          <Marquee speedSeconds={50}>
            {flagship.map((client) => (
              <span key={client.id} className="heading whitespace-nowrap text-ink/70">
                {client.companyName}
              </span>
            ))}
          </Marquee>
        </div>
      ) : null}

      <Link
        href="/clients"
        className="mt-12 inline-block underline underline-offset-4 hover:text-brand"
      >
        {t("trackRecordCta")}
      </Link>
    </Section>
  );
}

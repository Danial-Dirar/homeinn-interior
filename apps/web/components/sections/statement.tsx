import type { Locale } from "@homeinn/types";
import { useTranslations } from "next-intl";
import type { SiteSettingsView } from "@/lib/api.types";
import { Section } from "./section";

/**
 * Spec §6 section 2. Every number here comes from `SiteSettings`, which the
 * seed fills from the profile's own figures — and the label says "projects",
 * never "clients", because the corporate list repeats clients across sites
 * (spec §2's counting rule).
 */
export function Statement({ locale, settings }: { locale: Locale; settings: SiteSettingsView }) {
  const t = useTranslations("home");
  const format = new Intl.NumberFormat(locale === "bn" ? "bn-BD" : "en-US");

  const stats = [
    { value: settings.corporateProjectCount, label: t("statCorporate") },
    { value: settings.residentialProjectCount, label: t("statResidential") },
    { value: settings.districtCount, label: t("statDistricts") },
  ];

  return (
    <Section numeral="01" eyebrow={t("statementEyebrow")} tone="bone" id="main">
      <p className="display-2 max-w-4xl">{t("statementTitle")}</p>
      <p className="mt-6 max-w-2xl text-lg text-ink/70">{t("statementBody")}</p>

      <dl className="mt-16 grid gap-10 border-t border-ink/10 pt-10 sm:grid-cols-3">
        {stats.map((stat) => (
          // Reversed so the DOM keeps dt-before-dd while the number reads first.
          <div key={stat.label} className="flex flex-col-reverse">
            <dt className="eyebrow mt-3 text-ink/70">{stat.label}</dt>
            <dd className="display-1 leading-none">{format.format(stat.value)}</dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}

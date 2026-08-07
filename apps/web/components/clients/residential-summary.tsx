import { useTranslations } from "next-intl";
import type { ResidentialSummaryView, SiteSettingsView } from "@/lib/api.types";

/**
 * Spec §11. The profile lists 57 named individuals with their neighbourhoods —
 * doctors, professors, a brigadier. Consent for a PDF sent to one corporate
 * prospect is not consent for a public web page, so this component receives an
 * aggregate and has no way to render a name even if one were passed to it.
 *
 * No `locale` prop: the only number here is formatted by the ICU message.
 */
export function ResidentialSummary({
  summary,
  settings,
}: {
  summary: ResidentialSummaryView;
  settings: SiteSettingsView;
}) {
  const t = useTranslations("clients");

  // The seeded row count is the live figure; the settings count is the profile's
  // stated one. While the row tables are blocked, only the latter is truthful.
  const total = Math.max(summary.total, settings.residentialProjectCount);

  return (
    <div>
      <p className="display-2">{t("residentialCount", { count: total })}</p>
      <p className="mt-6 max-w-xl text-ink/70">{t("residentialBody")}</p>

      {summary.districts.length > 0 ? (
        <>
          <h3 className="eyebrow mt-12 text-ink/50">{t("districtsTitle")}</h3>
          <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
            {summary.districts.map((district) => (
              <li key={district} className="text-ink/80">{district}</li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}

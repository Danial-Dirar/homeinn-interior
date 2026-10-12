import type { Locale } from "@homeinn/types";
import { useTranslations } from "next-intl";
import type { SiteSettingsView } from "@/lib/api.types";
import { Blueprint } from "@/components/blueprint/blueprint";
import { Section } from "./section";

/**
 * Spec §6 section 2. Every number here comes from `SiteSettings`, which the
 * seed fills from the profile's own figures — and the sentence says
 * "projects", never "clients", because the corporate list repeats clients
 * across sites (spec §2's counting rule).
 *
 * The figures are part of a sentence, at the sentence's own size and picked out
 * only by colour. Three oversized numerals over small tracked labels is the
 * look of a template, not of a company describing its work.
 */
export function Statement({ locale, settings }: { locale: Locale; settings: SiteSettingsView }) {
  const t = useTranslations("home");
  const format = new Intl.NumberFormat(locale === "bn" ? "bn-BD" : "en-US");

  return (
    <Section eyebrow={t("statementEyebrow")} tone="bone" id="main">
      <div className="relative">
        {/* Decorative: a faint first-floor plan behind the copy, wide screens only. */}
        <Blueprint
          plan="first-floor"
          className="pointer-events-none absolute right-0 -top-6 hidden w-[36rem] text-ink/[0.07] lg:block"
        />
        <p className="relative display-2 max-w-4xl">{t("statementTitle")}</p>
        <p className="relative mt-6 max-w-2xl text-lg text-ink/70">{t("statementBody")}</p>

        <p className="relative heading mt-14 max-w-3xl border-t border-ink/10 pt-10">
          {t.rich("statementFigures", {
            corporate: format.format(settings.corporateProjectCount),
            residential: format.format(settings.residentialProjectCount),
            districts: format.format(settings.districtCount),
            n: (chunks) => <strong className="font-[inherit] text-accent">{chunks}</strong>,
          })}
        </p>
      </div>
    </Section>
  );
}

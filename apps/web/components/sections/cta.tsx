import type { Locale } from "@homeinn/types";
import { useTranslations } from "next-intl";
import { LeadForm } from "@/components/forms/lead-form";
import { PhoneLines } from "@/components/layout/phone-lines";
import type { ServiceView, SiteSettingsView } from "@/lib/api.types";
import { Section } from "./section";

export function Cta({
  locale,
  services,
  settings,
}: {
  locale: Locale;
  services: ServiceView[];
  settings: SiteSettingsView;
}) {
  const t = useTranslations("home");
  const common = useTranslations("common");

  return (
    <Section numeral="09" eyebrow={t("ctaEyebrow")} title={t("ctaTitle")} tone="ink" id="enquire">
      <div className="grid gap-14 lg:grid-cols-2">
        <div>
          <p className="max-w-md text-lg text-sand-dim">{t("ctaBody")}</p>
          {/* No separate WhatsApp button here: each number below already
              carries its own, and the floating one is on every page. */}
          <div className="mt-8 text-sand-dim">
            <p className="eyebrow">{common("callUs")}</p>
            <PhoneLines settings={settings} className="mt-2 space-y-1 text-lg" />
          </div>
        </div>
        <div className="text-sand">
          <LeadForm locale={locale} services={services} sourcePath={`/${locale}`} />
        </div>
      </div>
    </Section>
  );
}

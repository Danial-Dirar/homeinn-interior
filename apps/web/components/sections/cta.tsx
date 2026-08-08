import type { Locale } from "@homeinn/types";
import { useTranslations } from "next-intl";
import { LeadForm } from "@/components/forms/lead-form";
import { PhoneLines } from "@/components/layout/phone-lines";
import { WhatsAppButton } from "@/components/layout/whatsapp-button";
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
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <WhatsAppButton
              number={settings.whatsapp}
              className="inline-flex items-center gap-2 border border-sand px-5 py-3 text-sand hover:border-brand hover:text-brand"
            />
            <div className="text-sand-dim">
              <p className="eyebrow">{common("callUs")}</p>
              <PhoneLines settings={settings} className="mt-1 space-y-1" />
            </div>
          </div>
        </div>
        <div className="text-sand">
          <LeadForm locale={locale} services={services} sourcePath={`/${locale}`} />
        </div>
      </div>
    </Section>
  );
}

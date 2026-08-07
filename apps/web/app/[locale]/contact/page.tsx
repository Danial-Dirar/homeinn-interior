import type { Locale } from "@homeinn/types";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LeadForm } from "@/components/forms/lead-form";
import { getServices, getSettings } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";
import { text } from "@/lib/locale-text";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contact" });
  return pageMetadata({
    locale,
    path: "/contact",
    title: t("title"),
    description: t("intro"),
  });
}

export default async function ContactPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [settings, services] = await Promise.all([getSettings(), getServices()]);
  const t = await getTranslations("contact");
  const common = await getTranslations("common");

  const details = [
    { label: common("address"), value: text(settings, "address", locale), href: null },
    { label: common("callUs"), value: settings.phone, href: `tel:${settings.phone}` },
    { label: common("email"), value: settings.email, href: `mailto:${settings.email}` },
    { label: common("hours"), value: text(settings, "hours", locale), href: null },
  ];

  return (
    <main id="main" className="bg-bone">
      <div className="mx-auto grid max-w-7xl gap-14 px-5 py-28 lg:grid-cols-2">
        <div>
          <h1 className="display-1">{t("title")}</h1>
          <p className="mt-6 max-w-md text-lg text-ink/70">{t("intro")}</p>

          <dl className="mt-12 space-y-6 text-sm">
            {details.map((detail) => (
              <div key={detail.label}>
                <dt className="eyebrow text-ink/70">{detail.label}</dt>
                <dd className="mt-1">
                  {detail.href ? (
                    <a className="hover:text-brand" href={detail.href}>{detail.value}</a>
                  ) : (
                    detail.value
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div>
          <h2 className="heading">{t("formTitle")}</h2>
          <div className="mt-6">
            <LeadForm
              locale={locale}
              services={services}
              sourcePath={`/${locale}/contact`}
              defaultType="CONTACT"
            />
          </div>
        </div>
      </div>
    </main>
  );
}

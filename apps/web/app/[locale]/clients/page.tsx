import type { Locale } from "@homeinn/types";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ClientLogoWall } from "@/components/clients/client-logo-wall";
import { CorporateTable } from "@/components/clients/corporate-table";
import { ResidentialSummary } from "@/components/clients/residential-summary";
import {
  getClientLogos, getCorporateClients, getResidentialSummary, getSettings,
} from "@/lib/content";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "clients" });
  return pageMetadata({
    locale,
    path: "/clients",
    title: t("title"),
    description: t("intro"),
  });
}

export default async function ClientsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [clients, summary, settings, logos] = await Promise.all([
    getCorporateClients(),
    getResidentialSummary(),
    getSettings(),
    getClientLogos(),
  ]);
  const t = await getTranslations("clients");

  return (
    <main id="main" className="bg-bone">
      <div className="mx-auto max-w-7xl px-5 py-28">
        <h1 className="display-1">{t("title")}</h1>
        <p className="mt-6 max-w-2xl text-lg text-ink/70">{t("intro")}</p>

        <div className="mt-20">
          <ClientLogoWall locale={locale} clients={logos} />
        </div>

        <section className="mt-24">
          <h2 className="display-2">{t("residentialTitle")}</h2>
          <div className="mt-8">
            <ResidentialSummary summary={summary} settings={settings} />
          </div>
        </section>

        <section className="mt-24">
          <h2 className="display-2">{t("corporateTitle")}</h2>
          <div className="mt-8">
            <CorporateTable locale={locale} clients={clients} />
          </div>
        </section>
      </div>
    </main>
  );
}

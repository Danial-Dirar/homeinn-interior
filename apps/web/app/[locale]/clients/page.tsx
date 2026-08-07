import type { Locale } from "@homeinn/types";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CorporateTable } from "@/components/clients/corporate-table";
import { ResidentialSummary } from "@/components/clients/residential-summary";
import { getCorporateClients, getResidentialSummary, getSettings } from "@/lib/content";

export default async function ClientsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [clients, summary, settings] = await Promise.all([
    getCorporateClients(),
    getResidentialSummary(),
    getSettings(),
  ]);
  const t = await getTranslations("clients");

  return (
    <main id="main" className="bg-bone">
      <div className="mx-auto max-w-7xl px-5 py-28">
        <h1 className="display-1">{t("title")}</h1>
        <p className="mt-6 max-w-2xl text-lg text-ink/70">{t("intro")}</p>

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

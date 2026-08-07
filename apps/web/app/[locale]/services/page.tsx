import type { Locale } from "@homeinn/types";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ServicesGrid } from "@/components/sections/services-grid";
import { getServices } from "@/lib/content";

export default async function ServicesPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const services = await getServices();
  const t = await getTranslations("services");

  return (
    <main id="main" className="bg-bone">
      <div className="mx-auto max-w-7xl px-5 pb-4 pt-28">
        <h1 className="display-1">{t("title")}</h1>
        <p className="mt-6 max-w-2xl text-lg text-ink/70">{t("intro")}</p>
      </div>
      <ServicesGrid locale={locale} services={services} bare />
    </main>
  );
}

import type { Locale } from "@homeinn/types";
import { setRequestLocale } from "next-intl/server";
import { PanoramaHero } from "@/components/hero/panorama-hero";
import { ServicesGrid } from "@/components/sections/services-grid";
import { Statement } from "@/components/sections/statement";
import { WorkingAreas } from "@/components/sections/working-areas";
import { getHero, getServices, getSettings, getWorkingAreas } from "@/lib/content";

export default async function HomePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [hero, settings, services, areas] = await Promise.all([
    getHero("desktop"),
    getSettings(),
    getServices(),
    getWorkingAreas(),
  ]);

  return (
    <main>
      <PanoramaHero segments={hero} locale={locale} target="desktop" />
      <Statement locale={locale} settings={settings} />
      <ServicesGrid locale={locale} services={services} />
      <WorkingAreas locale={locale} areas={areas} />
    </main>
  );
}

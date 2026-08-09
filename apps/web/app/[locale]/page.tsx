import type { Locale } from "@homeinn/types";
import { setRequestLocale } from "next-intl/server";
import { PanoramaHero } from "@/components/hero/panorama-hero";
import { Credentials } from "@/components/sections/credentials";
import { Cta } from "@/components/sections/cta";
import { Process } from "@/components/sections/process";
import { SelectedProjects } from "@/components/sections/selected-projects";
import { ServicesGrid } from "@/components/sections/services-grid";
import { Statement } from "@/components/sections/statement";
import { Testimonials } from "@/components/sections/testimonials";
import { TrackRecord } from "@/components/sections/track-record";
import { WorkingAreas } from "@/components/sections/working-areas";
import {
  getCertifications, getCorporateClients, getHero, getProjects, getServices, getSettings,
  getTestimonials, getWorkingAreas,
} from "@/lib/content";

export default async function HomePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [hero, heroMobile, settings, services, areas, projects, clients, testimonials, certifications] =
    await Promise.all([
      // Both strips: spec §7 curates a narrower mobile subset (`showOnMobile`)
      // and gives it more scroll per room. Which one renders is a CSS decision,
      // so the page has to hold both.
      getHero("desktop"),
      getHero("mobile"),
      getSettings(),
      getServices(),
      getWorkingAreas(),
      getProjects(),
      getCorporateClients(),
      getTestimonials(),
      getCertifications(),
    ]);

  return (
    <main>
      <PanoramaHero segments={hero} mobileSegments={heroMobile} locale={locale} />
      <Statement locale={locale} settings={settings} />
      <ServicesGrid locale={locale} services={services} />
      <WorkingAreas locale={locale} areas={areas} />
      <SelectedProjects locale={locale} projects={projects} />
      <TrackRecord locale={locale} settings={settings} clients={clients} />
      <Process />
      <Testimonials locale={locale} testimonials={testimonials} />
      <Credentials locale={locale} certifications={certifications} />
      <Cta locale={locale} services={services} settings={settings} />
    </main>
  );
}

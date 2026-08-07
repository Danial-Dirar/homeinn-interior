import type { Locale } from "@homeinn/types";
import { setRequestLocale } from "next-intl/server";
import { PanoramaHero } from "@/components/hero/panorama-hero";
import { Credentials } from "@/components/sections/credentials";
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

  const [hero, settings, services, areas, projects, clients, testimonials, certifications] =
    await Promise.all([
      getHero("desktop"),
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
      <PanoramaHero segments={hero} locale={locale} target="desktop" />
      <Statement locale={locale} settings={settings} />
      <ServicesGrid locale={locale} services={services} />
      <WorkingAreas locale={locale} areas={areas} />
      <SelectedProjects locale={locale} projects={projects} />
      <TrackRecord locale={locale} settings={settings} clients={clients} />
      <Process />
      <Testimonials locale={locale} testimonials={testimonials} />
      <Credentials locale={locale} certifications={certifications} />
    </main>
  );
}

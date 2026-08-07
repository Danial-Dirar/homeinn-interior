import type { Locale } from "@homeinn/types";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProjectCard } from "@/components/project-card";
import { ProjectFilterBar } from "@/components/project-filter-bar";
import { getProjects, getWorkingAreas } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";
import { areaFromSearchParams } from "@/lib/project-filter";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "projects" });
  return pageMetadata({
    locale,
    path: "/projects",
    title: t("title"),
    description: t("intro"),
  });
}

export default async function ProjectsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const area = areaFromSearchParams(await searchParams);
  const [projects, areas] = await Promise.all([getProjects(area), getWorkingAreas()]);
  const t = await getTranslations("projects");

  return (
    <main id="main" className="bg-bone">
      <div className="mx-auto max-w-7xl px-5 py-28">
        <h1 className="display-1">{t("title")}</h1>
        <p className="mt-6 max-w-2xl text-lg text-ink/70">{t("intro")}</p>

        <div className="mt-12">
          <ProjectFilterBar locale={locale} areas={areas} active={area} />
        </div>

        {projects.length === 0 ? (
          // Spec §12: case studies stay unpublished until the client confirms
          // the details, so this is what visitors see until then.
          <p className="mt-16 max-w-xl text-ink/60">{t("empty")}</p>
        ) : (
          <ul className="mt-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <li key={project.id}>
                <ProjectCard locale={locale} project={project} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

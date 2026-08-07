import type { Locale } from "@homeinn/types";
import { useTranslations } from "next-intl";
import { ProjectCard } from "@/components/project-card";
import { Link } from "@/i18n/navigation";
import type { ProjectView } from "@/lib/api.types";
import { Section } from "./section";

const MAX = 4;

/**
 * Spec §6 section 5. The API already sorts featured rows first, so taking the
 * first four gives the featured set when one exists and the newest work when it
 * does not. Renders nothing while no case study is published (spec §12).
 */
export function SelectedProjects({
  locale,
  projects,
}: {
  locale: Locale;
  projects: ProjectView[];
}) {
  const t = useTranslations("home");
  const common = useTranslations("common");

  if (projects.length === 0) return null;

  return (
    <Section numeral="04" eyebrow={t("projectsEyebrow")} title={t("projectsTitle")} tone="ink">
      <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
        {projects.slice(0, MAX).map((project) => (
          <ProjectCard key={project.id} locale={locale} project={project} />
        ))}
      </div>
      <Link
        href="/projects"
        className="mt-12 inline-block underline underline-offset-4 hover:text-brand"
      >
        {common("viewAll")}
      </Link>
    </Section>
  );
}

import type { Locale } from "@homeinn/types";
import { useTranslations } from "next-intl";
import { Picture } from "@/components/media/picture";
import { Link } from "@/i18n/navigation";
import type { ProjectView } from "@/lib/api.types";
import { text } from "@/lib/locale-text";

/**
 * `project.clientName` is deliberately never rendered on a card. Spec §11
 * permits corporate names, but the column is shared with residential case
 * studies and a card has no way to know which it is holding. The detail page
 * decides, where the working area is in scope.
 */
export function ProjectCard({ locale, project }: { locale: Locale; project: ProjectView }) {
  const t = useTranslations("projects");

  return (
    <article className="group">
      <Link href={`/projects/${project.slug}`} className="block">
        <div className="aspect-[4/3] overflow-hidden bg-ink-raised">
          {project.cover ? (
            <Picture
              media={project.cover}
              locale={locale}
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : null}
        </div>
        <h3 className="heading mt-4">{text(project, "title", locale)}</h3>
        <p className="mt-1 text-sm text-current/60">
          {text(project, "location", locale)}
          {project.year ? ` · ${project.year}` : ""}
          {project.areaSqft ? ` · ${project.areaSqft} ${t("areaUnit")}` : ""}
        </p>
      </Link>
    </article>
  );
}

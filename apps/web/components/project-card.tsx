import type { Locale } from "@homeinn/types";
import { useTranslations } from "next-intl";
import { Picture } from "@/components/media/picture";
import { Link } from "@/i18n/navigation";
import type { ProjectView } from "@/lib/api.types";
import { text } from "@/lib/locale-text";
import { Reveal } from "@/components/motion/reveal";

/** Design-stage work is filed here, and is shown in renders rather than photographs. */
const RENDERED_AREA = "architectural-design";

/**
 * `project.clientName` is deliberately never rendered on a card. Spec §11
 * permits corporate names, but the column is shared with residential case
 * studies and a card has no way to know which it is holding. The detail page
 * decides, where the working area is in scope.
 */
export function ProjectCard({ locale, project, index = 0 }: {
  locale: Locale;
  project: ProjectView;
  /** Place in the grid; staggers the picture's unveiling across a row. */
  index?: number;
}) {
  const t = useTranslations("projects");

  return (
    <article className="group">
      <Link href={`/projects/${project.slug}`} className="block">
        <Reveal variant="wipe" delay={(index % 4) * 90} className="relative aspect-[4/3] overflow-hidden bg-ink-raised">
          {project.cover ? (
            <Picture
              media={project.cover}
              locale={locale}
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : null}
          {/* On the picture, not only in its alt text: a render sits in the
              same grid as photographs of finished buildings. */}
          {project.workingArea?.slug === RENDERED_AREA ? (
            <span className="absolute left-4 top-4 bg-bone/90 px-3 py-1 text-[0.65rem] uppercase tracking-[0.14em] text-ink">
              {t("renderTag")}
            </span>
          ) : null}
        </Reveal>
        <h3 className="heading mt-4">{text(project, "title", locale)}</h3>
        {/* Joined rather than concatenated: an imported project may have no
            location yet, and a leading " · " would show for every one. */}
        <p className="mt-1 text-sm text-current/65">
          {[
            text(project, "location", locale),
            project.year ? String(project.year) : "",
            project.areaSqft ? `${project.areaSqft} ${t("areaUnit")}` : "",
          ]
            .filter((part) => part.trim())
            .join(" · ")}
        </p>
      </Link>
    </article>
  );
}

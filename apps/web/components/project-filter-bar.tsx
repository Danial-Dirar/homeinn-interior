import type { Locale } from "@homeinn/types";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { WorkingAreaView } from "@/lib/api.types";
import { text } from "@/lib/locale-text";

export function ProjectFilterBar({
  locale,
  areas,
  active,
}: {
  locale: Locale;
  areas: WorkingAreaView[];
  active: string | undefined;
}) {
  const t = useTranslations("projects");

  const item = (href: string, label: string, isActive: boolean) => (
    <li key={href}>
      <Link
        href={href}
        aria-current={isActive ? "true" : undefined}
        className={[
          "inline-block border px-4 py-2 text-sm transition-colors",
          // Filled rather than brand-coloured text: brand on bone is 4.32:1 at
          // 14px. Spec §8 sanctions brand for active nav, and this passes AA.
          isActive
            ? "border-brand bg-brand text-white"
            : "border-ink/15 hover:border-ink/40",
        ].join(" ")}
      >
        {label}
      </Link>
    </li>
  );

  return (
    <nav aria-label={t("filterLabel")}>
      <ul className="flex flex-wrap gap-3">
        {item("/projects", t("all"), active === undefined)}
        {areas.map((area) =>
          item(`/projects?area=${area.slug}`, text(area, "name", locale), active === area.slug),
        )}
      </ul>
    </nav>
  );
}

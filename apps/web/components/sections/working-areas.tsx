import type { Locale } from "@homeinn/types";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { WorkingAreaView } from "@/lib/api.types";
import { text } from "@/lib/locale-text";
import { Section } from "./section";

/**
 * Spec §6: working areas are a filter dimension on /projects, not their own
 * page — so every entry here is a link into the filtered grid.
 */
export function WorkingAreas({ locale, areas }: { locale: Locale; areas: WorkingAreaView[] }) {
  const t = useTranslations("home");

  return (
    <Section numeral="03" eyebrow={t("areasEyebrow")} title={t("areasTitle")} tone="ink">
      <ul className="divide-y divide-ink-line border-y border-ink-line">
        {areas.map((area, index) => (
          <li key={area.id}>
            <Link
              href={`/projects?area=${area.slug}`}
              className="group flex items-baseline gap-6 py-5 transition-colors hover:text-brand"
            >
              {/* Decorative: the link's accessible name is the area, not "01 Landscaping". */}
              <span aria-hidden="true" className="section-numeral">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="heading">{text(area, "name", locale)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}

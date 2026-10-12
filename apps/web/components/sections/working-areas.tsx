import type { Locale } from "@homeinn/types";
import { ArrowUpRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { WorkingAreaView } from "@/lib/api.types";
import { text } from "@/lib/locale-text";
import { Reveal } from "@/components/motion/reveal";
import { Section } from "./section";

/**
 * Spec §6: working areas are a filter dimension on /projects, not their own
 * page — so every entry here is a link into the filtered grid.
 */
export function WorkingAreas({ locale, areas }: { locale: Locale; areas: WorkingAreaView[] }) {
  const t = useTranslations("home");

  return (
    <Section eyebrow={t("areasEyebrow")} title={t("areasTitle")} tone="ink">
      <ul className="divide-y divide-ink-line border-y border-ink-line">
        {areas.map((area, index) => (
          <Reveal as="li" key={area.id} delay={Math.min(index, 6) * 50}>
            <Link
              href={`/projects?area=${area.slug}`}
              className="group flex items-center justify-between gap-6 py-5 transition-colors hover:text-accent"
            >
              <span className="heading">{text(area, "name", locale)}</span>
              {/* Decorative: the link's accessible name is the area alone. */}
              <ArrowUpRight
                aria-hidden="true"
                className="size-5 shrink-0 text-accent transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              />
            </Link>
          </Reveal>
        ))}
      </ul>
    </Section>
  );
}

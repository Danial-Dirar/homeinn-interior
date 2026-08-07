import type { Locale } from "@homeinn/types";
import { useTranslations } from "next-intl";
import type { TestimonialView } from "@/lib/api.types";
import { text, textOrNull } from "@/lib/locale-text";
import { Section } from "./section";

/**
 * Spec §12: no testimonials exist, none are invented, and the section does not
 * render when the table is empty. The markup below is what appears the day the
 * client supplies real ones.
 */
export function Testimonials({
  locale,
  testimonials,
}: {
  locale: Locale;
  testimonials: TestimonialView[];
}) {
  const t = useTranslations("home");

  if (testimonials.length === 0) return null;

  return (
    <Section
      numeral="07"
      eyebrow={t("testimonialsEyebrow")}
      title={t("testimonialsTitle")}
      tone="ink"
    >
      <ul className="grid gap-10 md:grid-cols-2">
        {testimonials.map((item) => {
          const role = textOrNull(item, "role", locale);
          return (
            <li key={item.id} className="border border-ink-line p-8">
              <blockquote className="text-lg text-sand">{text(item, "quote", locale)}</blockquote>
              <p className="mt-6 text-sand">{item.authorName}</p>
              {role ? <p className="text-sm text-sand-dim">{role}</p> : null}
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

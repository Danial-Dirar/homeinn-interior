import type { Locale } from "@homeinn/types";
import { useTranslations } from "next-intl";
import type { CertificationView } from "@/lib/api.types";
import { text } from "@/lib/locale-text";
import { Section } from "./section";

export function Credentials({
  locale,
  certifications,
}: {
  locale: Locale;
  certifications: CertificationView[];
}) {
  const t = useTranslations("home");

  if (certifications.length === 0) return null;

  return (
    <Section
      numeral="08"
      eyebrow={t("credentialsEyebrow")}
      title={t("credentialsTitle")}
      tone="bone"
    >
      <ul className="grid gap-px border border-ink/10 bg-ink/10 sm:grid-cols-3">
        {certifications.map((certification) => (
          <li key={certification.id} className="bg-bone p-8">
            <h3 className="heading">{text(certification, "title", locale)}</h3>
            {certification.issuer ? (
              <p className="mt-2 text-sm text-ink/60">{certification.issuer}</p>
            ) : null}
            {certification.reference ? (
              <p className="mt-1 text-sm text-ink/60">{certification.reference}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </Section>
  );
}

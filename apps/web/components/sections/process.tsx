import { useTranslations } from "next-intl";
import { Section } from "./section";

/**
 * Spec §6 section 7 — the process derived from the profile's six key strengths.
 * That copy lives in the company profile PDF, which is not in this repository,
 * so both catalogues carry `home.processTitle` as an empty string and this
 * section renders nothing. Fill the key in `messages/{en,bn}.json` and it
 * appears. Spec §12: no invented copy.
 */
export function Process() {
  const t = useTranslations("home");
  const title = t("processTitle");

  if (!title.trim()) return null;

  return (
    <Section numeral="06" eyebrow={t("processEyebrow")} title={title} tone="ink">
      {null}
    </Section>
  );
}

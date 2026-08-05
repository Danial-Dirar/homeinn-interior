import type { Locale } from "@homeinn/types";

type Bilingual<F extends string> = Record<`${F}En` | `${F}Bn`, string>;
type BilingualOptional<F extends string> = Record<`${F}En` | `${F}Bn`, string | null>;

/**
 * Picks the `<field>En` / `<field>Bn` column for the active locale.
 *
 * There is deliberately no cross-language fallback: spec §9's stated failure
 * mode is a Bangla page quietly rendering English, and the API already refuses
 * to store a half-filled pair.
 */
export function text<F extends string>(row: Bilingual<F>, field: F, locale: Locale): string {
  const key = (locale === "bn" ? `${field}Bn` : `${field}En`) as keyof Bilingual<F>;
  return row[key];
}

/** The same, for nullable pairs such as `captionEn` / `captionBn`. */
export function textOrNull<F extends string>(
  row: BilingualOptional<F>,
  field: F,
  locale: Locale,
): string | null {
  const key = (locale === "bn" ? `${field}Bn` : `${field}En`) as keyof BilingualOptional<F>;
  return row[key];
}

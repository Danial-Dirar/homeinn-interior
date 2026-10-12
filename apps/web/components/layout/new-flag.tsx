import { useTranslations } from "next-intl";

/**
 * The small NEW flag over a nav item, in the brand's burnt orange.
 *
 * The word itself is a solid chip with white text (5.51:1) and never changes
 * opacity — pulsing text drops it below legibility. What blinks is the halo
 * behind it, so the flag still catches the eye while the label stays readable
 * at all times. White on brand reads the same in the dark and light header.
 *
 * `motion-safe:` gates the pulse: a blinking element is a real problem for some
 * people, not a preference, so a reduced-motion visitor gets a steady flag.
 * `aria-hidden` because the word would otherwise land in the link's accessible
 * name — "Furniture New" is not the name of the page.
 */
export function NewFlag() {
  const t = useTranslations("nav");

  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute -top-3 left-1/2 -translate-x-1/2"
    >
      <span className="relative flex">
        <span className="absolute inset-0 rounded-full bg-brand motion-safe:animate-[flag-pulse_1.6s_ease-in-out_infinite]" />
        <span className="relative rounded-full bg-brand px-1.5 py-px text-[0.6rem] font-semibold uppercase leading-tight tracking-[0.1em] text-white">
          {t("new")}
        </span>
      </span>
    </span>
  );
}

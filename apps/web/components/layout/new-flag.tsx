import { useTranslations } from "next-intl";

/**
 * The small red NEW flag over a nav item.
 *
 * The word itself is a solid brand chip with white text and never changes
 * opacity — red-on-ink at this size measured 3.7:1, and pulsing the text took
 * it to 2.0. What blinks is the halo behind it, so the flag still catches the
 * eye while the label stays readable at all times.
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
      className="pointer-events-none absolute -right-2 -top-3 translate-x-full"
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

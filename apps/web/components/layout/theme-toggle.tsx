"use client";

import { LampCeiling } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { DEFAULT_THEME, THEME_KEY, type Theme } from "@/lib/theme";

/**
 * Switches between the dark site and the light one, as a ceiling lamp rather
 * than the usual sun and moon — this is an interiors company, and turning the
 * lights on is the honest picture of what the switch does.
 *
 * The theme lives on `<html data-theme>`; the boot script in the layout sets it
 * before paint, and this reads it back on mount rather than guessing.
 */
export function ThemeToggle() {
  const t = useTranslations("nav");
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  }, []);

  const lit = theme === "light";

  function toggle() {
    const next: Theme = lit ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // Private browsing can refuse storage; the switch still works this visit.
    }
    setTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={lit}
      aria-label={lit ? t("lightsOff") : t("lightsOn")}
      title={lit ? t("lightsOff") : t("lightsOn")}
      className="relative flex size-8 items-center justify-center transition-colors hover:text-accent"
    >
      <LampCeiling aria-hidden="true" className="relative z-10 size-[1.15em]" />
      {/* The lamp's light: a warm pool under the shade, only when it is on. */}
      <span
        aria-hidden="true"
        className={[
          "pointer-events-none absolute left-1/2 top-[64%] size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ember blur-[5px] transition-opacity duration-300",
          lit ? "opacity-70" : "opacity-0",
        ].join(" ")}
      />
    </button>
  );
}

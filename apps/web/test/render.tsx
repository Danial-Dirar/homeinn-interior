import { render, type RenderOptions } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement } from "react";
import bn from "@/messages/bn.json";
import en from "@/messages/en.json";
import type { SiteSettingsView } from "@/lib/api.types";

/**
 * Renders with the real message catalogues, so a component referencing a key
 * that does not exist fails the test rather than shipping a raw key to a user.
 */
export function renderWithIntl(
  ui: ReactElement,
  { locale = "en" as "en" | "bn", ...options }: RenderOptions & { locale?: "en" | "bn" } = {},
) {
  return render(
    <NextIntlClientProvider locale={locale} messages={locale === "bn" ? bn : en}>
      {ui}
    </NextIntlClientProvider>,
    options,
  );
}

export const settingsFixture: SiteSettingsView = {
  id: "singleton",
  phone: "01760775454",
  whatsapp: "+8801760775454",
  email: "homeinnbd14@gmail.com",
  addressEn: "Plot# 18, Road# 03, Block# KHA, Section# 06, Mirpur-10, Dhaka-1216",
  addressBn: "প্লট# ১৮, রোড# ০৩, ব্লক# খ, সেকশন# ০৬, মিরপুর-১০, ঢাকা-১২১৬",
  hoursEn: "Open every day",
  hoursBn: "প্রতিদিন খোলা",
  facebookUrl: "https://www.facebook.com/homeinnbd14",
  instagramUrl: "https://www.instagram.com/homeinnbd",
  youtubeUrl: null,
  establishedYear: 2015,
  corporateProjectCount: 73,
  residentialProjectCount: 57,
  districtCount: 13,
};

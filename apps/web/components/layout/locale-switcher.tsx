"use client";

import type { Locale } from "@homeinn/types";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

/**
 * next-intl's `usePathname` returns the route without its locale prefix, so
 * switching language keeps the visitor exactly where they were — which spec
 * §13 lists as one of the flows worth an e2e test.
 */
export function LocaleSwitcher({ locale }: { locale: Locale }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const other: Locale = locale === "en" ? "bn" : "en";

  return (
    <Link
      href={pathname}
      locale={other}
      hrefLang={other}
      lang={other}
      className="text-sm underline-offset-4 hover:underline"
    >
      {other === "bn" ? t("bangla") : t("english")}
    </Link>
  );
}

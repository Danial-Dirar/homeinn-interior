import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SkipLink } from "@/components/layout/skip-link";
import { routing } from "@/i18n/routing";
import { getSettings } from "@/lib/content";
import { fontVariables } from "@/lib/fonts";
import { fontClassFor } from "@/lib/typography";
import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const settings = await getSettings();

  return (
    <html lang={locale} className={fontVariables}>
      <body className={fontClassFor(locale)}>
        <NextIntlClientProvider>
          <SkipLink />
          <SiteHeader locale={locale} settings={settings} />
          {children}
          <SiteFooter locale={locale} settings={settings} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SkipLink } from "@/components/layout/skip-link";
import { WhatsAppFloat } from "@/components/layout/whatsapp-float";
import { SmoothScroll } from "@/components/motion/smooth-scroll";
import { JsonLd } from "@/components/seo/json-ld";
import { routing } from "@/i18n/routing";
import { getSettings } from "@/lib/content";
import { fontVariables } from "@/lib/fonts";
import { siteUrl } from "@/lib/env";
import { localBusinessJsonLd, organizationJsonLd, pageMetadata } from "@/lib/seo";
import { fontClassFor } from "@/lib/typography";
import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const resolved = hasLocale(routing.locales, locale) ? locale : routing.defaultLocale;
  const t = await getTranslations({ locale: resolved, namespace: "seo" });

  return {
    metadataBase: new URL(siteUrl()),
    ...pageMetadata({
      locale: resolved,
      path: "/",
      title: t("defaultTitle"),
      description: t("defaultDescription"),
    }),
    title: { default: t("defaultTitle"), template: t("titleTemplate", { page: "%s" }) },
  };
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
          <JsonLd data={localBusinessJsonLd(settings, locale)} />
          <JsonLd data={organizationJsonLd(settings, locale)} />
          <SmoothScroll />
          <SkipLink />
          <SiteHeader locale={locale} settings={settings} />
          {children}
          <SiteFooter locale={locale} settings={settings} />
          <WhatsAppFloat settings={settings} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

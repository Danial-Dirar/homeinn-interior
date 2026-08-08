import type { Locale } from "@homeinn/types";
import type { Metadata } from "next";
import type { SeoView, SiteSettingsView } from "./api.types";
import { siteUrl } from "./env";

const LOCALES: Locale[] = ["en", "bn"];

/** `/services` → `https://site/en/services`; `/` → `https://site/en`. */
export function canonicalFor(locale: Locale, path: string): string {
  const clean = path === "/" ? "" : path;
  return `${siteUrl()}/${locale}${clean}`;
}

/** Spec §11: hreflang alternates on every page, both locales, plus x-default. */
export function alternatesFor(locale: Locale, path: string) {
  const languages = Object.fromEntries(
    LOCALES.map((candidate) => [candidate, canonicalFor(candidate, path)]),
  ) as Record<Locale, string>;

  return {
    canonical: canonicalFor(locale, path),
    languages: { ...languages, "x-default": canonicalFor("en", path) },
  };
}

interface Fallback {
  title: string;
  description: string;
}

type SeoText = Pick<SeoView, "titleEn" | "titleBn" | "descriptionEn" | "descriptionBn">;

/**
 * The `Seo` model wins where it is filled, field by field. Nothing writes it
 * until Plan 1C's admin, so today every page takes the derivation — which is
 * why the fallback has to be good rather than a placeholder.
 */
export function metadataFromSeo(
  seo: SeoText | null,
  locale: Locale,
  fallback: Fallback,
): Fallback {
  const title = (locale === "bn" ? seo?.titleBn : seo?.titleEn) ?? "";
  const description = (locale === "bn" ? seo?.descriptionBn : seo?.descriptionEn) ?? "";

  return {
    title: title.trim() || fallback.title,
    description: description.trim() || fallback.description,
  };
}

export function pageMetadata({
  locale,
  path,
  title,
  description,
  image,
}: {
  locale: Locale;
  path: string;
  title: string;
  description: string;
  image?: string;
}): Metadata {
  return {
    title,
    description,
    alternates: alternatesFor(locale, path),
    openGraph: {
      title,
      description,
      url: canonicalFor(locale, path),
      siteName: "Home Inn Interior Solution",
      locale: locale === "bn" ? "bn_BD" : "en_US",
      type: "website",
      images: image ? [{ url: image }] : undefined,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

/** schema.org accepts a list, and both lines are genuinely answered. */
function telephones(settings: SiteSettingsView): string | string[] {
  const second = settings.phoneSecondary?.trim();
  return second ? [settings.phone, second] : settings.phone;
}

function socialProfiles(settings: SiteSettingsView): string[] {
  return [settings.facebookUrl, settings.instagramUrl, settings.youtubeUrl].filter(
    (url): url is string => Boolean(url),
  );
}

/** The real NAP from `SiteSettings`. Nothing here is invented (spec §12). */
export function localBusinessJsonLd(settings: SiteSettingsView, locale: Locale) {
  const address = locale === "bn" ? settings.addressBn : settings.addressEn;

  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "Home Inn Interior Solution",
    url: canonicalFor(locale, "/"),
    telephone: telephones(settings),
    email: settings.email,
    foundingDate: String(settings.establishedYear),
    address: {
      "@type": "PostalAddress",
      streetAddress: address,
      addressLocality: "Dhaka",
      addressCountry: "BD",
    },
    openingHours: locale === "bn" ? settings.hoursBn : settings.hoursEn,
    sameAs: socialProfiles(settings),
  };
}

export function organizationJsonLd(settings: SiteSettingsView, locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Home Inn Interior Solution",
    url: canonicalFor(locale, "/"),
    email: settings.email,
    telephone: telephones(settings),
    foundingDate: String(settings.establishedYear),
    sameAs: socialProfiles(settings),
  };
}

export function breadcrumbJsonLd(locale: Locale, trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: canonicalFor(locale, crumb.path),
    })),
  };
}

export function articleJsonLd(
  post: {
    slug: string;
    titleEn: string; titleBn: string;
    excerptEn: string; excerptBn: string;
    publishedAt: string | null;
  },
  locale: Locale,
) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: locale === "bn" ? post.titleBn : post.titleEn,
    description: locale === "bn" ? post.excerptBn : post.excerptEn,
    datePublished: post.publishedAt ?? undefined,
    mainEntityOfPage: canonicalFor(locale, `/blog/${post.slug}`),
    author: { "@type": "Organization", name: "Home Inn Interior Solution" },
  };
}

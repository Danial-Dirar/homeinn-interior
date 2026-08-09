"use client";

import type { Locale } from "@homeinn/types";
import { Button, Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@homeinn/ui";
import { Menu } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import type { SiteSettingsView } from "@/lib/api.types";
import { useScrolled } from "@/hooks/use-scrolled";
import { LocaleSwitcher } from "./locale-switcher";
import { SocialLinks } from "./social-links";

const ROUTES = [
  { href: "/", key: "home" },
  { href: "/about", key: "about" },
  { href: "/services", key: "services" },
  { href: "/projects", key: "projects" },
  { href: "/clients", key: "clients" },
  { href: "/blog", key: "blog" },
  { href: "/contact", key: "contact" },
] as const;

/**
 * Spec §6: thin and near-transparent over the hero, gaining a background on
 * scroll. The seven labels render twice — desktop nav and mobile sheet — which
 * is why the tests match on `getAllByRole`.
 */
export function SiteHeader({ locale, settings }: { locale: Locale; settings: SiteSettingsView }) {
  const t = useTranslations("nav");
  const common = useTranslations("common");
  const scrolled = useScrolled();
  // Only the home page opens on a dark hero. Everywhere else the page ground is
  // `bone`, and sand-on-bone is 1.18:1 — the nav would simply be invisible.
  // Even over the hero the bar keeps an ink scrim rather than going fully
  // transparent: legibility must not depend on what happens to be behind it.
  const overHero = usePathname() === "/" && !scrolled;

  return (
    <header
      className={[
        "fixed inset-x-0 top-0 z-50 text-sand transition-colors duration-300",
        overHero ? "bg-ink/80 backdrop-blur-sm" : "bg-ink/95 backdrop-blur-sm",
      ].join(" ")}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-5">
        <Link href="/" className="font-display text-lg tracking-tight">
          {common("brand")}
        </Link>

        <nav aria-label={t("menu")} className="hidden items-center gap-7 lg:flex">
          {ROUTES.map((route) => (
            <Link key={route.href} href={route.href} className="text-sm hover:text-brand">
              {t(route.key)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <LocaleSwitcher locale={locale} />
          <SocialLinks
            settings={settings}
            className="hidden items-center gap-3 sm:flex"
          />

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="lg:hidden" aria-label={t("menu")}>
                <Menu aria-hidden="true" className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-ink text-sand">
              <SheetTitle className="heading">{t("menu")}</SheetTitle>
              <nav className="mt-8 flex flex-col gap-5">
                {ROUTES.map((route) => (
                  <SheetClose asChild key={route.href}>
                    <Link href={route.href} className="text-lg">
                      {t(route.key)}
                    </Link>
                  </SheetClose>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

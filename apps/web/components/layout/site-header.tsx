"use client";

import type { Locale } from "@homeinn/types";
import { Button, Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@homeinn/ui";
import { Menu } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import type { SiteSettingsView } from "@/lib/api.types";
import { useScrolled } from "@/hooks/use-scrolled";
import { Wordmark } from "@/components/brand/wordmark";
import { LocaleSwitcher } from "./locale-switcher";
import { NewFlag } from "./new-flag";
import { SocialLinks } from "./social-links";
import { ThemeToggle } from "./theme-toggle";

/**
 * Nav order, and it is deliberate: the work comes before the company. A visitor
 * lands wanting to know what we do and what we have built, so About sits late,
 * just before Contact.
 */
const ROUTES = [
  { href: "/", key: "home" },
  // Where the blog was: it has no posts yet, and the company now starts from
  // architecture. /blog still exists; only the link moved.
  { href: "/services/architectural-design", key: "architecture" },
  { href: "/services", key: "services" },
  { href: "/projects", key: "projects" },
  { href: "/furniture", key: "furniture", flag: "new" },
  { href: "/clients", key: "clients" },
  { href: "/about", key: "about" },
  { href: "/contact", key: "contact" },
] as const;

/**
 * Spec §6: thin and near-transparent over the hero, gaining a background on
 * scroll. The seven labels render twice — desktop nav and mobile sheet — which
 * is why the tests match on `getAllByRole`.
 */
export function SiteHeader({ locale, settings }: { locale: Locale; settings: SiteSettingsView }) {
  const t = useTranslations("nav");
  const scrolled = useScrolled();
  // Only the home page opens on a dark hero. Everywhere else the page ground is
  // `bone`, and sand-on-bone is 1.18:1 — the nav would simply be invisible.
  // Even over the hero the bar keeps an ink scrim rather than going fully
  // transparent: legibility must not depend on what happens to be behind it.
  // The cream scrim can be thinner than the ink one: charcoal on cream at 55%
  // clears 4.5:1 over black, cream on ink needs 75% to clear it over white.
  const overHero = usePathname() === "/" && !scrolled;

  return (
    <header
      className={[
        "ground-ink ground-chrome fixed inset-x-0 top-0 z-50 text-sand transition-colors duration-300",
        overHero
          ? "bg-ink/75 [[data-theme=light]_&]:bg-ink/55 backdrop-blur-md"
          : "bg-ink/95 backdrop-blur-sm",
      ].join(" ")}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:gap-6">
        {/* `min-w-0` stays load-bearing: a flex item defaults to
            `min-width: auto` and will not shrink, which once pushed the menu
            button off a phone screen. */}
        <Link href="/" className="min-w-0 shrink-0 text-2xl sm:text-[1.7rem]">
          <Wordmark tone="ink" />
        </Link>

        <nav aria-label={t("menu")} className="hidden items-center gap-7 lg:flex">
          {ROUTES.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className="relative text-sm hover:text-accent"
            >
              {t(route.key)}
              {"flag" in route ? <NewFlag /> : null}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-4">
          <LocaleSwitcher locale={locale} />
          <ThemeToggle />
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
            <SheetContent side="right" className="ground-ink bg-ink text-sand">
              <SheetTitle className="heading">{t("menu")}</SheetTitle>
              <nav className="mt-8 flex flex-col gap-5">
                {ROUTES.map((route) => (
                  <SheetClose asChild key={route.href}>
                    <Link href={route.href} className="relative w-fit text-lg">
                      {t(route.key)}
                      {"flag" in route ? <NewFlag /> : null}
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

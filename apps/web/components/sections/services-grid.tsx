import type { Locale } from "@homeinn/types";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ServiceView } from "@/lib/api.types";
import { iconFor } from "@/lib/icons";
import { text } from "@/lib/locale-text";
import { Section } from "./section";

/** `bare` drops the section header, for pages that carry their own `<h1>`. */
export function ServicesGrid({
  locale,
  services,
  bare = false,
}: {
  locale: Locale;
  services: ServiceView[];
  bare?: boolean;
}) {
  const t = useTranslations("home");
  const s = useTranslations("services");

  return (
    <Section
      numeral={bare ? undefined : "02"}
      eyebrow={bare ? undefined : t("servicesEyebrow")}
      title={bare ? undefined : t("servicesTitle")}
      tone="bone"
    >
      {services.length === 0 ? (
        <p className="text-ink/60">{s("empty")}</p>
      ) : (
        <ul className="grid gap-px border border-ink/10 bg-ink/10 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => {
            const Icon = iconFor(service.icon);
            return (
              <li key={service.id} className="bg-bone">
                <Link
                  href={`/services/${service.slug}`}
                  className="flex h-full flex-col gap-4 p-8 transition-colors hover:bg-sand/40"
                >
                  <Icon aria-hidden="true" className="size-7 text-walnut" />
                  <h3 className="heading">{text(service, "title", locale)}</h3>
                  <p className="text-sm text-ink/70">{text(service, "summary", locale)}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}

import type { Locale } from "@homeinn/types";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { LeadForm } from "@/components/forms/lead-form";
import { Picture } from "@/components/media/picture";
import { RichText } from "@/components/rich-text";
import { getService, getServices } from "@/lib/content";
import { text } from "@/lib/locale-text";

export async function generateStaticParams() {
  const services = await getServices();
  return services.map((service) => ({ slug: service.slug }));
}

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const service = await getService(slug);
  if (!service) notFound();

  const services = await getServices();
  const t = await getTranslations("services");

  return (
    <main id="main" className="bg-bone">
      {service.cover ? (
        <Picture
          media={service.cover}
          locale={locale}
          sizes="100vw"
          priority
          className="h-[46svh] w-full object-cover"
        />
      ) : null}

      <div className="mx-auto max-w-7xl px-5 py-28">
        <h1 className="display-1 max-w-4xl">{text(service, "title", locale)}</h1>
        <p className="mt-6 max-w-2xl text-lg text-ink/70">{text(service, "summary", locale)}</p>

        <div className="mt-16 grid gap-16 lg:grid-cols-[2fr_1fr]">
          <RichText
            html={text(service, "body", locale)}
            className="max-w-2xl space-y-4 [&_a]:text-brand [&_a]:underline [&_li]:ml-5 [&_li]:list-disc"
          />

          <aside className="border border-ink/10 p-8">
            <h2 className="heading">{t("enquire")}</h2>
            <div className="mt-6">
              <LeadForm
                locale={locale}
                services={services}
                sourcePath={`/${locale}/services/${slug}`}
                defaultType="QUOTE"
              />
            </div>
          </aside>
        </div>

        {service.gallery.length > 0 ? (
          <section className="mt-24">
            <h2 className="heading">{t("gallery")}</h2>
            <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {service.gallery.map((image) => (
                <li key={image.id}>
                  <Picture
                    media={image}
                    locale={locale}
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="aspect-[3/2] w-full object-cover"
                  />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </main>
  );
}

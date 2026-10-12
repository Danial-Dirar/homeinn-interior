import type { Locale } from "@homeinn/types";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { LeadForm } from "@/components/forms/lead-form";
import { Picture } from "@/components/media/picture";
import { JsonLd } from "@/components/seo/json-ld";
import { Link } from "@/i18n/navigation";
import { getProduct, getProducts, getServices } from "@/lib/content";
import { text } from "@/lib/locale-text";
import { largestSrc } from "@/lib/media";
import { formatTaka } from "@/lib/money";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

export async function generateStaticParams() {
  const products = await getProducts();
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const product = await getProduct(slug);
  if (!product) return {};

  return pageMetadata({
    locale,
    path: `/furniture/${slug}`,
    title: text(product, "name", locale),
    description: text(product, "summary", locale),
    image: product.cover ? largestSrc(product.cover.sources[1]?.srcset ?? "") : undefined,
  });
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const product = await getProduct(slug);
  if (!product) notFound();

  const [services, t] = await Promise.all([getServices(), getTranslations("furniture")]);

  return (
    <main id="main" className="bg-bone">
      <JsonLd
        data={breadcrumbJsonLd(locale, [
          { name: t("title"), path: "/furniture" },
          { name: text(product, "name", locale), path: `/furniture/${slug}` },
        ])}
      />

      <div className="mx-auto grid max-w-7xl gap-14 px-5 py-28 lg:grid-cols-2 lg:gap-20">
        <div>
          {product.cover ? (
            <Picture
              media={product.cover}
              locale={locale}
              sizes="(min-width: 1024px) 45vw, 90vw"
              priority
              className="aspect-[4/5] w-full object-cover"
            />
          ) : null}

          {product.gallery.length > 0 ? (
            <ul className="mt-4 grid grid-cols-3 gap-4">
              {product.gallery.map((image) => (
                <li key={image.id}>
                  <Picture
                    media={image}
                    locale={locale}
                    sizes="15vw"
                    className="aspect-square w-full object-cover"
                  />
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="lg:pt-6">
          <Link href="/furniture" className="eyebrow text-ink/70 hover:text-accent">
            {t("backToFurniture")}
          </Link>

          <h1 className="display-1 mt-4">{text(product, "name", locale)}</h1>
          <p className="mt-6 text-lg text-ink/70">{text(product, "summary", locale)}</p>

          <dl className="mt-10 flex flex-wrap gap-x-12 gap-y-4 border-y border-ink/10 py-6">
            <div>
              <dt className="eyebrow text-ink/70">{t("madeToOrder")}</dt>
              <dd className="display-2 mt-1">
                {product.priceBdt === null
                  ? t("onRequest")
                  : formatTaka(product.priceBdt, locale)}
              </dd>
            </div>
            {product.leadTimeDays ? (
              <div>
                <dt className="eyebrow text-ink/70">{t("leadTime", { days: product.leadTimeDays })}</dt>
              </div>
            ) : null}
          </dl>

          <div className="mt-10">
            <h2 className="heading">{t("order")}</h2>
            {/* Checkout, accounts and bKash are the next chunk of work. Until
                they exist this is a real, working path rather than a dead
                button: the enquiry reaches the same inbox a lead does. */}
            <p className="mt-2 text-sm text-ink/70">{t("orderNote")}</p>
            <div className="mt-6">
              <LeadForm
                locale={locale}
                services={services}
                sourcePath={`/${locale}/furniture/${slug}`}
                defaultType="QUOTE"
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

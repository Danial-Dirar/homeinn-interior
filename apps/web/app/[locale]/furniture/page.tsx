import type { Locale } from "@homeinn/types";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CustomBuiltPanel } from "@/components/furniture/custom-built-panel";
import { ProductCatalogue } from "@/components/furniture/product-catalogue";
import { getProducts } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "furniture" });
  return pageMetadata({
    locale,
    path: "/furniture",
    title: t("title"),
    description: t("intro"),
  });
}

export default async function FurniturePage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const products = await getProducts();
  const t = await getTranslations("furniture");

  return (
    <main id="main" className="bg-bone">
      <div className="mx-auto max-w-7xl px-5 pt-28">
        <h1 className="display-1">{t("title")}</h1>
        <p className="mt-6 max-w-2xl text-lg text-ink/70">{t("intro")}</p>
      </div>

      {/* Catalogue left, the custom-built panel right and sticky — it holds
          while the pieces scroll past, which is the point it is making. */}
      <div className="mx-auto grid max-w-7xl gap-14 px-5 py-20 lg:grid-cols-[1.6fr_1fr] lg:gap-20">
        {products.length === 0 ? (
          <p className="text-ink/60">{t("empty")}</p>
        ) : (
          <ProductCatalogue products={products} locale={locale} />
        )}

        <CustomBuiltPanel />
      </div>
    </main>
  );
}

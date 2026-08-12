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
      <div className="mx-auto max-w-7xl px-5 pb-24 pt-28">
        {products.length === 0 ? (
          <>
            <h1 className="display-1">{t("title")}</h1>
            <p className="mt-6 max-w-2xl text-lg text-ink/70">{t("empty")}</p>
          </>
        ) : (
          // The catalogue owns both rows so the filter state can sit with the
          // controls while they live up beside the title.
          <ProductCatalogue
            products={products}
            locale={locale}
            title={t("title")}
            intro={t("intro")}
            aside={<CustomBuiltPanel />}
          />
        )}
      </div>
    </main>
  );
}

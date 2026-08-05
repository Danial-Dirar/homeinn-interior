import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("common");

  return (
    <main className="p-8">
      <h1 className="display-1">{t("brand")}</h1>
      <p className="eyebrow">{t("tagline")}</p>
    </main>
  );
}

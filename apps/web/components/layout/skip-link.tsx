import { useTranslations } from "next-intl";

export function SkipLink() {
  const t = useTranslations("common");
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:absolute focus:z-60 focus:m-3 focus:bg-brand focus:px-4 focus:py-2 focus:text-bone"
    >
      {t("skipToContent")}
    </a>
  );
}

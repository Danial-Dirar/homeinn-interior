import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("errors");
  const common = useTranslations("common");

  return (
    <main id="main" className="bg-ink text-sand">
      <div className="mx-auto flex min-h-[70svh] max-w-3xl flex-col justify-center px-5">
        <p className="section-numeral">404</p>
        <h1 className="display-1 mt-4">{t("notFoundTitle")}</h1>
        <p className="mt-6 text-sand-dim">{t("notFoundBody")}</p>
        <Link href="/" className="mt-10 underline underline-offset-4 hover:text-brand">
          {common("backHome")}
        </Link>
      </div>
    </main>
  );
}

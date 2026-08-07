"use client";

import { Button } from "@homeinn/ui";
import { useTranslations } from "next-intl";

export default function ErrorBoundary({ reset }: { error: Error; reset: () => void }) {
  const t = useTranslations("errors");

  return (
    <main id="main" className="bg-ink text-sand">
      <div className="mx-auto flex min-h-[70svh] max-w-3xl flex-col justify-center px-5">
        <h1 className="display-1">{t("errorTitle")}</h1>
        <p className="mt-6 text-sand-dim">{t("errorBody")}</p>
        <div className="mt-10">
          <Button onClick={reset}>{t("retry")}</Button>
        </div>
      </div>
    </main>
  );
}

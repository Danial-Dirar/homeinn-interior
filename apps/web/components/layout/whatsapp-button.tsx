import { useTranslations } from "next-intl";
import { whatsappHref } from "@/lib/whatsapp";
import { WhatsAppIcon } from "./whatsapp-icon";

export function WhatsAppButton({ number, className }: { number: string; className?: string }) {
  const t = useTranslations("common");

  return (
    <a
      href={whatsappHref(number)}
      target="_blank"
      rel="noreferrer noopener"
      aria-label={t("whatsapp")}
      className={className}
    >
      <WhatsAppIcon className="size-5" />
      <span className="sr-only">{t("whatsapp")}</span>
    </a>
  );
}

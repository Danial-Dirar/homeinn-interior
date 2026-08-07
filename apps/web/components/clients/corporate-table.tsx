import type { Locale } from "@homeinn/types";
import { useTranslations } from "next-intl";
import type { CorporateClientView } from "@/lib/api.types";

/**
 * Spec §11: a company name and office address is ordinary commercial reference
 * material, so corporate entities are published by name. Serial is the profile's
 * own ordering and is preserved rather than re-sorted.
 */
export function CorporateTable({
  locale,
  clients,
}: {
  locale: Locale;
  clients: CorporateClientView[];
}) {
  const t = useTranslations("clients");

  if (clients.length === 0) {
    return <p className="max-w-xl text-ink/60">{t("corporateEmpty")}</p>;
  }

  const sorted = [...clients].sort((a, b) => a.serial - b.serial);
  const format = new Intl.NumberFormat(locale === "bn" ? "bn-BD" : "en-US");

  return (
    <table className="w-full border-collapse text-left text-sm">
      <caption className="sr-only">{t("corporateTitle")}</caption>
      <tbody>
        {sorted.map((client) => (
          <tr key={client.id} className="border-b border-ink/10 align-top">
            <th scope="row" className="w-16 py-3 pr-4 font-normal text-ink/40">
              {format.format(client.serial)}
            </th>
            <td className="py-3 pr-6">{client.companyName}</td>
            <td className="py-3 text-ink/60">{client.address}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

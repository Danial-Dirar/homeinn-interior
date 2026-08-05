/**
 * A wa.me deep link. Bangladeshi numbers are stored locally (`01760775454`)
 * and sometimes internationally (`+8801760775454`); wa.me needs digits with
 * the country code and no plus.
 */
export function whatsappHref(number: string, message?: string): string {
  const digits = number.replace(/\D/g, "");
  const international = digits.startsWith("880") ? digits : `880${digits.replace(/^0/, "")}`;
  const query = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${international}${query}`;
}

/**
 * TRUST_PROXY as Express's `trust proxy` setting. Express reads 1 as "one
 * hop" but the string "1" as an IP address (and throws at start-up), so
 * numbers and booleans are converted; anything else — "loopback", an address
 * list — passes through. Unset, the loopback proxy is trusted: a tunnel on
 * the same machine connects from there.
 */
export function trustProxySetting(raw: string | undefined): string | number | boolean {
  const value = raw?.trim();
  if (!value) return "loopback";
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^\d+$/.test(value)) return Number(value);
  return value;
}

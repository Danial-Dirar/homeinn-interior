/**
 * The "Home inn" wordmark (assets/), set as live text in Righteous rather than
 * shipped as a picture: it stays crisp at any size, costs no request, and a
 * screen reader reads the company's name.
 *
 * "inn" is always the cream logo's exact burnt orange. "Home" takes the
 * ground's foreground: cream on ink, charcoal on bone — and on the light
 * theme's flipped ink ground `text-bone` resolves to charcoal, so the header
 * reads exactly like the logo file. It is a logo, so it stays in Latin on
 * Bangla pages too.
 */
export function Wordmark({
  tone = "ink",
  className = "",
}: {
  tone?: "ink" | "bone";
  className?: string;
}) {
  return (
    <span className={`font-display whitespace-nowrap leading-none ${className}`}>
      <span className={tone === "ink" ? "text-bone" : "text-ink"}>Home</span>{" "}
      <span className="text-logo">inn</span>
    </span>
  );
}

import type { Locale } from "@homeinn/types";
import { Marquee } from "@homeinn/ui";
import { useTranslations } from "next-intl";
import { Picture } from "@/components/media/picture";
import type { ClientLogoView } from "@/lib/api.types";

/** Below this the loop is short enough that the duplicate track is obvious. */
const MIN_FOR_MARQUEE = 4;

/** Seconds per full pass, per logo — keeps the pace even as the list grows. */
const SECONDS_PER_LOGO = 6;

function Logo({ client, locale }: { client: ClientLogoView; locale: Locale }) {
  const mark = (
    <Picture
      media={client.logo}
      locale={locale}
      sizes="200px"
      className="h-12 w-auto max-w-[200px] object-contain md:h-14"
      // A logo is mostly transparent. `Picture` paints the blurhash average
      // behind every image, which is right for a photograph and turns a black
      // wordmark into a black rectangle here.
      style={{ backgroundColor: "transparent" }}
    />
  );

  // Linked where we know the site, so the wall is checkable rather than
  // decorative. `rel="noopener"` because these open in a new tab.
  return client.website ? (
    <a
      href={client.website}
      target="_blank"
      rel="noreferrer noopener"
      aria-label={client.name}
      className="shrink-0 opacity-80 transition-opacity hover:opacity-100"
    >
      {mark}
    </a>
  ) : (
    <span className="shrink-0 opacity-80">{mark}</span>
  );
}

/**
 * The wall of client marks.
 *
 * A marquee once there are enough logos to fill a screen; a plain centred row
 * below that, because a short loop reads as the same three logos going round
 * rather than as a long client list. Renders nothing when empty — the same
 * honest-content rule the rest of the site follows.
 */
export function ClientLogoWall({
  locale,
  clients,
}: {
  locale: Locale;
  clients: ClientLogoView[];
}) {
  const t = useTranslations("clients");

  if (clients.length === 0) return null;

  return (
    <section aria-labelledby="client-logos">
      <h2 id="client-logos" className="display-2">{t("logosTitle")}</h2>
      <p className="mt-4 max-w-xl text-ink/70">{t("logosIntro")}</p>

      <div className="mt-10 border-y border-ink/10 py-8">
        {clients.length >= MIN_FOR_MARQUEE ? (
          <Marquee speedSeconds={clients.length * SECONDS_PER_LOGO}>
            {clients.map((client) => (
              <Logo key={client.id} client={client} locale={locale} />
            ))}
          </Marquee>
        ) : (
          <ul className="flex flex-wrap items-center justify-center gap-x-12 gap-y-8">
            {clients.map((client) => (
              <li key={client.id}>
                <Logo client={client} locale={locale} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

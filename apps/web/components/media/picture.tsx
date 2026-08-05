import type { Locale } from "@homeinn/types";
import type { CSSProperties } from "react";
import type { MediaView } from "@/lib/api.types";
import { blurhashAverageColor, largestSrc } from "@/lib/media";

interface PictureProps {
  media: MediaView;
  locale: Locale;
  /** The `sizes` attribute. Get this right or the browser downloads the 1920. */
  sizes: string;
  /** Set on the LCP element only — the first hero segment (spec §7). */
  priority?: boolean;
  className?: string;
  /** Merged over the blurhash ground — `objectPosition` for a focal crop, say. */
  style?: CSSProperties;
}

/**
 * Renders the API's own AVIF/WebP derivatives. Deliberately not `next/image`:
 * the sharp pipeline in `apps/api` has already produced every width in both
 * formats, and re-encoding them through the Next loader would repeat that work.
 */
export function Picture({
  media, locale, sizes, priority = false, className, style,
}: PictureProps) {
  const webp = media.sources.find((source) => source.type === "image/webp");
  const alt = locale === "bn" ? media.altBn : media.altEn;

  return (
    <picture>
      {media.sources.map((source) => (
        <source key={source.type} type={source.type} srcSet={source.srcset} sizes={sizes} />
      ))}
      <img
        src={largestSrc(webp?.srcset ?? media.sources[0]?.srcset ?? "")}
        alt={alt}
        width={media.width}
        height={media.height}
        sizes={sizes}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding={priority ? "sync" : "async"}
        className={className}
        style={{ backgroundColor: blurhashAverageColor(media.blurhash), ...style }}
      />
    </picture>
  );
}

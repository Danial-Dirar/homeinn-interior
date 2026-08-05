import type { Locale } from "@homeinn/types";
import { Picture } from "@/components/media/picture";
import type { HeroSegmentView } from "@/lib/api.types";
import { text, textOrNull } from "@/lib/locale-text";

/**
 * The reduced-motion hero: the same rooms, the same labels, ordinary vertical
 * scroll. Spec §7 calls this a first-class layout, not a fallback, so it gets
 * the full-bleed treatment rather than a shrunken one.
 */
export function HeroStack({ segments, locale }: { segments: HeroSegmentView[]; locale: Locale }) {
  return (
    <div className="bg-ink text-sand">
      {segments.map((segment, index) => {
        const caption = textOrNull(segment, "caption", locale);
        return (
          <figure key={segment.id} className="relative">
            <Picture
              media={segment.image}
              locale={locale}
              sizes="100vw"
              priority={index === 0}
              className="h-[70svh] w-full object-cover"
            />
            <figcaption className="absolute bottom-0 left-0 p-6">
              <p className="display-2">{text(segment, "label", locale)}</p>
              {caption ? <p className="mt-1 text-sand-dim">{caption}</p> : null}
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}

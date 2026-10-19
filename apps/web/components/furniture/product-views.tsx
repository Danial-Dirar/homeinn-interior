import type { Locale } from "@homeinn/types";
import { cn } from "@homeinn/ui";
import { Picture } from "@/components/media/picture";
import type { MediaView } from "@/lib/api.types";

/**
 * A furniture piece's cover, with its second view laid over it: the photo at
 * its real angle, and the same piece from the front (Muhammad, 2026-10-19).
 *
 * The second view settles in from a slight zoom when the nearest `group` is
 * hovered or holds keyboard focus, so the swap reads as turning to face the
 * piece. It sits on top rather than the cover fading out, so the frame never
 * dips to its ground in between. Touch screens cannot hover: there the two
 * take turns on their own (`[data-second-view]` in globals.css).
 *
 * Fills its parent, which sets the frame: `relative`, an aspect ratio and
 * `overflow-hidden`.
 */
export function ProductViews({
  cover,
  secondView,
  locale,
  sizes,
  priority = false,
  className,
}: {
  cover: MediaView | null;
  secondView: MediaView | null;
  locale: Locale;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <>
      {cover ? (
        <Picture
          media={cover}
          locale={locale}
          sizes={sizes}
          priority={priority}
          className={cn("h-full w-full object-cover", className)}
        />
      ) : null}
      {secondView ? (
        // The cover's alt text describes the piece; reading it twice helps no one.
        <div
          aria-hidden="true"
          data-second-view
          className={[
            "absolute inset-0 scale-[1.03] opacity-0 transition-[opacity,transform] duration-700 ease-out",
            "group-hover:scale-100 group-hover:opacity-100",
            "group-has-[:focus-visible]:scale-100 group-has-[:focus-visible]:opacity-100",
            "motion-reduce:transition-none",
          ].join(" ")}
        >
          <Picture media={secondView} locale={locale} sizes={sizes} className="h-full w-full object-cover" />
        </div>
      ) : null}
    </>
  );
}

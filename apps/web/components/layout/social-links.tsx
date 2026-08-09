import { Facebook, Instagram, Youtube, type LucideIcon } from "lucide-react";
import type { SiteSettingsView } from "@/lib/api.types";

const PROFILES = [
  { key: "facebookUrl", label: "Facebook", Icon: Facebook },
  { key: "instagramUrl", label: "Instagram", Icon: Instagram },
  { key: "youtubeUrl", label: "YouTube", Icon: Youtube },
] as const satisfies readonly { key: keyof SiteSettingsView; label: string; Icon: LucideIcon }[];

/**
 * The company's social profiles, as icons. Only the ones actually configured
 * render — a missing YouTube URL leaves no gap and no dead link.
 *
 * WhatsApp is deliberately not here: it is a conversation, not a profile to
 * browse, so it lives in the floating contact button and beside each phone
 * number instead.
 */
export function SocialLinks({
  settings,
  className,
}: {
  settings: SiteSettingsView;
  className?: string;
}) {
  return (
    <ul className={className}>
      {PROFILES.map(({ key, label, Icon }) => {
        const url = settings[key];
        if (!url || typeof url !== "string") return null;
        return (
          <li key={key}>
            <a
              href={url}
              target="_blank"
              rel="noreferrer noopener"
              aria-label={label}
              className="block transition-colors hover:text-brand"
            >
              <Icon aria-hidden="true" className="size-[1.15em]" />
            </a>
          </li>
        );
      })}
    </ul>
  );
}

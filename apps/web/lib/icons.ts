import {
  Blinds, Box, Building, CookingPot, Paintbrush, Ruler, Sofa, Sparkles, type LucideIcon,
} from "lucide-react";

/**
 * `Service.icon` holds a lucide name chosen in the CMS. Mapping explicitly
 * rather than importing the whole icon set keeps the bundle to the eight icons
 * this site actually renders.
 */
const ICONS: Record<string, LucideIcon> = {
  sofa: Sofa,
  paintbrush: Paintbrush,
  building: Building,
  ruler: Ruler,
  box: Box,
  blinds: Blinds,
  "cooking-pot": CookingPot,
};

export function iconFor(name: string): LucideIcon {
  return ICONS[name] ?? Sparkles;
}

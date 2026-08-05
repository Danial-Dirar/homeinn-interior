import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/** Use this `Link` everywhere. `next/link` would drop the locale prefix. */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);

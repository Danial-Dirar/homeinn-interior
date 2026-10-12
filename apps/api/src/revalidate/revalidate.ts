import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from "@nestjs/common";
import type { Observable } from "rxjs";
import { tap } from "rxjs";

/** Every cache tag the web app's page fetches carry (apps/web/lib/content.ts). */
export const ALL_TAGS = [
  "settings", "services", "working-areas", "projects", "hero", "blog", "testimonials",
  "team", "certifications", "products", "client-logos", "clients",
] as const;

/** First path segment after /api/ → the tags whose pages show that content. */
const TAGS_BY_ROUTE: Record<string, readonly string[]> = {
  settings: ["settings"],
  services: ["services"],
  // A working area's name appears on every project card and filter.
  "working-areas": ["working-areas", "projects"],
  projects: ["projects"],
  hero: ["hero"],
  blog: ["blog"],
  testimonials: ["testimonials"],
  team: ["team"],
  certifications: ["certifications"],
  products: ["products"],
  "client-logos": ["client-logos"],
  clients: ["clients"],
  // Alt text and images can appear on any page.
  media: ALL_TAGS,
};

const WRITES = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * The web cache tags a successful request invalidates, or null when it changes
 * nothing the public site shows: reads, logins, accounts, and enquiries (the
 * inbox is not on the public site).
 */
export function tagsForWrite(method: string, url: string): string[] | null {
  if (!WRITES.has(method.toUpperCase())) return null;
  const path = url.split("?")[0] ?? "";
  const segment = path.replace(/^\/+/, "").replace(/^api\//, "").split("/")[0] ?? "";
  const tags = Object.hasOwn(TAGS_BY_ROUTE, segment) ? TAGS_BY_ROUTE[segment] : undefined;
  return tags ? [...tags] : null;
}

export interface RevalidateConfig {
  url?: string;
  secret?: string;
}

type Fetcher = (url: string, init: RequestInit) => Promise<unknown>;

/**
 * Tells the web app which cached pages are stale. Off unless both the web
 * app's revalidate URL and the shared secret are set; without it an edit
 * reaches the site when the five-minute fetch cache expires. Never awaited and
 * never throws: a web app that is restarting must not fail an editor's save.
 */
@Injectable()
export class RevalidateNotifier {
  private readonly logger = new Logger(RevalidateNotifier.name);

  constructor(
    private readonly config: RevalidateConfig = {
      url: process.env.WEB_REVALIDATE_URL,
      secret: process.env.REVALIDATE_SECRET,
    },
    private readonly fetcher: Fetcher = (url, init) => fetch(url, init),
  ) {}

  send(tags: string[]): void {
    const { url, secret } = this.config;
    if (!url || !secret) return;
    let pending: Promise<unknown>;
    try {
      pending = this.fetcher(url, {
        method: "POST",
        headers: { "content-type": "application/json", "x-revalidate-secret": secret },
        body: JSON.stringify({ tags }),
      });
    } catch (error) {
      pending = Promise.reject(error);
    }
    pending.catch((error: unknown) => this.logger.warn(`Could not refresh ${tags.join(", ")}: ${String(error)}`));
  }
}

@Injectable()
export class RevalidateInterceptor implements NestInterceptor {
  constructor(private readonly notifier: RevalidateNotifier) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{ method: string; originalUrl?: string; url?: string }>();
    const tags = tagsForWrite(req.method, req.originalUrl ?? req.url ?? "");
    return next.handle().pipe(tap(() => {
      if (tags) this.notifier.send(tags);
    }));
  }
}

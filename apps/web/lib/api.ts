import { apiBaseUrl } from "./env";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface FetchOptions {
  /** Seconds. Content changes when an editor publishes, so five minutes is ample. */
  revalidate?: number;
  /** Cache tags, so Plan 1C's admin can revalidate a single resource on publish. */
  tags?: string[];
}

export async function apiGet<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const response = await fetch(`${apiBaseUrl()}${path}`, {
    headers: { accept: "application/json" },
    next: { revalidate: options.revalidate ?? 300, tags: options.tags },
  });

  if (!response.ok) {
    throw new ApiError(response.status, `GET ${path} responded ${response.status}`);
  }
  return (await response.json()) as T;
}

/** For detail routes: a 404 is a missing page, anything else is still an outage. */
export async function apiGetOrNull<T>(path: string, options?: FetchOptions): Promise<T | null> {
  try {
    return await apiGet<T>(path, options);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

/**
 * For optional sections only — testimonials, team, the corporate table. These
 * hide when empty anyway (spec §12), so an API hiccup should shrink the page
 * rather than take the whole home route down.
 */
export async function apiGetOr<T>(path: string, fallback: T, options?: FetchOptions): Promise<T> {
  try {
    return await apiGet<T>(path, options);
  } catch {
    return fallback;
  }
}

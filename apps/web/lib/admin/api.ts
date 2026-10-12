import { apiBaseUrl } from "@/lib/env";

/**
 * Every authenticated request the admin panel makes goes through here, so the
 * session rules live in one place rather than six slightly different copies.
 *
 * - Cookies always travel (`credentials: "include"`). The browser talks to the
 *   API directly, so per-address login limits stay per address.
 * - A 401 triggers one refresh and one retry.
 * - Requests that fail together share that refresh. Rotation invalidates the
 *   previous refresh token, so racing refreshes would sign the user out.
 * - When the refresh fails too, the panel goes to the login screen and comes
 *   back to the same page afterwards.
 */

export class AdminApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    /** Field name → problem, from the API's validation issues. */
    readonly fieldErrors: Record<string, string> = {},
  ) {
    super(message);
    this.name = "AdminApiError";
  }
}

let refreshing: Promise<boolean> | null = null;

const sendRefresh = () =>
  fetch(`${apiBaseUrl()}/auth/refresh`, { method: "POST", credentials: "include" })
    .then((res) => res.ok)
    .catch(() => false);

/**
 * One refresh at a time, in this tab and across tabs. Two tabs refreshing at
 * once would both send the same refresh token; the second reads as a stolen,
 * replayed token and the API ends every session. The Web Locks API queues
 * them, and the cookie the first one rotates is the one the second sends.
 */
function refreshOnce(): Promise<boolean> {
  if (refreshing) return refreshing;
  const locks = typeof navigator === "undefined" ? undefined : navigator.locks;
  const pending = (locks
    ? (locks.request("homeinn-admin-refresh", sendRefresh) as Promise<unknown>).then((ok) => ok === true)
    : sendRefresh())
    .finally(() => {
      refreshing = null;
    });
  refreshing = pending;
  return pending;
}

/** Where to go after signing in: a path inside the panel, never anywhere else. */
export function loginPathFor(next: string | null | undefined): string {
  return next && next.startsWith("/admins") && !next.startsWith("//") ? next : "/admins";
}

export function goToLogin(): void {
  const here = `${window.location.pathname}${window.location.search}`;
  window.location.assign(`/admins/login?next=${encodeURIComponent(here)}`);
}

export async function adminFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const send = () => fetch(`${apiBaseUrl()}${path}`, { ...init, credentials: "include" });

  const first = await send();
  if (first.status !== 401) return first;

  if (await refreshOnce()) {
    const second = await send();
    if (second.status !== 401) return second;
  }
  goToLogin();
  throw new AdminApiError(401, "Your session has ended. Please sign in again.");
}

async function errorFrom(res: Response): Promise<AdminApiError> {
  const body = (await res.json().catch(() => null)) as
    | { message?: string | string[]; issues?: { path?: (string | number)[]; message: string }[] }
    | null;
  const fieldErrors: Record<string, string> = {};
  for (const issue of body?.issues ?? []) {
    // A problem inside a list (`tags.3`, `galleryIds.0`) belongs to the list's field.
    const key = issue.path?.[0] !== undefined ? String(issue.path[0]) : "_";
    fieldErrors[key] ??= issue.message;
  }
  const message = Array.isArray(body?.message) ? body.message.join(" ") : body?.message;
  const fallback: Record<number, string> = {
    403: "Your account is not allowed to do that.",
    404: "That no longer exists.",
    409: "That conflicts with something that already exists.",
    429: "Too many attempts. Wait a while and try again.",
  };
  return new AdminApiError(res.status, message || fallback[res.status] || `Something went wrong (${res.status}).`, fieldErrors);
}

async function adminJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await adminFetch(path, init);
  if (!res.ok) throw await errorFrom(res);
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export function adminGet<T>(path: string): Promise<T> {
  return adminJson<T>(path);
}

export function adminSend<T>(method: "POST" | "PATCH" | "DELETE", path: string, body?: unknown): Promise<T> {
  return adminJson<T>(path, {
    method,
    ...(body === undefined ? {} : { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }),
  });
}

/** Uploads one image with its alt text in both languages. */
export function adminUpload<T>(file: File, altEn: string, altBn: string): Promise<T> {
  const form = new FormData();
  form.append("file", file);
  form.append("altEn", altEn);
  form.append("altBn", altBn);
  return adminJson<T>("/media", { method: "POST", body: form });
}

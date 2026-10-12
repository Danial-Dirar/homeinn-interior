import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Node 26 ships an experimental global `localStorage` that shadows jsdom's and
// is undefined unless Node runs with --localstorage-file. Point the global back
// at jsdom's real Storage so browser code is tested against a browser API.
const jsdomWindow = (globalThis as { jsdom?: { window: Window } }).jsdom?.window;
for (const key of ["localStorage", "sessionStorage"] as const) {
  if (jsdomWindow) {
    Object.defineProperty(globalThis, key, { value: jsdomWindow[key], configurable: true });
  }
}

// The App Router hooks have no implementation under jsdom. next-intl re-exports
// several of these from its navigation helpers, so the mock has to be complete.
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({ locale: "en" }),
  useRouter: () => ({
    push: vi.fn(), replace: vi.fn(), refresh: vi.fn(),
    back: vi.fn(), forward: vi.fn(), prefetch: vi.fn(),
  }),
  useSelectedLayoutSegment: () => null,
  useSelectedLayoutSegments: () => [],
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  RedirectType: { push: "push", replace: "replace" },
}));

import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

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

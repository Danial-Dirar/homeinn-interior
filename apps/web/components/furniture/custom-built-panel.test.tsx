import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import en from "@/messages/en.json";
import { renderWithIntl } from "@/test/render";
import { CustomBuiltPanel } from "./custom-built-panel";

beforeEach(() => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  }));
  vi.stubGlobal("IntersectionObserver", class { observe() {} disconnect() {} });
});
afterEach(() => vi.unstubAllGlobals());

describe("CustomBuiltPanel", () => {
  it("keeps its link reachable while it waits to build itself", () => {
    renderWithIntl(<CustomBuiltPanel />);
    expect(screen.getByRole("link", { name: en.furniture.customCta })).toBeInTheDocument();
  });
});

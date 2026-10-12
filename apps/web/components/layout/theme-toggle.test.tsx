import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { THEME_KEY } from "@/lib/theme";
import { renderWithIntl } from "@/test/render";
import { ThemeToggle } from "./theme-toggle";

afterEach(() => {
  localStorage.clear();
  document.documentElement.dataset.theme = "light";
});

describe("ThemeToggle", () => {
  it("starts light and offers to turn the lights off", () => {
    renderWithIntl(<ThemeToggle />);
    expect(screen.getByRole("button", { name: "Lights off" })).toHaveAttribute("aria-pressed", "true");
  });

  it("switches the page to the dark theme and remembers it", async () => {
    renderWithIntl(<ThemeToggle />);
    await userEvent.click(screen.getByRole("button", { name: "Lights off" }));

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem(THEME_KEY)).toBe("dark");
    expect(screen.getByRole("button", { name: "Lights on" })).toHaveAttribute("aria-pressed", "false");
  });

  it("switches back to light", async () => {
    renderWithIntl(<ThemeToggle />);
    await userEvent.click(screen.getByRole("button", { name: "Lights off" }));
    await userEvent.click(screen.getByRole("button", { name: "Lights on" }));

    expect(document.documentElement.dataset.theme).toBe("light");
    expect(localStorage.getItem(THEME_KEY)).toBe("light");
  });

  it("picks up a theme the boot script already applied", () => {
    document.documentElement.dataset.theme = "dark";
    renderWithIntl(<ThemeToggle />);
    expect(screen.getByRole("button", { name: "Lights on" })).toBeInTheDocument();
  });

  it("speaks Bangla on bn pages", () => {
    renderWithIntl(<ThemeToggle />, { locale: "bn" });
    expect(screen.getByRole("button", { name: "আলো নেভান" })).toBeInTheDocument();
  });

  it("draws a lamp, not a sun or moon, and keeps it out of the accessible name", () => {
    const { container } = renderWithIntl(<ThemeToggle />);
    const icon = container.querySelector("svg");
    expect(icon).toHaveClass("lucide-lamp-ceiling");
    expect(icon).toHaveAttribute("aria-hidden", "true");
  });
});

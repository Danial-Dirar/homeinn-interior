import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { BlogPostView } from "@/lib/api.types";
import { renderWithIntl } from "@/test/render";
import { PostCard } from "./post-card";

const post: BlogPostView = {
  id: "b1", slug: "choosing-plywood",
  titleEn: "Choosing plywood", titleBn: "প্লাইউড বাছাই",
  excerptEn: "What to look for.", excerptBn: "কী দেখবেন।",
  bodyEn: "<p>x</p>", bodyBn: "<p>x</p>",
  tags: ["materials"], published: true,
  publishedAt: "2026-03-14T00:00:00.000Z", cover: null,
};

describe("PostCard", () => {
  it("links to the post", () => {
    renderWithIntl(<PostCard locale="en" post={post} />);
    expect(screen.getByRole("link", { name: /Choosing plywood/ }))
      .toHaveAttribute("href", "/en/blog/choosing-plywood");
  });

  it("shows the excerpt and the published date", () => {
    renderWithIntl(<PostCard locale="en" post={post} />);
    expect(screen.getByText("What to look for.")).toBeInTheDocument();
    expect(screen.getByText(/14 March 2026/)).toBeInTheDocument();
  });

  it("renders Bangla for bn", () => {
    renderWithIntl(<PostCard locale="bn" post={post} />, { locale: "bn" });
    expect(screen.getByText("প্লাইউড বাছাই")).toBeInTheDocument();
  });

  it("omits the date line for an undated post", () => {
    renderWithIntl(<PostCard locale="en" post={{ ...post, publishedAt: null }} />);
    expect(screen.queryByText(/Published/)).not.toBeInTheDocument();
  });
});

import { BlogService } from "./blog.service";

/** The media serialiser is exercised in media.service.spec; here it is inert. */
const fakeMedia = {
  toPublic: (m: unknown) => m,
  view: (m: unknown) => m ?? null,
  viewMany: (rows: unknown[]) => rows,
} as never;


const yesterday = new Date(Date.now() - 86_400_000);
const tomorrow = new Date(Date.now() + 86_400_000);

const posts = [
  { slug: "live", published: true, publishedAt: yesterday },
  { slug: "scheduled", published: true, publishedAt: tomorrow },
  { slug: "draft", published: false, publishedAt: yesterday },
  { slug: "published-but-undated", published: true, publishedAt: null },
];

function fakePrisma() {
  return {
    blogPost: {
      findMany: async ({ where }: { where?: { published?: boolean; publishedAt?: { lte: Date } } }) =>
        posts.filter((p) => {
          if (where?.published !== undefined && p.published !== where.published) return false;
          if (where?.publishedAt) return p.publishedAt !== null && p.publishedAt <= where.publishedAt.lte;
          return true;
        }),
      create: async ({ data }: { data: Record<string, unknown> }) => data,
      // Slug generation asks whether a candidate is already taken.
      count: async () => 0,
    },
  };
}

describe("BlogService", () => {
  it("listPublic returns a post whose publish date has passed", async () => {
    const svc = new BlogService(fakePrisma() as never, fakeMedia);
    expect((await svc.listPublic()).map((p) => p.slug)).toContain("live");
  });

  it("listPublic hides a future-dated post", async () => {
    const svc = new BlogService(fakePrisma() as never, fakeMedia);
    expect((await svc.listPublic()).map((p) => p.slug)).not.toContain("scheduled");
  });

  it("listPublic hides a draft", async () => {
    const svc = new BlogService(fakePrisma() as never, fakeMedia);
    expect((await svc.listPublic()).map((p) => p.slug)).not.toContain("draft");
  });

  it("listAll keeps drafts and scheduled posts", async () => {
    const svc = new BlogService(fakePrisma() as never, fakeMedia);
    expect(await svc.listAll()).toHaveLength(4);
  });

  it("stamps publishedAt when a post is created already published without a date", async () => {
    const svc = new BlogService(fakePrisma() as never, fakeMedia);
    const row = await svc.create({
      titleEn: "T", titleBn: "ট", excerptEn: "E", excerptBn: "ই",
      bodyEn: "B", bodyBn: "ব", tags: [], published: true,
    });
    expect(row.publishedAt).toBeInstanceOf(Date);
  });

  it("leaves publishedAt unset on a draft", async () => {
    const svc = new BlogService(fakePrisma() as never, fakeMedia);
    const row = await svc.create({
      titleEn: "T", titleBn: "ট", excerptEn: "E", excerptBn: "ই",
      bodyEn: "B", bodyBn: "ব", tags: [], published: false,
    });
    expect(row.publishedAt).toBeUndefined();
  });
});

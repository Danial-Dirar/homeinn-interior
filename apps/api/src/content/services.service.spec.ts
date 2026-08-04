import { ServicesService } from "./services.service";

function fakePrisma(rows: { slug: string; published: boolean }[]) {
  return {
    service: {
      findMany: async ({ where }: { where?: { published?: boolean } }) =>
        rows.filter((r) => (where?.published === undefined ? true : r.published === where.published)),
      findFirst: async ({ where }: { where: { slug: string; published?: boolean } }) =>
        rows.find((r) => r.slug === where.slug &&
          (where.published === undefined || r.published === where.published)) ?? null,
    },
  };
}

const rows = [
  { slug: "interior-design", published: true },
  { slug: "draft-thing", published: false },
];

describe("ServicesService", () => {
  it("listPublic returns only published rows", async () => {
    const svc = new ServicesService(fakePrisma(rows) as never);
    const out = await svc.listPublic();
    expect(out.map((r) => r.slug)).toEqual(["interior-design"]);
  });

  it("listAll returns drafts too", async () => {
    const svc = new ServicesService(fakePrisma(rows) as never);
    expect(await svc.listAll()).toHaveLength(2);
  });

  it("findPublicBySlug returns null for a draft", async () => {
    const svc = new ServicesService(fakePrisma(rows) as never);
    expect(await svc.findPublicBySlug("draft-thing")).toBeNull();
  });
});

import { HeroService } from "./hero.service";

/** The media serialiser is exercised in media.service.spec; here it is inert. */
const fakeMedia = {
  toPublic: (m: unknown) => m,
  view: (m: unknown) => m ?? null,
  viewMany: (rows: unknown[]) => rows,
} as never;


const segments = [
  { id: "1", sortOrder: 0, active: true, showOnMobile: true },
  { id: "2", sortOrder: 1, active: true, showOnMobile: false },
  { id: "3", sortOrder: 2, active: false, showOnMobile: true },
  { id: "4", sortOrder: 3, active: true, showOnMobile: true },
];

function fakePrisma() {
  return {
    heroSegment: {
      findMany: async ({ where }: { where: { active: boolean; showOnMobile?: boolean } }) =>
        segments
          .filter((s) => s.active === where.active)
          .filter((s) => where.showOnMobile === undefined || s.showOnMobile === where.showOnMobile)
          .sort((a, b) => a.sortOrder - b.sortOrder),
    },
  };
}

describe("HeroService.listActive", () => {
  it("returns every active segment for desktop", async () => {
    const svc = new HeroService(fakePrisma() as never, fakeMedia);
    expect((await svc.listActive("desktop")).map((s) => s.id)).toEqual(["1", "2", "4"]);
  });

  it("returns only mobile-flagged active segments for mobile", async () => {
    const svc = new HeroService(fakePrisma() as never, fakeMedia);
    expect((await svc.listActive("mobile")).map((s) => s.id)).toEqual(["1", "4"]);
  });

  it("never returns an inactive segment", async () => {
    const svc = new HeroService(fakePrisma() as never, fakeMedia);
    const all = await svc.listActive("desktop");
    expect(all.some((s) => s.id === "3")).toBe(false);
  });
});

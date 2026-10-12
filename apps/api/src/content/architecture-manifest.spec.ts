import { architectureManifest } from "../../prisma/seed-data/architecture";
import { architectureManifestSchema, missingRenders, type ArchitectureProject } from "./architecture-manifest";

function project(over: Partial<ArchitectureProject> = {}): ArchitectureProject {
  return {
    slug: "test-villa",
    titleEn: "Test Villa",
    titleBn: "পরীক্ষার ভিলা",
    descriptionEn: "<p>A house, shown here in 3D renders.</p>",
    descriptionBn: "<p>একটি বাড়ি, এখানে ৩ডি রেন্ডারে দেখানো হয়েছে।</p>",
    sortOrder: 0,
    cover: { file: "front.jpg", altEn: "3D render: the front", altBn: "৩ডি রেন্ডার: সামনের দিক" },
    gallery: [{ file: "side.jpg", altEn: "3D render: the side", altBn: "৩ডি রেন্ডার: পাশের দিক" }],
    ...over,
  };
}

describe("architectureManifestSchema", () => {
  it("accepts a well-formed project", () => {
    expect(architectureManifestSchema.safeParse([project()]).success).toBe(true);
  });

  it("rejects alt text that does not say it is a render", () => {
    // A render must never read as a photograph of a built house.
    const bad = project({ cover: { file: "front.jpg", altEn: "The front of a house", altBn: "৩ডি রেন্ডার: সামনের দিক" } });
    expect(architectureManifestSchema.safeParse([bad]).success).toBe(false);
  });

  it("rejects Bangla alt text without the Bangla render prefix", () => {
    const bad = project({ cover: { file: "front.jpg", altEn: "3D render: the front", altBn: "সামনের দিক" } });
    expect(architectureManifestSchema.safeParse([bad]).success).toBe(false);
  });

  it("rejects a description that does not say these are renders", () => {
    expect(architectureManifestSchema.safeParse([project({ descriptionEn: "<p>A house.</p>" })]).success).toBe(false);
    expect(architectureManifestSchema.safeParse([project({ descriptionBn: "<p>একটি বাড়ি।</p>" })]).success).toBe(false);
  });

  it("rejects a Bangla title that is the English one copied", () => {
    expect(architectureManifestSchema.safeParse([project({ titleBn: "Test Villa" })]).success).toBe(false);
  });

  it("rejects two projects with one slug", () => {
    expect(architectureManifestSchema.safeParse([project(), project()]).success).toBe(false);
  });
});

describe("missingRenders", () => {
  it("names every file that is not on disk, so the seed can refuse before writing", () => {
    const missing = missingRenders([project()], (path) => path.endsWith("front.jpg"));
    expect(missing).toEqual(["test-villa/side.jpg"]);
  });
});

describe("the shipped architecture manifest", () => {
  it("is valid", () => {
    expect(architectureManifestSchema.safeParse(architectureManifest).success).toBe(true);
  });

  it("holds the two villas", () => {
    expect(architectureManifest.map((p) => p.slug)).toEqual(["brick-screen-villa", "rooftop-pool-villa"]);
  });
});

import { existsSync } from "node:fs";
import { join } from "node:path";
import { HERO_DIR, heroManifest } from "../../prisma/seed-data/hero/hero";
import { heroManifestSchema, planHeroSync, type HeroManifestEntry } from "./hero-sync";

function entry(labelEn: string, over: Partial<HeroManifestEntry> = {}): HeroManifestEntry {
  return {
    file: `${labelEn.toLowerCase()}.jpg`,
    labelEn,
    labelBn: `${labelEn}-bn`,
    altEn: `${labelEn} alt`,
    altBn: `${labelEn} বিকল্প`,
    focalX: 0.5,
    showOnMobile: false,
    source: { url: "https://unsplash.com/photos/abc", author: "someone", licence: "Unsplash License" },
    ...over,
  };
}

/** Every manifest file is 1000 bytes on "disk" unless a test says otherwise. */
const sizeOf = () => 1000;

describe("planHeroSync", () => {
  it("creates every segment when the strip is empty", () => {
    const plan = planHeroSync([], [entry("Kitchen"), entry("Bedroom")], sizeOf);
    expect(plan.create.map((c) => [c.entry.labelEn, c.sortOrder])).toEqual([
      ["Kitchen", 0],
      ["Bedroom", 1],
    ]);
    expect(plan.update).toEqual([]);
    expect(plan.remove).toEqual([]);
  });

  it("keeps a segment that is still in the manifest, moved to its new place", () => {
    const plan = planHeroSync(
      [{ id: "s1", labelEn: "Kitchen", imageId: "m1", imageBytes: 1000 }],
      [entry("Bedroom"), entry("Kitchen")],
      sizeOf,
    );
    expect(plan.update).toEqual([{ id: "s1", imageId: "m1", entry: entry("Kitchen"), sortOrder: 1 }]);
    expect(plan.create.map((c) => c.entry.labelEn)).toEqual(["Bedroom"]);
  });

  it("removes a segment the manifest no longer names, with its image", () => {
    // The old archive rooms must leave the hero, not linger as a second strip.
    const plan = planHeroSync(
      [{ id: "old", labelEn: "Entrance", imageId: "m-old", imageBytes: 1000 }],
      [entry("Kitchen")],
      sizeOf,
    );
    expect(plan.remove).toEqual([{ id: "old", imageId: "m-old" }]);
  });

  it("replaces a segment whose photograph changed under the same label", () => {
    // Ingest records the source file's byte length in Media.bytes. A different
    // size means a different photograph — the old archive "Kitchen" is not the
    // new one, and keeping it would leave the old picture in the hero.
    const plan = planHeroSync(
      [{ id: "s1", labelEn: "Kitchen", imageId: "m1", imageBytes: 4_812_334 }],
      [entry("Kitchen")],
      sizeOf,
    );
    expect(plan.remove).toEqual([{ id: "s1", imageId: "m1" }]);
    expect(plan.create.map((c) => c.entry.labelEn)).toEqual(["Kitchen"]);
    expect(plan.update).toEqual([]);
  });
});

describe("heroManifestSchema", () => {
  it("rejects a Bangla label that is just the English one again", () => {
    // The old seed wrote the English label into labelBn as a placeholder, so a
    // bn page showed "Kitchen". Spec §9: that is the failure to design against.
    expect(heroManifestSchema.safeParse([entry("Kitchen", { labelBn: "Kitchen" })]).success).toBe(false);
  });

  it("rejects an entry with no recorded source or licence", () => {
    const bad = { ...entry("Kitchen"), source: { url: "", author: "", licence: "" } };
    expect(heroManifestSchema.safeParse([bad]).success).toBe(false);
  });

  it("rejects two segments with the same English label, which is the sync key", () => {
    expect(heroManifestSchema.safeParse([entry("Kitchen"), entry("Kitchen")]).success).toBe(false);
  });

  it("rejects a strip with nothing flagged for mobile", () => {
    expect(heroManifestSchema.safeParse([entry("Kitchen")]).success).toBe(false);
  });
});

describe("the shipped hero manifest", () => {
  it("is valid", () => {
    expect(heroManifestSchema.safeParse(heroManifest).success).toBe(true);
  });

  it("has every photograph it names", () => {
    for (const item of heroManifest) {
      expect(existsSync(join(HERO_DIR, item.file))).toBe(true);
    }
  });
});

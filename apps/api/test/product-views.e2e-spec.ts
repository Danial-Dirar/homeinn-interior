import { PrismaClient } from "@prisma/client";
import { applyViews, rollbackViews, type Ingest } from "../scripts/product-views";
import { resetDb } from "./setup-db";

const prisma = new PrismaClient();

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await resetDb(prisma);
});

function media(altEn: string) {
  return prisma.media.create({
    data: { storageKey: `k-${altEn}`, mimeType: "image/jpeg", width: 10, height: 10, bytes: 1, altEn, altBn: "ছবি" },
  });
}

// MediaService.ingest is covered elsewhere; here it only has to make a row.
const ingest: Ingest = async (file, alt) =>
  prisma.media.create({
    data: { storageKey: `k-${file}`, mimeType: "image/png", width: 10, height: 10, bytes: 1, ...alt },
  });

async function seedProduct(slug: string, coverId: string | null) {
  return prisma.shopProduct.create({
    data: { slug, nameEn: slug, nameBn: slug, summaryEn: "s", summaryBn: "s", descriptionEn: "", descriptionBn: "", coverId },
  });
}

const views = (slug: string) => ({
  slug,
  cover: { file: `${slug}-c.png`, altEn: `${slug}, angled`, altBn: "কোণ থেকে" },
  secondView: { file: `${slug}-b.png`, altEn: `${slug}, from the front`, altBn: "সামনে থেকে" },
});

describe("product views", () => {
  it("puts new photos on a piece as new media, and records what they replaced", async () => {
    const old = await media("Old wardrobe photo");
    await seedProduct("wardrobe", old.id);

    const rollback = await applyViews(prisma, ingest, [views("wardrobe")]);

    const product = await prisma.shopProduct.findUniqueOrThrow({
      where: { slug: "wardrobe" }, include: { cover: true, secondView: true },
    });
    expect(product.cover?.altEn).toBe("wardrobe, angled");
    expect(product.secondView?.altEn).toBe("wardrobe, from the front");
    expect(rollback).toEqual([{ slug: "wardrobe", coverId: old.id, secondViewId: null }]);
    // The original photo stays in the library, so going back loses nothing.
    expect(await prisma.media.findUnique({ where: { id: old.id } })).not.toBeNull();
  });

  it("puts every piece back exactly as it was", async () => {
    const old = await media("Old wardrobe photo");
    await seedProduct("wardrobe", old.id);
    await seedProduct("desk", null);

    const rollback = await applyViews(prisma, ingest, [views("wardrobe"), views("desk")]);
    await rollbackViews(prisma, rollback);

    const rows = await prisma.shopProduct.findMany({ orderBy: { slug: "asc" } });
    expect(rows.map((r) => [r.slug, r.coverId, r.secondViewId])).toEqual([
      ["desk", null, null],
      ["wardrobe", old.id, null],
    ]);
  });

  it("changes nothing when a slug in the manifest does not exist", async () => {
    const old = await media("Old wardrobe photo");
    await seedProduct("wardrobe", old.id);

    await expect(applyViews(prisma, ingest, [views("wardrobe"), views("sofa")])).rejects.toThrow(/sofa/);
    expect((await prisma.shopProduct.findUniqueOrThrow({ where: { slug: "wardrobe" } })).coverId).toBe(old.id);
    expect(await prisma.media.count()).toBe(1);
  });
});

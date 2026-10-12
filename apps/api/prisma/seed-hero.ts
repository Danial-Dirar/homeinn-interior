import { ConflictException } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { heroManifestSchema, planHeroSync, type HeroManifestEntry } from "../src/content/hero-sync";
import { MediaService } from "../src/media/media.service";
import { LocalDiskStorage } from "../src/media/storage/local-disk.storage";
import { heroFile, heroManifest } from "./seed-data/hero/hero";

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

const mimeOf = (file: string): string => MIME[file.split(".").pop() ?? ""] ?? "image/jpeg";

function segmentFields(entry: HeroManifestEntry, sortOrder: number) {
  return {
    sortOrder,
    labelEn: entry.labelEn,
    labelBn: entry.labelBn,
    captionEn: null,
    captionBn: null,
    focalX: entry.focalX,
    active: true,
    showOnMobile: entry.showOnMobile,
  };
}

/**
 * Makes the hero match `seed-data/hero/hero.ts`, and is safe to re-run.
 *
 * A segment the manifest still names keeps its ingested photograph and takes
 * the manifest's order, labels and alt text. One it no longer names is deleted
 * along with its image — the row, and the derivatives on disk — so a retired
 * photograph is not left served at its own URL. New entries go through the
 * same sharp pipeline the CMS uses.
 *
 * A segment is matched on its label and its file's byte length, so changing
 * the photograph behind a label that stays is just a matter of replacing the
 * file — see `planHeroSync`.
 */
export async function seedHero(prisma: PrismaClient): Promise<void> {
  const manifest = heroManifestSchema.parse(heroManifest);
  const media = new MediaService(prisma as never, new LocalDiskStorage());

  const segments = await prisma.heroSegment.findMany({
    select: { id: true, labelEn: true, imageId: true, image: { select: { bytes: true } } },
  });
  const existing = segments.map(({ image, ...segment }) => ({ ...segment, imageBytes: image.bytes }));
  const plan = planHeroSync(existing, manifest, (file) => statSync(heroFile(file)).size);

  for (const { id, imageId } of plan.remove) {
    const segment = await prisma.heroSegment.delete({ where: { id } });
    try {
      await media.remove(imageId);
      console.log(`removed  ${segment.labelEn} (and its image)`);
    } catch (error) {
      // Still a cover or gallery image somewhere else; the segment goes, the
      // photograph stays where it is used.
      if (!(error instanceof ConflictException)) throw error;
      console.log(`removed  ${segment.labelEn} (image kept — used elsewhere)`);
    }
  }

  for (const { id, imageId, entry, sortOrder } of plan.update) {
    await prisma.heroSegment.update({ where: { id }, data: segmentFields(entry, sortOrder) });
    await prisma.media.update({
      where: { id: imageId },
      data: { altEn: entry.altEn, altBn: entry.altBn },
    });
    console.log(`kept     ${entry.labelEn}`);
  }

  for (const { entry, sortOrder } of plan.create) {
    const image = await media.ingest(
      { buffer: await readFile(heroFile(entry.file)), mimetype: mimeOf(entry.file), originalname: entry.file },
      { altEn: entry.altEn, altBn: entry.altBn },
    );
    await prisma.heroSegment.create({ data: { ...segmentFields(entry, sortOrder), imageId: image.id } });
    console.log(`added    ${entry.labelEn}`);
  }

  console.log(`\nhero: ${manifest.length} segments, ${manifest.filter((e) => e.showOnMobile).length} on mobile`);
}

if (require.main === module) {
  const prisma = new PrismaClient();
  seedHero(prisma)
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => void prisma.$disconnect());
}

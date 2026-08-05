import { PrismaClient } from "@prisma/client";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { MediaService } from "../src/media/media.service";
import { LocalDiskStorage } from "../src/media/storage/local-disk.storage";

const DIR = join(__dirname, "seed-data", "placeholders");

/** `01-living-room.jpg` → `Living Room`. */
export function labelFrom(filename: string): string {
  return filename
    .replace(/^\d+[-_]?/, "")
    .replace(/\.[^.]+$/, "")
    .split(/[-_]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Ingests every image in `seed-data/placeholders/` and makes one hero segment
 * per file, in filename order. Idempotent: a segment whose label already exists
 * is left alone, so re-running never duplicates the strip.
 */
export async function seedHero(prisma: PrismaClient): Promise<void> {
  let files: string[];
  try {
    files = (await readdir(DIR)).filter((f) => /\.(jpe?g|png|webp|avif)$/i.test(f)).sort();
  } catch {
    files = [];
  }

  if (files.length === 0) {
    console.log("No placeholder images found — see prisma/seed-data/placeholders/README.md");
    return;
  }

  const media = new MediaService(prisma as never, new LocalDiskStorage());

  for (const [index, file] of files.entries()) {
    const labelEn = labelFrom(file);
    if (await prisma.heroSegment.findFirst({ where: { labelEn } })) continue;

    const row = await media.ingest(
      { buffer: await readFile(join(DIR, file)), mimetype: "image/jpeg", originalname: file },
      { altEn: `${labelEn} interior`, altBn: `${labelEn} ইন্টেরিয়র` },
    );

    await prisma.heroSegment.create({
      data: {
        sortOrder: index,
        imageId: row.id,
        labelEn,
        // Placeholder: replaced in the admin. Never presented as a translation.
        labelBn: labelEn,
        active: true,
        // Spec §7: the mobile subset is curated, not sampled. First three by
        // default, because they still read as one walk; the editor changes it.
        showOnMobile: index < 3,
      },
    });
    console.log(`hero segment ${index}: ${labelEn}`);
  }
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

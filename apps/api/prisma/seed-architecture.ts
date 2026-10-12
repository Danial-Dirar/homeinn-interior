import { PrismaClient } from "@prisma/client";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { architectureManifestSchema, missingRenders } from "../src/content/architecture-manifest";
import { MediaService } from "../src/media/media.service";
import { LocalDiskStorage } from "../src/media/storage/local-disk.storage";
import { architectureManifest } from "./seed-data/architecture";

/** Gitignored, at the repo root, like media_dump/. */
const DIR = join(__dirname, "..", "..", "..", "architecture_renders");

/**
 * Imports Home Inn's villa designs as published, featured projects under
 * Architectural Design. Idempotent on slug. It refuses to start if any render
 * is missing, rather than leave a project half-created. The brick villa's
 * front becomes the Architectural Design service's cover if it has none.
 */
export async function seedArchitecture(prisma: PrismaClient): Promise<void> {
  const manifest = architectureManifestSchema.parse(architectureManifest);
  const missing = missingRenders(manifest, (rel) => existsSync(join(DIR, rel)));
  if (missing.length > 0) {
    throw new Error(`Missing renders in architecture_renders/: ${missing.join(", ")}`);
  }

  const area = await prisma.workingArea.findUniqueOrThrow({ where: { slug: "architectural-design" } });
  const media = new MediaService(prisma as never, new LocalDiskStorage());
  const ingest = async (slug: string, img: { file: string; altEn: string; altBn: string }) =>
    media.ingest(
      { buffer: await readFile(join(DIR, slug, img.file)), mimetype: "image/jpeg", originalname: img.file },
      { altEn: img.altEn, altBn: img.altBn },
    );

  for (const project of manifest) {
    if (await prisma.project.findUnique({ where: { slug: project.slug } })) {
      console.log(`kept     ${project.slug}`);
      continue;
    }
    const cover = await ingest(project.slug, project.cover);
    const gallery = [];
    for (const img of project.gallery) gallery.push(await ingest(project.slug, img));

    await prisma.project.create({
      data: {
        slug: project.slug,
        titleEn: project.titleEn,
        titleBn: project.titleBn,
        locationEn: "",
        locationBn: "",
        descriptionEn: project.descriptionEn,
        descriptionBn: project.descriptionBn,
        workingAreaId: area.id,
        coverId: cover.id,
        gallery: { connect: gallery.map((g) => ({ id: g.id })) },
        featured: true,
        published: true,
        sortOrder: project.sortOrder,
      },
    });
    console.log(`added    ${project.slug} (cover + ${gallery.length})`);
  }

  const service = await prisma.service.findUnique({ where: { slug: "architectural-design" } });
  const brick = await prisma.project.findUnique({ where: { slug: "brick-screen-villa" } });
  if (service && !service.coverId && brick?.coverId) {
    await prisma.service.update({ where: { id: service.id }, data: { coverId: brick.coverId } });
    console.log("service  architectural-design cover set");
  }
}

if (require.main === module) {
  const prisma = new PrismaClient();
  seedArchitecture(prisma)
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => void prisma.$disconnect());
}

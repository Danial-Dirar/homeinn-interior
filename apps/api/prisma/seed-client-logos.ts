import { PrismaClient } from "@prisma/client";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { MediaService } from "../src/media/media.service";
import { LocalDiskStorage } from "../src/media/storage/local-disk.storage";

/** Prepared WebP marks live at the repo root, outside the app. */
const DIR = join(__dirname, "..", "..", "..", "client_logos");

/**
 * Clients whose logos we are permitted to display.
 *
 * A logo is someone else's trademark, and showing it asserts a working
 * relationship. Every entry here is one the company has confirmed — do not add
 * a mark just because the file exists in the folder.
 */
const CLIENTS = [
  { name: "foodpanda", file: "foodpanda.webp", website: "https://www.foodpanda.com.bd/" },
  { name: "HATIL", file: "hatil.webp", website: "https://hatil.com/" },
  { name: "OTOBI", file: "otobi.webp", website: "https://otobi.com/" },
  { name: "HNC Outsourcing Ltd.", file: "hnc-outsourcing.webp", website: "https://hncoutsourcing.com/" },
  { name: "LEC Abroad", file: "lec-abroad.webp", website: "https://lecabroad.com/" },
];

/**
 * Ingests each mark through the same pipeline the CMS uses and records it.
 * Idempotent on `name`, so re-running after adding a client only adds the new
 * ones.
 */
export async function seedClientLogos(prisma: PrismaClient): Promise<void> {
  const media = new MediaService(prisma as never, new LocalDiskStorage());

  for (const [index, client] of CLIENTS.entries()) {
    if (await prisma.clientLogo.findUnique({ where: { name: client.name } })) continue;

    let buffer: Buffer;
    try {
      buffer = await readFile(join(DIR, client.file));
    } catch {
      console.warn(`${client.name}: ${client.file} not found in client_logos/, skipped`);
      continue;
    }

    // Alt text names the company, which is the whole information content of a
    // logo — "logo" alone tells a screen-reader user nothing.
    const row = await media.ingest(
      { buffer, mimetype: "image/webp", originalname: client.file },
      { altEn: client.name, altBn: client.name },
    );

    await prisma.clientLogo.create({
      data: {
        name: client.name,
        website: client.website,
        logoId: row.id,
        sortOrder: index,
      },
    });
    console.log(`${client.name}`);
  }

  const total = await prisma.clientLogo.count();
  console.log(`\n${total} client logos in the database.`);
}

if (require.main === module) {
  const prisma = new PrismaClient();
  seedClientLogos(prisma)
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => void prisma.$disconnect());
}

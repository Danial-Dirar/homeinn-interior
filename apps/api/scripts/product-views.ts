/**
 * Puts new photos on furniture pieces, and takes them off again.
 *
 *   pnpm product:views apply <manifest.json>
 *   pnpm product:views rollback <manifest.rollback.json>
 *
 * The manifest is a list of `{ slug, cover?, secondView? }`, each photo a
 * `{ file, altEn, altBn }` with `file` relative to the manifest. Apply adds
 * every photo to the library as a new image and points the piece at it; the
 * photos it replaces are never touched. It writes `<manifest>.rollback.json`
 * with the ids it replaced, and rollback points every piece back at them.
 * The new images stay in the library either way.
 *
 * Every slug is checked before anything is written. Afterwards the web app is
 * told the furniture pages are stale, when WEB_REVALIDATE_URL and
 * REVALIDATE_SECRET are set.
 */
import { PrismaClient, type Media } from "@prisma/client";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { MediaService } from "../src/media/media.service";
import { LocalDiskStorage } from "../src/media/storage/local-disk.storage";
import type { PrismaService } from "../src/prisma/prisma.service";

export interface Photo {
  file: string;
  altEn: string;
  altBn: string;
}

export interface ViewsEntry {
  slug: string;
  cover?: Photo;
  secondView?: Photo;
}

export interface RollbackEntry {
  slug: string;
  coverId: string | null;
  secondViewId: string | null;
}

export type Ingest = (file: string, alt: { altEn: string; altBn: string }) => Promise<Media>;

function ingestPhoto(ingest: Ingest, { file, altEn, altBn }: Photo): Promise<Media> {
  return ingest(file, { altEn, altBn });
}

export async function applyViews(prisma: PrismaClient, ingest: Ingest, entries: ViewsEntry[]): Promise<RollbackEntry[]> {
  const products = await prisma.shopProduct.findMany({ where: { slug: { in: entries.map((e) => e.slug) } } });
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  const missing = entries.filter((e) => !bySlug.has(e.slug)).map((e) => e.slug);
  if (missing.length > 0) throw new Error(`No furniture piece with slug ${missing.join(", ")}`);

  // Every photo is in the library before any piece changes, and the pieces
  // change together: a photo that fails to ingest leaves the site as it was.
  const planned = [];
  for (const entry of entries) {
    const data: { coverId?: string; secondViewId?: string } = {};
    if (entry.cover) data.coverId = (await ingestPhoto(ingest, entry.cover)).id;
    if (entry.secondView) data.secondViewId = (await ingestPhoto(ingest, entry.secondView)).id;
    planned.push({ product: bySlug.get(entry.slug)!, data });
  }
  await prisma.$transaction(planned.map(({ product, data }) =>
    prisma.shopProduct.update({ where: { id: product.id }, data })));
  return planned.map(({ product }) => ({ slug: product.slug, coverId: product.coverId, secondViewId: product.secondViewId }));
}

export async function rollbackViews(prisma: PrismaClient, rollback: RollbackEntry[]): Promise<void> {
  for (const entry of rollback) {
    await prisma.shopProduct.update({
      where: { slug: entry.slug },
      data: { coverId: entry.coverId, secondViewId: entry.secondViewId },
    });
  }
}

const MIME: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" };

async function revalidateFurniture(): Promise<void> {
  const url = process.env.WEB_REVALIDATE_URL;
  const secret = process.env.REVALIDATE_SECRET;
  if (!url || !secret) {
    console.log("WEB_REVALIDATE_URL or REVALIDATE_SECRET unset: the pages update within five minutes.");
    return;
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-revalidate-secret": secret },
    body: JSON.stringify({ tags: ["products"] }),
  });
  console.log(`revalidate products: ${res.status}`);
}

async function main(): Promise<void> {
  const [command, path] = process.argv.slice(2);
  if ((command !== "apply" && command !== "rollback") || !path) {
    console.error("Usage: pnpm product:views apply <manifest.json> | rollback <manifest.rollback.json>");
    process.exit(1);
  }
  const prisma = new PrismaClient();
  try {
    if (command === "apply") {
      const base = dirname(resolve(path));
      const media = new MediaService(prisma as unknown as PrismaService, new LocalDiskStorage());
      const ingest: Ingest = async (file, alt) => {
        const full = resolve(base, file);
        const mimetype = MIME[extname(full).toLowerCase()];
        if (!mimetype) throw new Error(`Not an image this script knows: ${file}`);
        return media.ingest({ buffer: await readFile(full), mimetype, originalname: file }, alt);
      };
      const entries = JSON.parse(await readFile(path, "utf8")) as ViewsEntry[];
      const rollback = await applyViews(prisma, ingest, entries);
      const out = path.replace(/\.json$/, "") + ".rollback.json";
      await writeFile(out, JSON.stringify(rollback, null, 1) + "\n");
      console.log(`Applied ${rollback.length} pieces. To undo: pnpm product:views rollback ${out}`);
    } else {
      await rollbackViews(prisma, JSON.parse(await readFile(path, "utf8")) as RollbackEntry[]);
      console.log("Rolled back.");
    }
    await revalidateFurniture();
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}

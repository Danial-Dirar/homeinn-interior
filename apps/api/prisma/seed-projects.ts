import { PrismaClient } from "@prisma/client";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { MediaService } from "../src/media/media.service";
import { LocalDiskStorage } from "../src/media/storage/local-disk.storage";
import classification from "./seed-data/media-dump-classification.json";

/** The archive lives outside the app, at the repo root, and is gitignored. */
const DUMP = join(__dirname, "..", "..", "..", "media_dump");

/** Spec §15: below this an image is not usable as a cover or in a gallery. */
const MIN_WIDTH = 1440;
/** Enough to show a project without turning the page into a contact sheet. */
const MAX_GALLERY = 8;

/**
 * Frames containing a clearly identifiable person. Checked by eye, excluded by
 * name. The site does not publish identifiable individuals without consent.
 */
const HAS_PEOPLE = new Set(["IMG_20241021_173259.jpg", "IMG_20260728_175204.jpg"]);

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
const toBnDigits = (value: string | number): string =>
  String(value).replace(/\d/g, (d) => BN_DIGITS[Number(d)]!);

const MONTHS_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTHS_BN = [
  "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
  "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর",
];

interface Shot {
  file: string;
  width: number;
  height: number;
}

/** `IMG_20240608_160750.jpg` → `2024-06-08`. The date is in the filename. */
function dateOf(file: string): { year: number; month: number; day: number } | null {
  const match = /_(\d{4})(\d{2})(\d{2})_/.exec(file);
  if (!match) return null;
  return { year: +match[1]!, month: +match[2]!, day: +match[3]! };
}

/**
 * Up to `MAX_GALLERY` shots spread evenly across the session rather than the
 * first N. The photographer walks through a space, so an even spread samples
 * different rooms; the first eight would all be the same corner.
 */
function spread(shots: Shot[], count: number): Shot[] {
  if (shots.length <= count) return shots;
  const step = shots.length / count;
  return Array.from({ length: count }, (_, i) => shots[Math.floor(i * step)]!);
}

async function measure(files: string[]): Promise<Shot[]> {
  const shots: Shot[] = [];
  for (const file of files) {
    if (HAS_PEOPLE.has(file)) continue;
    try {
      const meta = await sharp(join(DUMP, file)).metadata();
      if (!meta.width || !meta.height || meta.width < MIN_WIDTH) continue;
      shots.push({ file, width: meta.width, height: meta.height });
    } catch {
      // Unreadable; skip rather than fail the whole import.
    }
  }
  return shots;
}

/**
 * Imports `media_dump/` as draft projects, one per photo session.
 *
 * What is written is only what the archive actually supports: the category
 * (classified by eye, recorded in media-dump-classification.json), the year
 * (read from the filename), and the photographs. Titles are provisional and
 * built from the category and month. `location`, `description`, `clientName`
 * and `areaSqft` are left empty and every project lands `published: false` —
 * spec §12 forbids inventing them, and a human confirms each one before it
 * goes live.
 */
export async function seedProjects(prisma: PrismaClient): Promise<void> {
  const media = new MediaService(prisma as never, new LocalDiskStorage());
  const areas = new Map(
    (await prisma.workingArea.findMany()).map((area) => [area.slug, area]),
  );

  let created = 0;
  let skipped = 0;

  for (const session of classification) {
    if (!session.category) continue;

    const area = areas.get(session.category);
    if (!area) {
      console.warn(`session ${session.session}: unknown area ${session.category}`);
      continue;
    }

    const first = session.images[0];
    const date = first ? dateOf(first) : null;
    if (!date) {
      console.warn(`session ${session.session}: no date in filename, skipped`);
      continue;
    }

    const slug = `${session.category}-${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
    if (await prisma.project.findUnique({ where: { slug } })) {
      skipped += 1;
      continue;
    }

    const shots = await measure(session.images);
    if (shots.length === 0) {
      console.warn(`session ${session.session}: no usable images, skipped`);
      continue;
    }

    // Cover: the widest landscape frame. Landscape reads better in the grid.
    const landscape = shots.filter((s) => s.width / s.height >= 1.2);
    const cover = [...(landscape.length > 0 ? landscape : shots)].sort(
      (a, b) => b.width - a.width,
    )[0]!;
    const gallery = spread(
      shots.filter((s) => s.file !== cover.file),
      MAX_GALLERY,
    );

    // `seen` is a factual description of what is visible, so it makes honest
    // alt text — far better than a generic placeholder.
    const alt = { altEn: session.seen, altBn: session.seen };

    const ingest = async (shot: Shot) =>
      media.ingest(
        {
          buffer: await readFile(join(DUMP, shot.file)),
          mimetype: "image/jpeg",
          originalname: shot.file,
        },
        alt,
      );

    const coverRow = await ingest(cover);
    const galleryRows = [];
    for (const shot of gallery) galleryRows.push(await ingest(shot));

    const monthEn = MONTHS_EN[date.month - 1]!;
    const monthBn = MONTHS_BN[date.month - 1]!;

    await prisma.project.create({
      data: {
        slug,
        // Provisional, and derived only from facts: the category we classified
        // and the date in the filename. Rename in the admin (Plan 1C).
        titleEn: `${area.nameEn} — ${monthEn} ${date.year}`,
        titleBn: `${area.nameBn} — ${monthBn} ${toBnDigits(date.year)}`,
        // Required columns with nothing truthful to put in them yet. The UI
        // drops empty facts rather than rendering a blank row.
        locationEn: "",
        locationBn: "",
        descriptionEn: "",
        descriptionBn: "",
        year: date.year,
        workingAreaId: area.id,
        coverId: coverRow.id,
        gallery: { connect: galleryRows.map((row) => ({ id: row.id })) },
        featured: false,
        published: false,
        sortOrder: session.session,
      },
    });

    created += 1;
    console.log(
      `${slug}  cover + ${galleryRows.length} gallery  (${shots.length} usable of ${session.images.length})`,
    );
  }

  console.log(`\n${created} projects created, ${skipped} already present.`);
  console.log("All are published: false — confirm each before it goes live.");
}

if (require.main === module) {
  const prisma = new PrismaClient();
  seedProjects(prisma)
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => void prisma.$disconnect());
}

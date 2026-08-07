import { execFile } from "node:child_process";
import { readdir, stat, writeFile } from "node:fs/promises";
import { extname, join, relative, resolve, sep } from "node:path";
import { promisify } from "node:util";
import sharp from "sharp";

const run = promisify(execFile);

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".tif", ".tiff"]);
const RAW_EXT = new Set([".heic", ".heif", ".dng", ".cr2", ".nef", ".arw"]);
const VIDEO_EXT = new Set([".mp4", ".mov", ".m4v", ".webm", ".avi", ".mkv"]);

/** Below this a photo is not usable as a hero segment (spec §15: 1920×1080). */
const HERO_MIN_WIDTH = 1920;
/** Below this it is not usable as a project cover (spec §15: 1440×960). */
const COVER_MIN_WIDTH = 1440;

interface Entry {
  path: string;
  group: string;
  kind: "image" | "video" | "raw" | "other";
  bytes: number;
  width?: number;
  height?: number;
  seconds?: number;
}

async function walk(root: string, dir = root, out: Entry[] = []): Promise<Entry[]> {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    if (item.name.startsWith(".")) continue;
    const full = join(dir, item.name);

    if (item.isDirectory()) {
      await walk(root, full, out);
      continue;
    }

    const ext = extname(item.name).toLowerCase();
    const rel = relative(root, full);
    // The first directory level is the most likely project grouping.
    const group = rel.includes(sep) ? rel.split(sep)[0]! : "(loose files)";
    const { size } = await stat(full);

    const kind = IMAGE_EXT.has(ext)
      ? "image"
      : VIDEO_EXT.has(ext)
        ? "video"
        : RAW_EXT.has(ext)
          ? "raw"
          : "other";

    const entry: Entry = { path: rel, group, kind, bytes: size };

    if (kind === "image") {
      try {
        const meta = await sharp(full).metadata();
        entry.width = meta.width;
        entry.height = meta.height;
      } catch {
        entry.kind = "raw"; // sharp could not decode it; treat as needing conversion
      }
    }

    if (kind === "video") {
      try {
        // `-i` rather than a bare positional: this script exists to read a
        // folder supplied by someone else, and a file named `-loglevel` would
        // otherwise be parsed by ffprobe as an option instead of a path.
        const { stdout } = await run("ffprobe", [
          "-v", "error",
          "-select_streams", "v:0",
          "-show_entries", "stream=width,height:format=duration",
          "-of", "json",
          "-i", full,
        ]);
        const probe = JSON.parse(stdout) as {
          streams?: { width?: number; height?: number }[];
          format?: { duration?: string };
        };
        entry.width = probe.streams?.[0]?.width;
        entry.height = probe.streams?.[0]?.height;
        entry.seconds = Number(probe.format?.duration ?? 0) || undefined;
      } catch {
        // Leave the dimensions unknown; the summary flags it.
      }
    }

    out.push(entry);
  }
  return out;
}

const mb = (bytes: number) => `${(bytes / 1_048_576).toFixed(1)} MB`;

function summarise(entries: Entry[]): void {
  const by = (kind: Entry["kind"]) => entries.filter((e) => e.kind === kind);
  const images = by("image");
  const videos = by("video");
  const raw = by("raw");
  const other = by("other");
  const total = entries.reduce((sum, e) => sum + e.bytes, 0);

  console.log(`\n${entries.length} files, ${mb(total)}\n`);
  console.log(`  images  ${images.length}`);
  console.log(`  videos  ${videos.length}`);
  console.log(`  raw/heic ${raw.length}   (need converting before ingest)`);
  console.log(`  other   ${other.length}`);

  if (images.length > 0) {
    const heroReady = images.filter((e) => (e.width ?? 0) >= HERO_MIN_WIDTH);
    const coverReady = images.filter((e) => (e.width ?? 0) >= COVER_MIN_WIDTH);
    const tooSmall = images.filter((e) => (e.width ?? 0) < COVER_MIN_WIDTH);
    console.log("\nimage usability");
    console.log(`  >= ${HERO_MIN_WIDTH}px wide (hero)   ${heroReady.length}`);
    console.log(`  >= ${COVER_MIN_WIDTH}px wide (cover)  ${coverReady.length}`);
    console.log(`  too small for either      ${tooSmall.length}`);
  }

  if (videos.length > 0) {
    console.log("\nvideos");
    for (const video of videos) {
      const dims = video.width ? `${video.width}x${video.height}` : "unknown";
      const secs = video.seconds ? `${video.seconds.toFixed(0)}s` : "unknown";
      console.log(`  ${dims.padEnd(11)} ${secs.padEnd(7)} ${mb(video.bytes).padStart(9)}  ${video.path}`);
    }
  }

  const groups = new Map<string, Entry[]>();
  for (const entry of entries) {
    groups.set(entry.group, [...(groups.get(entry.group) ?? []), entry]);
  }

  console.log(`\ngroups (top-level folders — the likely project split)`);
  for (const [name, items] of [...groups].sort((a, b) => b[1].length - a[1].length)) {
    const imageCount = items.filter((i) => i.kind === "image").length;
    const videoCount = items.filter((i) => i.kind === "video").length;
    console.log(
      `  ${String(items.length).padStart(4)} files  ` +
        `${String(imageCount).padStart(4)} img  ${String(videoCount).padStart(3)} vid   ${name}`,
    );
  }
}

/**
 * Reads a folder of client photography and reports what is in it. Writes
 * nothing to the database and touches no file — this is the triage step before
 * anything is imported, so a messy drop can be understood before it is sorted.
 */
async function main(): Promise<void> {
  const root = process.argv[2];
  if (!root) {
    console.error("usage: pnpm --filter @homeinn/api media:inventory <folder>");
    process.exit(1);
  }

  // Absolute, so no path handed to ffprobe can begin with a dash.
  const entries = await walk(resolve(root));
  summarise(entries);

  const report = join(process.cwd(), "media-inventory.json");
  await writeFile(report, JSON.stringify(entries, null, 2));
  console.log(`\nfull report: ${report}`);
}

void main();

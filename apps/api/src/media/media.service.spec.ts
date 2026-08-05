import { BadRequestException } from "@nestjs/common";
import sharp from "sharp";
import { MediaService } from "./media.service";
import type { StorageService } from "./storage/storage.interface";

function fakeStorage(): StorageService & { keys: string[] } {
  const keys: string[] = [];
  return {
    keys,
    put: async (key) => { keys.push(key); },
    delete: async (key) => { keys.splice(keys.indexOf(key), 1); },
    publicUrl: (key) => `http://cdn.test/${key}`,
  };
}

function fakePrisma() {
  return { media: { create: async ({ data }: { data: unknown }) => ({ id: "m1", ...(data as object) }) } };
}

async function png(width: number, height: number): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: "#888" } }).png().toBuffer();
}

describe("MediaService.ingest", () => {
  const alt = { altEn: "A living room", altBn: "একটি বসার ঘর" };

  it("rejects a non-image mime type", async () => {
    const svc = new MediaService(fakePrisma() as never, fakeStorage());
    await expect(
      svc.ingest({ buffer: Buffer.from("hi"), mimetype: "application/pdf", originalname: "a.pdf" }, alt),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects empty alt text", async () => {
    const svc = new MediaService(fakePrisma() as never, fakeStorage());
    await expect(
      svc.ingest({ buffer: await png(100, 100), mimetype: "image/png", originalname: "a.png" },
        { altEn: "", altBn: "কিছু" }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("records the source dimensions", async () => {
    const svc = new MediaService(fakePrisma() as never, fakeStorage());
    const row = await svc.ingest(
      { buffer: await png(1200, 800), mimetype: "image/png", originalname: "a.png" }, alt);
    expect(row.width).toBe(1200);
    expect(row.height).toBe(800);
  });

  it("writes one derivative per size per format, skipping upscales", async () => {
    const storage = fakeStorage();
    const svc = new MediaService(fakePrisma() as never, storage);
    // 1000px source → only the 480 and 960 widths apply, in avif and webp.
    await svc.ingest({ buffer: await png(1000, 700), mimetype: "image/png", originalname: "a.png" }, alt);
    expect(storage.keys.filter((k) => k.endsWith(".avif"))).toHaveLength(2);
    expect(storage.keys.filter((k) => k.endsWith(".webp"))).toHaveLength(2);
  });

  it("persists both alt languages", async () => {
    const svc = new MediaService(fakePrisma() as never, fakeStorage());
    const row = await svc.ingest(
      { buffer: await png(600, 400), mimetype: "image/png", originalname: "a.png" }, alt);
    expect(row.altEn).toBe("A living room");
    expect(row.altBn).toBe("একটি বসার ঘর");
  });

  it("stores a blurhash placeholder", async () => {
    const svc = new MediaService(fakePrisma() as never, fakeStorage());
    const row = await svc.ingest(
      { buffer: await png(600, 400), mimetype: "image/png", originalname: "a.png" }, alt);
    expect(typeof row.blurhash).toBe("string");
    expect((row.blurhash as string).length).toBeGreaterThan(6);
  });
});

describe("MediaService.view", () => {
  const row = {
    id: "m1", storageKey: "abc", mimeType: "image/jpeg",
    width: 1920, height: 1080, bytes: 100, blurhash: "LEHV6nWB",
    altEn: "A room", altBn: "একটি ঘর", createdAt: new Date(),
  };

  it("returns null for a missing relation", () => {
    const svc = new MediaService(fakePrisma() as never, fakeStorage());
    expect(svc.view(null)).toBeNull();
    expect(svc.view(undefined)).toBeNull();
  });

  it("adds one source per format, widest last", () => {
    const svc = new MediaService(fakePrisma() as never, fakeStorage());
    const view = svc.view(row);
    expect(view?.sources.map((s) => s.type)).toEqual(["image/avif", "image/webp"]);
    expect(view?.sources[0]?.srcset).toContain("http://cdn.test/abc/1920.avif 1920w");
  });

  it("maps a list", () => {
    const svc = new MediaService(fakePrisma() as never, fakeStorage());
    expect(svc.viewMany([row, row])).toHaveLength(2);
  });
});

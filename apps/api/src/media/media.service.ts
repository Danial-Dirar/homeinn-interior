import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, type Media } from "@prisma/client";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import type { PaginationQuery } from "@homeinn/types";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "./storage/storage.interface";

const WIDTHS = [480, 960, 1440, 1920] as const;
const FORMATS = ["avif", "webp"] as const;

export interface IncomingFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
}

/**
 * Which derivative widths exist for a source of this width. Never upscales, so
 * a 1000px source yields 480 and 960 only. Derived rather than stored, which
 * keeps ingest and URL-building from drifting apart.
 */
export function derivativeWidths(sourceWidth: number): number[] {
  const fitting = WIDTHS.filter((w) => w <= sourceWidth);
  return fitting.length > 0 ? [...fitting] : [sourceWidth];
}

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async ingest(file: IncomingFile, alt: { altEn: string; altBn: string }): Promise<Media> {
    if (!file.mimetype.startsWith("image/")) {
      throw new BadRequestException("Only image uploads are accepted");
    }
    if (!alt.altEn.trim() || !alt.altBn.trim()) {
      throw new BadRequestException("Alt text is required in both English and Bangla");
    }

    const meta = await sharp(file.buffer).metadata();
    if (!meta.width || !meta.height) {
      throw new BadRequestException("Could not read image dimensions");
    }

    const key = randomUUID();
    for (const width of derivativeWidths(meta.width)) {
      for (const format of FORMATS) {
        const buf = await sharp(file.buffer).resize({ width })[format]({ quality: 72 }).toBuffer();
        await this.storage.put(`${key}/${width}.${format}`, buf, `image/${format}`);
      }
    }

    return this.prisma.media.create({
      data: {
        storageKey: key,
        mimeType: file.mimetype,
        width: meta.width,
        height: meta.height,
        bytes: file.buffer.byteLength,
        altEn: alt.altEn.trim(),
        altBn: alt.altBn.trim(),
      },
    });
  }

  /** A media row plus the srcset strings the web app renders from. */
  toPublic(media: Media) {
    const widths = derivativeWidths(media.width);
    return {
      ...media,
      sources: FORMATS.map((format) => ({
        type: `image/${format}`,
        srcset: widths
          .map((w) => `${this.storage.publicUrl(`${media.storageKey}/${w}.${format}`)} ${w}w`)
          .join(", "),
      })),
    };
  }

  async list(query: PaginationQuery) {
    const [rows, total] = await Promise.all([
      this.prisma.media.findMany({
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.perPage,
        take: query.perPage,
      }),
      this.prisma.media.count(),
    ]);
    return { items: rows.map((m) => this.toPublic(m)), total, page: query.page, perPage: query.perPage };
  }

  async remove(id: string): Promise<void> {
    const row = await this.prisma.media.findUnique({ where: { id } });
    if (!row) throw new NotFoundException("Media not found");

    try {
      await this.prisma.media.delete({ where: { id } });
    } catch (e) {
      // Still referenced by a service cover, project gallery, hero segment…
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") {
        throw new ConflictException("This image is still in use by published content");
      }
      throw e;
    }

    for (const width of derivativeWidths(row.width)) {
      for (const format of FORMATS) {
        await this.storage.delete(`${row.storageKey}/${width}.${format}`);
      }
    }
  }
}

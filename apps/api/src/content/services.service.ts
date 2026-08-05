import { Injectable } from "@nestjs/common";
import type { Service } from "@prisma/client";
import type { CreateServiceInput, UpdateServiceInput } from "@homeinn/types";
import { PrismaService } from "../prisma/prisma.service";
import { MediaService } from "../media/media.service";
import { uniqueSlug } from "../common/slug";
import { connectGallery, notFoundIfMissing, setGallery } from "./content.helpers";

const PUBLIC_ORDER = { sortOrder: "asc" } as const;

// Lists carry the cover only; the gallery and SEO joins are paid once, on detail.
const LIST_INCLUDE = { cover: true } as const;
const DETAIL_INCLUDE = {
  cover: true,
  gallery: true,
  seo: { include: { ogImage: true } },
} as const;

@Injectable()
export class ServicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
  ) {}

  async listPublic() {
    const rows = await this.prisma.service.findMany({
      where: { published: true },
      orderBy: PUBLIC_ORDER,
      include: LIST_INCLUDE,
    });
    return rows.map((r) => ({ ...r, cover: this.media.view(r.cover) }));
  }

  listAll(): Promise<Service[]> {
    return this.prisma.service.findMany({ orderBy: PUBLIC_ORDER });
  }

  async findPublicBySlug(slug: string) {
    const row = await this.prisma.service.findFirst({
      where: { slug, published: true },
      include: DETAIL_INCLUDE,
    });
    if (!row) return null;
    return {
      ...row,
      cover: this.media.view(row.cover),
      gallery: this.media.viewMany(row.gallery),
      seo: row.seo ? { ...row.seo, ogImage: this.media.view(row.seo.ogImage) } : null,
    };
  }

  async create(input: CreateServiceInput): Promise<Service> {
    const { galleryIds, ...fields } = input;
    const slug = await uniqueSlug(fields.titleEn, (s) => this.slugTaken(s));
    return this.prisma.service.create({ data: { ...fields, slug, ...connectGallery(galleryIds) } });
  }

  async update(id: string, input: UpdateServiceInput): Promise<Service> {
    const { galleryIds, ...fields } = input;
    try {
      return await this.prisma.service.update({
        where: { id },
        data: { ...fields, ...setGallery(galleryIds) },
      });
    } catch (e) {
      throw notFoundIfMissing(e, "Service not found");
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prisma.service.delete({ where: { id } });
    } catch (e) {
      throw notFoundIfMissing(e, "Service not found");
    }
  }

  private async slugTaken(slug: string): Promise<boolean> {
    return (await this.prisma.service.count({ where: { slug } })) > 0;
  }
}

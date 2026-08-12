import { Injectable } from "@nestjs/common";
import type { PublicMedia } from "@homeinn/types";
import { PrismaService } from "../prisma/prisma.service";
import { MediaService } from "../media/media.service";

export interface PublicProduct {
  id: string;
  slug: string;
  nameEn: string; nameBn: string;
  summaryEn: string; summaryBn: string;
  descriptionEn: string; descriptionBn: string;
  /** Poisha. Null means the piece is quoted rather than priced. */
  priceBdt: number | null;
  madeToOrder: boolean;
  leadTimeDays: number | null;
  sortOrder: number;
  featured: boolean;
  cover: PublicMedia | null;
  gallery?: PublicMedia[];
}

const LIST_INCLUDE = { cover: true } as const;
const DETAIL_INCLUDE = { cover: true, gallery: true } as const;

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
  ) {}

  async listPublic() {
    const rows = await this.prisma.shopProduct.findMany({
      where: { published: true },
      orderBy: [{ featured: "desc" }, { sortOrder: "asc" }],
      include: LIST_INCLUDE,
    });
    return rows.map((r) => ({ ...r, cover: this.media.view(r.cover) }));
  }

  async findPublicBySlug(slug: string) {
    const row = await this.prisma.shopProduct.findFirst({
      where: { slug, published: true },
      include: DETAIL_INCLUDE,
    });
    if (!row) return null;
    return {
      ...row,
      cover: this.media.view(row.cover),
      gallery: this.media.viewMany(row.gallery),
    };
  }
}

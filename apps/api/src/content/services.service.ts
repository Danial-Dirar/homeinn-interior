import { Injectable } from "@nestjs/common";
import type { Service } from "@prisma/client";
import type { CreateServiceInput, UpdateServiceInput } from "@homeinn/types";
import { PrismaService } from "../prisma/prisma.service";
import { uniqueSlug } from "../common/slug";
import { connectGallery, notFoundIfMissing, setGallery } from "./content.helpers";

const PUBLIC_ORDER = { sortOrder: "asc" } as const;

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  listPublic(): Promise<Service[]> {
    return this.prisma.service.findMany({ where: { published: true }, orderBy: PUBLIC_ORDER });
  }

  listAll(): Promise<Service[]> {
    return this.prisma.service.findMany({ orderBy: PUBLIC_ORDER });
  }

  findPublicBySlug(slug: string): Promise<Service | null> {
    return this.prisma.service.findFirst({ where: { slug, published: true } });
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

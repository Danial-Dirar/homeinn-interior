import { Injectable } from "@nestjs/common";
import type { WorkingArea } from "@prisma/client";
import type { CreateWorkingAreaInput, UpdateWorkingAreaInput } from "@homeinn/types";
import { PrismaService } from "../prisma/prisma.service";
import { uniqueSlug } from "../common/slug";
import { notFoundIfMissing } from "./content.helpers";

const PUBLIC_ORDER = { sortOrder: "asc" } as const;

/**
 * Working areas have no `published` column — they are the site's navigation
 * taxonomy, so every row is public and `listPublic` and `listAll` agree.
 */
@Injectable()
export class WorkingAreasService {
  constructor(private readonly prisma: PrismaService) {}

  listPublic(): Promise<WorkingArea[]> {
    return this.prisma.workingArea.findMany({ orderBy: PUBLIC_ORDER });
  }

  listAll(): Promise<WorkingArea[]> {
    return this.listPublic();
  }

  findPublicBySlug(slug: string): Promise<WorkingArea | null> {
    return this.prisma.workingArea.findFirst({ where: { slug } });
  }

  async create(input: CreateWorkingAreaInput): Promise<WorkingArea> {
    const slug = await uniqueSlug(input.nameEn, (s) => this.slugTaken(s));
    return this.prisma.workingArea.create({ data: { ...input, slug } });
  }

  async update(id: string, input: UpdateWorkingAreaInput): Promise<WorkingArea> {
    try {
      return await this.prisma.workingArea.update({ where: { id }, data: input });
    } catch (e) {
      throw notFoundIfMissing(e, "Working area not found");
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prisma.workingArea.delete({ where: { id } });
    } catch (e) {
      throw notFoundIfMissing(e, "Working area not found");
    }
  }

  private async slugTaken(slug: string): Promise<boolean> {
    return (await this.prisma.workingArea.count({ where: { slug } })) > 0;
  }
}

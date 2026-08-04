import { Injectable } from "@nestjs/common";
import type { Project } from "@prisma/client";
import type { CreateProjectInput, ProjectFilter, UpdateProjectInput } from "@homeinn/types";
import { PrismaService } from "../prisma/prisma.service";
import { uniqueSlug } from "../common/slug";
import { connectGallery, notFoundIfMissing, setGallery } from "./content.helpers";

// Featured projects lead the grid; sortOrder breaks the tie within each group.
const PUBLIC_ORDER = [{ featured: "desc" }, { sortOrder: "asc" }] as const;

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  listPublic(filter: ProjectFilter = {}): Promise<Project[]> {
    return this.prisma.project.findMany({
      where: {
        published: true,
        ...(filter.workingArea ? { workingArea: { slug: filter.workingArea } } : {}),
      },
      orderBy: [...PUBLIC_ORDER],
    });
  }

  listAll(): Promise<Project[]> {
    return this.prisma.project.findMany({ orderBy: [...PUBLIC_ORDER] });
  }

  findPublicBySlug(slug: string): Promise<Project | null> {
    return this.prisma.project.findFirst({ where: { slug, published: true } });
  }

  async create(input: CreateProjectInput): Promise<Project> {
    const { galleryIds, ...fields } = input;
    const slug = await uniqueSlug(fields.titleEn, (s) => this.slugTaken(s));
    return this.prisma.project.create({ data: { ...fields, slug, ...connectGallery(galleryIds) } });
  }

  async update(id: string, input: UpdateProjectInput): Promise<Project> {
    const { galleryIds, ...fields } = input;
    try {
      return await this.prisma.project.update({
        where: { id },
        data: { ...fields, ...setGallery(galleryIds) },
      });
    } catch (e) {
      throw notFoundIfMissing(e, "Project not found");
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prisma.project.delete({ where: { id } });
    } catch (e) {
      throw notFoundIfMissing(e, "Project not found");
    }
  }

  private async slugTaken(slug: string): Promise<boolean> {
    return (await this.prisma.project.count({ where: { slug } })) > 0;
  }
}

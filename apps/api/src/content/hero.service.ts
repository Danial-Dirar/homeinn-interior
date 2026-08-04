import { Injectable } from "@nestjs/common";
import type { HeroSegment } from "@prisma/client";
import type { CreateHeroSegmentInput, HeroTarget, UpdateHeroSegmentInput } from "@homeinn/types";
import { PrismaService } from "../prisma/prisma.service";
import { notFoundIfMissing } from "./content.helpers";

@Injectable()
export class HeroService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Mobile renders a subset of the strip (spec §7), so the flag narrows the
   * result rather than reordering it — the sort stays the same on both targets.
   */
  listActive(target: HeroTarget): Promise<HeroSegment[]> {
    return this.prisma.heroSegment.findMany({
      where: { active: true, ...(target === "mobile" ? { showOnMobile: true } : {}) },
      orderBy: { sortOrder: "asc" },
    });
  }

  listAll(): Promise<HeroSegment[]> {
    return this.prisma.heroSegment.findMany({ orderBy: { sortOrder: "asc" } });
  }

  create(input: CreateHeroSegmentInput): Promise<HeroSegment> {
    return this.prisma.heroSegment.create({ data: input });
  }

  async update(id: string, input: UpdateHeroSegmentInput): Promise<HeroSegment> {
    try {
      return await this.prisma.heroSegment.update({ where: { id }, data: input });
    } catch (e) {
      throw notFoundIfMissing(e, "Hero segment not found");
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prisma.heroSegment.delete({ where: { id } });
    } catch (e) {
      throw notFoundIfMissing(e, "Hero segment not found");
    }
  }
}

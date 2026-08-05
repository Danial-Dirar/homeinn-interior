import { Injectable } from "@nestjs/common";
import type { Testimonial } from "@prisma/client";
import type { CreateTestimonialInput, UpdateTestimonialInput } from "@homeinn/types";
import { PrismaService } from "../prisma/prisma.service";
import { MediaService } from "../media/media.service";
import { notFoundIfMissing } from "./content.helpers";

const PUBLIC_ORDER = { sortOrder: "asc" } as const;

@Injectable()
export class TestimonialsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
  ) {}

  async listPublic() {
    const rows = await this.prisma.testimonial.findMany({
      where: { published: true },
      orderBy: PUBLIC_ORDER,
      include: { avatar: true },
    });
    return rows.map((r) => ({ ...r, avatar: this.media.view(r.avatar) }));
  }

  listAll(): Promise<Testimonial[]> {
    return this.prisma.testimonial.findMany({ orderBy: PUBLIC_ORDER });
  }

  create(input: CreateTestimonialInput): Promise<Testimonial> {
    return this.prisma.testimonial.create({ data: input });
  }

  async update(id: string, input: UpdateTestimonialInput): Promise<Testimonial> {
    try {
      return await this.prisma.testimonial.update({ where: { id }, data: input });
    } catch (e) {
      throw notFoundIfMissing(e, "Testimonial not found");
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prisma.testimonial.delete({ where: { id } });
    } catch (e) {
      throw notFoundIfMissing(e, "Testimonial not found");
    }
  }
}

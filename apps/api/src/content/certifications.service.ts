import { Injectable } from "@nestjs/common";
import type { Certification } from "@prisma/client";
import type { CreateCertificationInput, UpdateCertificationInput } from "@homeinn/types";
import { PrismaService } from "../prisma/prisma.service";
import { MediaService } from "../media/media.service";
import { notFoundIfMissing } from "./content.helpers";

const PUBLIC_ORDER = { sortOrder: "asc" } as const;

/**
 * Certifications carry no `published` flag — a credential is either recorded or
 * it is not, so `listPublic` and `listAll` return the same rows.
 */
@Injectable()
export class CertificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
  ) {}

  async listPublic() {
    const rows = await this.prisma.certification.findMany({
      orderBy: PUBLIC_ORDER,
      include: { document: true },
    });
    return rows.map((r) => ({ ...r, document: this.media.view(r.document) }));
  }

  listAll() {
    return this.listPublic();
  }

  create(input: CreateCertificationInput): Promise<Certification> {
    return this.prisma.certification.create({ data: input });
  }

  async update(id: string, input: UpdateCertificationInput): Promise<Certification> {
    try {
      return await this.prisma.certification.update({ where: { id }, data: input });
    } catch (e) {
      throw notFoundIfMissing(e, "Certification not found");
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prisma.certification.delete({ where: { id } });
    } catch (e) {
      throw notFoundIfMissing(e, "Certification not found");
    }
  }
}

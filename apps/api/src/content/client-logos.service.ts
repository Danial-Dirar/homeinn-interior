import { Injectable } from "@nestjs/common";
import type { PublicMedia } from "@homeinn/types";
import { PrismaService } from "../prisma/prisma.service";
import { MediaService } from "../media/media.service";

export interface PublicClientLogo {
  id: string;
  name: string;
  website: string | null;
  sortOrder: number;
  logo: PublicMedia;
}

/**
 * The curated wall of client marks. Read-only over HTTP — these are other
 * companies' trademarks and the set is confirmed by hand, not edited casually.
 */
@Injectable()
export class ClientLogosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
  ) {}

  async listPublic(): Promise<PublicClientLogo[]> {
    const rows = await this.prisma.clientLogo.findMany({
      where: { published: true },
      orderBy: { sortOrder: "asc" },
      include: { logo: true },
    });
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      website: row.website,
      sortOrder: row.sortOrder,
      logo: this.media.toPublic(row.logo),
    }));
  }
}

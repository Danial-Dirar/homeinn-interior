import { ConflictException, Injectable } from "@nestjs/common";
import { Prisma, type ClientLogo } from "@prisma/client";
import type { CreateClientLogoInput, PublicMedia, UpdateClientLogoInput } from "@homeinn/types";
import { PrismaService } from "../prisma/prisma.service";
import { MediaService } from "../media/media.service";
import { notFoundIfMissing } from "./content.helpers";

export interface PublicClientLogo {
  id: string;
  name: string;
  website: string | null;
  sortOrder: number;
  logo: PublicMedia;
}

/**
 * The curated wall of client marks. These are other companies' trademarks,
 * shown with permission, so the set is edited deliberately from the admin
 * panel rather than imported in bulk.
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

  create(input: CreateClientLogoInput): Promise<ClientLogo> {
    return this.write(() => this.prisma.clientLogo.create({ data: input }));
  }

  update(id: string, input: UpdateClientLogoInput): Promise<ClientLogo> {
    return this.write(() => this.prisma.clientLogo.update({ where: { id }, data: input }));
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prisma.clientLogo.delete({ where: { id } });
    } catch (e) {
      throw notFoundIfMissing(e, "Client logo not found");
    }
  }

  private async write(run: () => Promise<ClientLogo>): Promise<ClientLogo> {
    try {
      return await run();
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw new ConflictException("A client logo with that name already exists");
      }
      throw notFoundIfMissing(e, "Client logo not found");
    }
  }
}

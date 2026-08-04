import { Injectable } from "@nestjs/common";
import type { TeamMember } from "@prisma/client";
import type { CreateTeamMemberInput, UpdateTeamMemberInput } from "@homeinn/types";
import { PrismaService } from "../prisma/prisma.service";
import { notFoundIfMissing } from "./content.helpers";

const PUBLIC_ORDER = { sortOrder: "asc" } as const;

@Injectable()
export class TeamService {
  constructor(private readonly prisma: PrismaService) {}

  listPublic(): Promise<TeamMember[]> {
    return this.prisma.teamMember.findMany({ where: { published: true }, orderBy: PUBLIC_ORDER });
  }

  listAll(): Promise<TeamMember[]> {
    return this.prisma.teamMember.findMany({ orderBy: PUBLIC_ORDER });
  }

  create(input: CreateTeamMemberInput): Promise<TeamMember> {
    return this.prisma.teamMember.create({ data: input });
  }

  async update(id: string, input: UpdateTeamMemberInput): Promise<TeamMember> {
    try {
      return await this.prisma.teamMember.update({ where: { id }, data: input });
    } catch (e) {
      throw notFoundIfMissing(e, "Team member not found");
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prisma.teamMember.delete({ where: { id } });
    } catch (e) {
      throw notFoundIfMissing(e, "Team member not found");
    }
  }
}

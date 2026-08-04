import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, type Lead } from "@prisma/client";
import type { CreateLeadInput, PaginationQuery, UpdateLeadInput } from "@homeinn/types";
import { PrismaService } from "../prisma/prisma.service";

/** What an anonymous submitter is allowed to see back — never the sales notes. */
export type PublicLead = Omit<Lead, "internalNotes">;

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  create(input: CreateLeadInput): Promise<PublicLead> {
    return this.prisma.lead.create({ data: input, omit: { internalNotes: true } });
  }

  async list(query: PaginationQuery): Promise<{ items: Lead[]; total: number }> {
    const [items, total] = await Promise.all([
      this.prisma.lead.findMany({
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.perPage,
        take: query.perPage,
      }),
      this.prisma.lead.count(),
    ]);
    return { items, total };
  }

  async update(id: string, input: UpdateLeadInput): Promise<Lead> {
    try {
      return await this.prisma.lead.update({ where: { id }, data: input });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
        throw new NotFoundException("Lead not found");
      }
      throw e;
    }
  }
}

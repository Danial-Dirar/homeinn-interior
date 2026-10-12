import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import type { Lead } from "@prisma/client";
import type { CreateLeadInput, LeadListQuery, UpdateLeadInput } from "@homeinn/types";
import { notFoundIfMissing } from "../content/content.helpers";
import { PrismaService } from "../prisma/prisma.service";
import { LeadNotifier } from "./lead-notifier";

/** What an anonymous submitter is allowed to see back — never the sales notes. */
export type PublicLead = Omit<Lead, "internalNotes">;

const WITH_SERVICE = { service: { select: { id: true, titleEn: true, titleBn: true } } } as const;

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifier: LeadNotifier,
  ) {}

  async create(input: CreateLeadInput): Promise<PublicLead> {
    const lead = await this.prisma.lead.create({
      data: input,
      omit: { internalNotes: true },
      include: WITH_SERVICE,
    });
    // Not awaited: the visitor's confirmation never waits on, or fails with,
    // the mail server. The row is already committed either way.
    this.notifier.leadCreated(lead).catch((error: unknown) => {
      this.logger.error(`Enquiry ${lead.id} saved, but the email failed: ${String(error)}`);
    });
    return lead;
  }

  async list(query: LeadListQuery) {
    const where = query.status ? { status: query.status } : {};
    const [items, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        include: WITH_SERVICE,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.perPage,
        take: query.perPage,
      }),
      this.prisma.lead.count({ where }),
    ]);
    return { items, total };
  }

  async findOne(id: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id }, include: WITH_SERVICE });
    if (!lead) throw new NotFoundException("Lead not found");
    return lead;
  }

  async update(id: string, input: UpdateLeadInput): Promise<Lead> {
    try {
      return await this.prisma.lead.update({ where: { id }, data: input, include: WITH_SERVICE });
    } catch (e) {
      throw notFoundIfMissing(e, "Lead not found");
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prisma.lead.delete({ where: { id } });
    } catch (e) {
      throw notFoundIfMissing(e, "Lead not found");
    }
  }
}

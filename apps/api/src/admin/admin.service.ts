import { Injectable, NotFoundException } from "@nestjs/common";
import type { Media } from "@prisma/client";
import { leadStatusSchema } from "@homeinn/types";
import { MediaService } from "../media/media.service";
import { PrismaService } from "../prisma/prisma.service";
import { ADMIN_RESOURCES, type AdminResource, type AdminRow } from "./admin.registry";

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
  ) {}

  async list(name: string) {
    const resource = this.resource(name);
    const rows = await resource.model(this.prisma).findMany({
      orderBy: resource.orderBy,
      ...(resource.listInclude ? { include: resource.listInclude } : {}),
    });
    return rows.map((row) => this.serialise(resource, row));
  }

  async findOne(name: string, id: string) {
    const resource = this.resource(name);
    const row = await resource.model(this.prisma).findUnique({
      where: { id },
      ...(resource.detailInclude ? { include: resource.detailInclude } : {}),
    });
    if (!row) throw new NotFoundException("Not found");
    return this.serialise(resource, row);
  }

  /** What is waiting: enquiries by status, the latest few, and drafts per area. */
  async summary() {
    const [grouped, recentLeads] = await Promise.all([
      this.prisma.lead.groupBy({ by: ["status"], _count: { _all: true } }),
      this.prisma.lead.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { service: { select: { id: true, titleEn: true, titleBn: true } } },
      }),
    ]);
    const leads: Record<string, number> = { total: 0 };
    for (const status of leadStatusSchema.options) leads[status] = 0;
    for (const row of grouped) {
      leads[row.status] = row._count._all;
      leads.total = (leads.total ?? 0) + row._count._all;
    }

    const content: Record<string, { total: number; drafts?: number }> = {};
    for (const [name, resource] of Object.entries(ADMIN_RESOURCES)) {
      const model = resource.model(this.prisma);
      const total = await model.count();
      content[name] = resource.publishable
        ? { total, drafts: await model.count({ where: { published: false } }) }
        : { total };
    }
    return { leads, recentLeads, content };
  }

  private resource(name: string): AdminResource {
    const resource = Object.hasOwn(ADMIN_RESOURCES, name) ? ADMIN_RESOURCES[name] : undefined;
    if (!resource) throw new NotFoundException(`No admin resource "${name}"`);
    return resource;
  }

  private serialise(resource: AdminResource, row: AdminRow) {
    const out: Record<string, unknown> = { ...row };
    for (const key of resource.media ?? []) {
      out[key] = this.media.view(row[key] as Media | null | undefined);
    }
    for (const key of resource.galleries ?? []) {
      if (Array.isArray(row[key])) out[key] = this.media.viewMany(row[key] as Media[]);
    }
    return out;
  }
}

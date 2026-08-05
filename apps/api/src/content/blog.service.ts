import { Injectable } from "@nestjs/common";
import type { BlogPost } from "@prisma/client";
import type { CreateBlogPostInput, UpdateBlogPostInput } from "@homeinn/types";
import { PrismaService } from "../prisma/prisma.service";
import { MediaService } from "../media/media.service";
import { uniqueSlug } from "../common/slug";
import { notFoundIfMissing } from "./content.helpers";

const NEWEST_FIRST = { publishedAt: "desc" } as const;

const LIST_INCLUDE = { cover: true } as const;
const DETAIL_INCLUDE = { cover: true, seo: { include: { ogImage: true } } } as const;

/**
 * A post going live without an explicit date would be invisible to `listPublic`,
 * which filters on `publishedAt`. Stamp it so publishing always means published.
 */
function stampPublishedAt(input: { published?: boolean; publishedAt?: Date }) {
  return input.published && !input.publishedAt ? { publishedAt: new Date() } : {};
}

@Injectable()
export class BlogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
  ) {}

  /** Published *and* dated on or before now — future-dated posts stay hidden. */
  async listPublic() {
    const rows = await this.prisma.blogPost.findMany({
      where: { published: true, publishedAt: { lte: new Date() } },
      orderBy: NEWEST_FIRST,
      include: LIST_INCLUDE,
    });
    return rows.map((r) => ({ ...r, cover: this.media.view(r.cover) }));
  }

  listAll(): Promise<BlogPost[]> {
    return this.prisma.blogPost.findMany({ orderBy: NEWEST_FIRST });
  }

  async findPublicBySlug(slug: string) {
    const row = await this.prisma.blogPost.findFirst({
      where: { slug, published: true, publishedAt: { lte: new Date() } },
      include: DETAIL_INCLUDE,
    });
    if (!row) return null;
    return {
      ...row,
      cover: this.media.view(row.cover),
      seo: row.seo ? { ...row.seo, ogImage: this.media.view(row.seo.ogImage) } : null,
    };
  }

  async create(input: CreateBlogPostInput): Promise<BlogPost> {
    const slug = await uniqueSlug(input.titleEn, (s) => this.slugTaken(s));
    return this.prisma.blogPost.create({ data: { ...input, slug, ...stampPublishedAt(input) } });
  }

  async update(id: string, input: UpdateBlogPostInput): Promise<BlogPost> {
    try {
      return await this.prisma.blogPost.update({
        where: { id },
        data: { ...input, ...stampPublishedAt(input) },
      });
    } catch (e) {
      throw notFoundIfMissing(e, "Post not found");
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prisma.blogPost.delete({ where: { id } });
    } catch (e) {
      throw notFoundIfMissing(e, "Post not found");
    }
  }

  private async slugTaken(slug: string): Promise<boolean> {
    return (await this.prisma.blogPost.count({ where: { slug } })) > 0;
  }
}

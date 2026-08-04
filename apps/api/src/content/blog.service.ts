import { Injectable } from "@nestjs/common";
import type { BlogPost } from "@prisma/client";
import type { CreateBlogPostInput, UpdateBlogPostInput } from "@homeinn/types";
import { PrismaService } from "../prisma/prisma.service";
import { uniqueSlug } from "../common/slug";
import { notFoundIfMissing } from "./content.helpers";

const NEWEST_FIRST = { publishedAt: "desc" } as const;

/**
 * A post going live without an explicit date would be invisible to `listPublic`,
 * which filters on `publishedAt`. Stamp it so publishing always means published.
 */
function stampPublishedAt(input: { published?: boolean; publishedAt?: Date }) {
  return input.published && !input.publishedAt ? { publishedAt: new Date() } : {};
}

@Injectable()
export class BlogService {
  constructor(private readonly prisma: PrismaService) {}

  /** Published *and* dated on or before now — future-dated posts stay hidden. */
  listPublic(): Promise<BlogPost[]> {
    return this.prisma.blogPost.findMany({
      where: { published: true, publishedAt: { lte: new Date() } },
      orderBy: NEWEST_FIRST,
    });
  }

  listAll(): Promise<BlogPost[]> {
    return this.prisma.blogPost.findMany({ orderBy: NEWEST_FIRST });
  }

  findPublicBySlug(slug: string): Promise<BlogPost | null> {
    return this.prisma.blogPost.findFirst({
      where: { slug, published: true, publishedAt: { lte: new Date() } },
    });
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

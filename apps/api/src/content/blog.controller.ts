import {
  Body, Controller, Delete, Get, HttpCode, NotFoundException, Param, Patch, Post, UseGuards,
} from "@nestjs/common";
import {
  createBlogPostSchema, updateBlogPostSchema,
  type CreateBlogPostInput, type UpdateBlogPostInput,
} from "@homeinn/types";
import { JwtGuard } from "../auth/jwt.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { BlogService } from "./blog.service";

@Controller("blog")
export class BlogController {
  constructor(private readonly blog: BlogService) {}

  @Get()
  list() {
    return this.blog.listPublic();
  }

  @Get(":slug")
  async detail(@Param("slug") slug: string) {
    const row = await this.blog.findPublicBySlug(slug);
    if (!row) throw new NotFoundException("Post not found");
    return row;
  }

  @Post()
  @UseGuards(JwtGuard, RolesGuard)
  @Roles("ADMIN", "EDITOR")
  create(@Body(new ZodValidationPipe(createBlogPostSchema)) body: CreateBlogPostInput) {
    return this.blog.create(body);
  }

  @Patch(":id")
  @UseGuards(JwtGuard, RolesGuard)
  @Roles("ADMIN", "EDITOR")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateBlogPostSchema)) body: UpdateBlogPostInput,
  ) {
    return this.blog.update(id, body);
  }

  @Delete(":id")
  @UseGuards(JwtGuard, RolesGuard)
  @Roles("ADMIN")
  @HttpCode(204)
  async remove(@Param("id") id: string): Promise<void> {
    await this.blog.remove(id);
  }
}

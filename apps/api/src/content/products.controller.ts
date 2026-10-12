import {
  Body, Controller, Delete, Get, HttpCode, NotFoundException, Param, Patch, Post, UseGuards,
} from "@nestjs/common";
import {
  createProductSchema, updateProductSchema,
  type CreateProductInput, type UpdateProductInput,
} from "@homeinn/types";
import { JwtGuard } from "../auth/jwt.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { ProductsService } from "./products.service";

@Controller("products")
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  list() {
    return this.products.listPublic();
  }

  @Get(":slug")
  async detail(@Param("slug") slug: string) {
    const row = await this.products.findPublicBySlug(slug);
    if (!row) throw new NotFoundException("Product not found");
    return row;
  }

  @Post()
  @UseGuards(JwtGuard, RolesGuard)
  @Roles("ADMIN", "EDITOR")
  create(@Body(new ZodValidationPipe(createProductSchema)) body: CreateProductInput) {
    return this.products.create(body);
  }

  @Patch(":id")
  @UseGuards(JwtGuard, RolesGuard)
  @Roles("ADMIN", "EDITOR")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateProductSchema)) body: UpdateProductInput,
  ) {
    return this.products.update(id, body);
  }

  @Delete(":id")
  @UseGuards(JwtGuard, RolesGuard)
  @Roles("ADMIN")
  @HttpCode(204)
  async remove(@Param("id") id: string): Promise<void> {
    await this.products.remove(id);
  }
}

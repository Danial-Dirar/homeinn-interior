import { Controller, Get, NotFoundException, Param } from "@nestjs/common";
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
}

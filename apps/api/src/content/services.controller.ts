import {
  Body, Controller, Delete, Get, HttpCode, NotFoundException, Param, Patch, Post, UseGuards,
} from "@nestjs/common";
import {
  createServiceSchema, updateServiceSchema,
  type CreateServiceInput, type UpdateServiceInput,
} from "@homeinn/types";
import { JwtGuard } from "../auth/jwt.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { ServicesService } from "./services.service";

@Controller("services")
export class ServicesController {
  constructor(private readonly services: ServicesService) {}

  /** Public. Drafts are invisible here — see ServicesService.listPublic. */
  @Get()
  list() {
    return this.services.listPublic();
  }

  @Get(":slug")
  async detail(@Param("slug") slug: string) {
    const row = await this.services.findPublicBySlug(slug);
    if (!row) throw new NotFoundException("Service not found");
    return row;
  }

  @Post()
  @UseGuards(JwtGuard, RolesGuard)
  @Roles("ADMIN", "EDITOR")
  create(@Body(new ZodValidationPipe(createServiceSchema)) body: CreateServiceInput) {
    return this.services.create(body);
  }

  @Patch(":id")
  @UseGuards(JwtGuard, RolesGuard)
  @Roles("ADMIN", "EDITOR")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateServiceSchema)) body: UpdateServiceInput,
  ) {
    return this.services.update(id, body);
  }

  @Delete(":id")
  @UseGuards(JwtGuard, RolesGuard)
  @Roles("ADMIN")
  @HttpCode(204)
  async remove(@Param("id") id: string): Promise<void> {
    await this.services.remove(id);
  }
}

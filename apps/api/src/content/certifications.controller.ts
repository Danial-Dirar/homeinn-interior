import {
  Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards,
} from "@nestjs/common";
import {
  createCertificationSchema, updateCertificationSchema,
  type CreateCertificationInput, type UpdateCertificationInput,
} from "@homeinn/types";
import { JwtGuard } from "../auth/jwt.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { CertificationsService } from "./certifications.service";

@Controller("certifications")
export class CertificationsController {
  constructor(private readonly certifications: CertificationsService) {}

  @Get()
  list() {
    return this.certifications.listPublic();
  }

  @Post()
  @UseGuards(JwtGuard, RolesGuard)
  @Roles("ADMIN", "EDITOR")
  create(@Body(new ZodValidationPipe(createCertificationSchema)) body: CreateCertificationInput) {
    return this.certifications.create(body);
  }

  @Patch(":id")
  @UseGuards(JwtGuard, RolesGuard)
  @Roles("ADMIN", "EDITOR")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateCertificationSchema)) body: UpdateCertificationInput,
  ) {
    return this.certifications.update(id, body);
  }

  @Delete(":id")
  @UseGuards(JwtGuard, RolesGuard)
  @Roles("ADMIN")
  @HttpCode(204)
  async remove(@Param("id") id: string): Promise<void> {
    await this.certifications.remove(id);
  }
}

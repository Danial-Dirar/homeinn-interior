import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from "@nestjs/common";
import {
  createClientLogoSchema, updateClientLogoSchema,
  type CreateClientLogoInput, type UpdateClientLogoInput,
} from "@homeinn/types";
import { JwtGuard } from "../auth/jwt.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { ClientLogosService } from "./client-logos.service";

@Controller("client-logos")
export class ClientLogosController {
  constructor(private readonly clientLogos: ClientLogosService) {}

  /** Public. Drives the logo marquee on /clients. */
  @Get()
  list() {
    return this.clientLogos.listPublic();
  }

  @Post()
  @UseGuards(JwtGuard, RolesGuard)
  @Roles("ADMIN", "EDITOR")
  create(@Body(new ZodValidationPipe(createClientLogoSchema)) body: CreateClientLogoInput) {
    return this.clientLogos.create(body);
  }

  @Patch(":id")
  @UseGuards(JwtGuard, RolesGuard)
  @Roles("ADMIN", "EDITOR")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateClientLogoSchema)) body: UpdateClientLogoInput,
  ) {
    return this.clientLogos.update(id, body);
  }

  @Delete(":id")
  @UseGuards(JwtGuard, RolesGuard)
  @Roles("ADMIN")
  @HttpCode(204)
  async remove(@Param("id") id: string): Promise<void> {
    await this.clientLogos.remove(id);
  }
}

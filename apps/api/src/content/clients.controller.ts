import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from "@nestjs/common";
import {
  createCorporateClientSchema, createResidentialClientSchema,
  updateCorporateClientSchema, updateResidentialClientSchema,
  type CreateCorporateClientInput, type CreateResidentialClientInput,
  type UpdateCorporateClientInput, type UpdateResidentialClientInput,
} from "@homeinn/types";
import { JwtGuard } from "../auth/jwt.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { ClientsService } from "./clients.service";

/**
 * Both client lists come from the company profile and are kept current from
 * the admin panel. Deliberately no public route returns unconsented
 * residential rows — see spec §11. The full list is read through the guarded
 * admin surface only.
 */
@Controller("clients")
export class ClientsController {
  constructor(private readonly clients: ClientsService) {}

  @Get("corporate")
  corporate() {
    return this.clients.listCorporatePublic();
  }

  @Get("residential-summary")
  residentialSummary() {
    return this.clients.residentialSummary();
  }

  /** Only rows whose owner consented to being named. */
  @Get("residential")
  residential() {
    return this.clients.listResidentialPublic();
  }

  @Post("corporate")
  @UseGuards(JwtGuard, RolesGuard)
  @Roles("ADMIN", "EDITOR")
  createCorporate(@Body(new ZodValidationPipe(createCorporateClientSchema)) body: CreateCorporateClientInput) {
    return this.clients.createCorporate(body);
  }

  @Patch("corporate/:id")
  @UseGuards(JwtGuard, RolesGuard)
  @Roles("ADMIN", "EDITOR")
  updateCorporate(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateCorporateClientSchema)) body: UpdateCorporateClientInput,
  ) {
    return this.clients.updateCorporate(id, body);
  }

  @Delete("corporate/:id")
  @UseGuards(JwtGuard, RolesGuard)
  @Roles("ADMIN")
  @HttpCode(204)
  async removeCorporate(@Param("id") id: string): Promise<void> {
    await this.clients.removeCorporate(id);
  }

  @Post("residential")
  @UseGuards(JwtGuard, RolesGuard)
  @Roles("ADMIN", "EDITOR")
  createResidential(
    @Body(new ZodValidationPipe(createResidentialClientSchema)) body: CreateResidentialClientInput,
  ) {
    return this.clients.createResidential(body);
  }

  @Patch("residential/:id")
  @UseGuards(JwtGuard, RolesGuard)
  @Roles("ADMIN", "EDITOR")
  updateResidential(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateResidentialClientSchema)) body: UpdateResidentialClientInput,
  ) {
    return this.clients.updateResidential(id, body);
  }

  @Delete("residential/:id")
  @UseGuards(JwtGuard, RolesGuard)
  @Roles("ADMIN")
  @HttpCode(204)
  async removeResidential(@Param("id") id: string): Promise<void> {
    await this.clients.removeResidential(id);
  }
}

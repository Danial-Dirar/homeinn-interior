import {
  Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, UseGuards,
} from "@nestjs/common";
import {
  createHeroSegmentSchema, heroQuerySchema, updateHeroSegmentSchema,
  type CreateHeroSegmentInput, type HeroQuery, type UpdateHeroSegmentInput,
} from "@homeinn/types";
import { JwtGuard } from "../auth/jwt.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { HeroService } from "./hero.service";

@Controller("hero")
export class HeroController {
  constructor(private readonly hero: HeroService) {}

  /** Public. `?target=mobile` returns the narrower mobile strip (spec §7). */
  @Get()
  list(@Query(new ZodValidationPipe(heroQuerySchema)) query: HeroQuery) {
    return this.hero.listActive(query.target);
  }

  @Post()
  @UseGuards(JwtGuard, RolesGuard)
  @Roles("ADMIN", "EDITOR")
  create(@Body(new ZodValidationPipe(createHeroSegmentSchema)) body: CreateHeroSegmentInput) {
    return this.hero.create(body);
  }

  @Patch(":id")
  @UseGuards(JwtGuard, RolesGuard)
  @Roles("ADMIN", "EDITOR")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateHeroSegmentSchema)) body: UpdateHeroSegmentInput,
  ) {
    return this.hero.update(id, body);
  }

  @Delete(":id")
  @UseGuards(JwtGuard, RolesGuard)
  @Roles("ADMIN")
  @HttpCode(204)
  async remove(@Param("id") id: string): Promise<void> {
    await this.hero.remove(id);
  }
}

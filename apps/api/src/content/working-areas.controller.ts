import {
  Body, Controller, Delete, Get, HttpCode, NotFoundException, Param, Patch, Post, UseGuards,
} from "@nestjs/common";
import {
  createWorkingAreaSchema, updateWorkingAreaSchema,
  type CreateWorkingAreaInput, type UpdateWorkingAreaInput,
} from "@homeinn/types";
import { JwtGuard } from "../auth/jwt.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { WorkingAreasService } from "./working-areas.service";

@Controller("working-areas")
export class WorkingAreasController {
  constructor(private readonly workingAreas: WorkingAreasService) {}

  @Get()
  list() {
    return this.workingAreas.listPublic();
  }

  @Get(":slug")
  async detail(@Param("slug") slug: string) {
    const row = await this.workingAreas.findPublicBySlug(slug);
    if (!row) throw new NotFoundException("Working area not found");
    return row;
  }

  @Post()
  @UseGuards(JwtGuard, RolesGuard)
  @Roles("ADMIN", "EDITOR")
  create(@Body(new ZodValidationPipe(createWorkingAreaSchema)) body: CreateWorkingAreaInput) {
    return this.workingAreas.create(body);
  }

  @Patch(":id")
  @UseGuards(JwtGuard, RolesGuard)
  @Roles("ADMIN", "EDITOR")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateWorkingAreaSchema)) body: UpdateWorkingAreaInput,
  ) {
    return this.workingAreas.update(id, body);
  }

  @Delete(":id")
  @UseGuards(JwtGuard, RolesGuard)
  @Roles("ADMIN")
  @HttpCode(204)
  async remove(@Param("id") id: string): Promise<void> {
    await this.workingAreas.remove(id);
  }
}

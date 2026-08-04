import {
  Body, Controller, Delete, Get, HttpCode, NotFoundException, Param, Patch, Post, Query, UseGuards,
} from "@nestjs/common";
import {
  createProjectSchema, projectFilterSchema, updateProjectSchema,
  type CreateProjectInput, type ProjectFilter, type UpdateProjectInput,
} from "@homeinn/types";
import { JwtGuard } from "../auth/jwt.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { ProjectsService } from "./projects.service";

@Controller("projects")
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  /** Public. `?workingArea=<slug>` narrows the grid to one working area. */
  @Get()
  list(@Query(new ZodValidationPipe(projectFilterSchema)) filter: ProjectFilter) {
    return this.projects.listPublic(filter);
  }

  @Get(":slug")
  async detail(@Param("slug") slug: string) {
    const row = await this.projects.findPublicBySlug(slug);
    if (!row) throw new NotFoundException("Project not found");
    return row;
  }

  @Post()
  @UseGuards(JwtGuard, RolesGuard)
  @Roles("ADMIN", "EDITOR")
  create(@Body(new ZodValidationPipe(createProjectSchema)) body: CreateProjectInput) {
    return this.projects.create(body);
  }

  @Patch(":id")
  @UseGuards(JwtGuard, RolesGuard)
  @Roles("ADMIN", "EDITOR")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateProjectSchema)) body: UpdateProjectInput,
  ) {
    return this.projects.update(id, body);
  }

  @Delete(":id")
  @UseGuards(JwtGuard, RolesGuard)
  @Roles("ADMIN")
  @HttpCode(204)
  async remove(@Param("id") id: string): Promise<void> {
    await this.projects.remove(id);
  }
}

import {
  Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards,
} from "@nestjs/common";
import {
  createTeamMemberSchema, updateTeamMemberSchema,
  type CreateTeamMemberInput, type UpdateTeamMemberInput,
} from "@homeinn/types";
import { JwtGuard } from "../auth/jwt.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { TeamService } from "./team.service";

@Controller("team")
export class TeamController {
  constructor(private readonly team: TeamService) {}

  @Get()
  list() {
    return this.team.listPublic();
  }

  @Post()
  @UseGuards(JwtGuard, RolesGuard)
  @Roles("ADMIN", "EDITOR")
  create(@Body(new ZodValidationPipe(createTeamMemberSchema)) body: CreateTeamMemberInput) {
    return this.team.create(body);
  }

  @Patch(":id")
  @UseGuards(JwtGuard, RolesGuard)
  @Roles("ADMIN", "EDITOR")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateTeamMemberSchema)) body: UpdateTeamMemberInput,
  ) {
    return this.team.update(id, body);
  }

  @Delete(":id")
  @UseGuards(JwtGuard, RolesGuard)
  @Roles("ADMIN")
  @HttpCode(204)
  async remove(@Param("id") id: string): Promise<void> {
    await this.team.remove(id);
  }
}

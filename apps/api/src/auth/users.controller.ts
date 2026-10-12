import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards } from "@nestjs/common";
import {
  createUserSchema, updateUserSchema,
  type AuthUser, type CreateUserInput, type UpdateUserInput,
} from "@homeinn/types";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { CurrentUser } from "./current-user.decorator";
import { JwtGuard } from "./jwt.guard";
import { Roles } from "./roles.decorator";
import { RolesGuard } from "./roles.guard";
import { UsersService } from "./users.service";

/** Accounts for the admin panel. Admins only, every route. */
@Controller("users")
@UseGuards(JwtGuard, RolesGuard)
@Roles("ADMIN")
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list() {
    return this.users.list();
  }

  @Post()
  create(@Body(new ZodValidationPipe(createUserSchema)) body: CreateUserInput) {
    return this.users.create(body);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateUserSchema)) body: UpdateUserInput,
  ) {
    return this.users.update(id, body);
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(@Param("id") id: string, @CurrentUser() user: AuthUser): Promise<void> {
    await this.users.remove(id, user.id);
  }
}

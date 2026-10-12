import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { JwtGuard } from "../auth/jwt.guard";
import { AdminService } from "./admin.service";

/**
 * The admin panel's read surface: drafts as well as published rows, by id,
 * with every relation an editor changes. Writes stay on each resource's own
 * routes, which carry their own role rules.
 */
@Controller("admin")
@UseGuards(JwtGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get("summary")
  summary() {
    return this.admin.summary();
  }

  @Get(":resource")
  list(@Param("resource") resource: string) {
    return this.admin.list(resource);
  }

  @Get(":resource/:id")
  findOne(@Param("resource") resource: string, @Param("id") id: string) {
    return this.admin.findOne(resource, id);
  }
}

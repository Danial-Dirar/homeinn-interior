import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { updateSettingsSchema, type UpdateSettingsInput } from "@homeinn/types";
import { JwtGuard } from "../auth/jwt.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { SettingsService } from "./settings.service";

@Controller("settings")
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  /** Public — the footer, contact block, and headline stats all read this. */
  @Get()
  get() {
    return this.settings.get();
  }

  @Patch()
  @UseGuards(JwtGuard, RolesGuard)
  @Roles("ADMIN")
  update(@Body(new ZodValidationPipe(updateSettingsSchema)) body: UpdateSettingsInput) {
    return this.settings.update(body);
  }
}

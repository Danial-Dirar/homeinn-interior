import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import {
  createLeadSchema, leadListQuerySchema, updateLeadSchema,
  type CreateLeadInput, type LeadListQuery, type UpdateLeadInput,
} from "@homeinn/types";
import { JwtGuard } from "../auth/jwt.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { LeadsService } from "./leads.service";

@Controller("leads")
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  /** Public. The only unauthenticated write in the API, hence the tight cap. */
  @Post()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 3_600_000, limit: 5 } })
  create(@Body(new ZodValidationPipe(createLeadSchema)) body: CreateLeadInput) {
    return this.leads.create(body);
  }

  /** The inbox. `?status=NEW` answers "who has not been answered yet". */
  @Get()
  @UseGuards(JwtGuard)
  list(@Query(new ZodValidationPipe(leadListQuerySchema)) query: LeadListQuery) {
    return this.leads.list(query);
  }

  @Get(":id")
  @UseGuards(JwtGuard)
  findOne(@Param("id") id: string) {
    return this.leads.findOne(id);
  }

  @Patch(":id")
  @UseGuards(JwtGuard)
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateLeadSchema)) body: UpdateLeadInput,
  ) {
    return this.leads.update(id, body);
  }

  /** Spam and test submissions. Admins only: an enquiry is a customer's record. */
  @Delete(":id")
  @UseGuards(JwtGuard, RolesGuard)
  @Roles("ADMIN")
  @HttpCode(204)
  async remove(@Param("id") id: string): Promise<void> {
    await this.leads.remove(id);
  }
}

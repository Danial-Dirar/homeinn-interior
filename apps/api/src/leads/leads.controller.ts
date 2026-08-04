import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";
import {
  createLeadSchema, paginationQuerySchema, updateLeadSchema,
  type CreateLeadInput, type PaginationQuery, type UpdateLeadInput,
} from "@homeinn/types";
import { JwtGuard } from "../auth/jwt.guard";
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

  @Get()
  @UseGuards(JwtGuard)
  list(@Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQuery) {
    return this.leads.list(query);
  }

  @Patch(":id")
  @UseGuards(JwtGuard)
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateLeadSchema)) body: UpdateLeadInput,
  ) {
    return this.leads.update(id, body);
  }
}

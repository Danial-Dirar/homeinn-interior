import {
  Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, UseGuards,
} from "@nestjs/common";
import {
  createTestimonialSchema, updateTestimonialSchema,
  type CreateTestimonialInput, type UpdateTestimonialInput,
} from "@homeinn/types";
import { JwtGuard } from "../auth/jwt.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { TestimonialsService } from "./testimonials.service";

@Controller("testimonials")
export class TestimonialsController {
  constructor(private readonly testimonials: TestimonialsService) {}

  @Get()
  list() {
    return this.testimonials.listPublic();
  }

  @Post()
  @UseGuards(JwtGuard, RolesGuard)
  @Roles("ADMIN", "EDITOR")
  create(@Body(new ZodValidationPipe(createTestimonialSchema)) body: CreateTestimonialInput) {
    return this.testimonials.create(body);
  }

  @Patch(":id")
  @UseGuards(JwtGuard, RolesGuard)
  @Roles("ADMIN", "EDITOR")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateTestimonialSchema)) body: UpdateTestimonialInput,
  ) {
    return this.testimonials.update(id, body);
  }

  @Delete(":id")
  @UseGuards(JwtGuard, RolesGuard)
  @Roles("ADMIN")
  @HttpCode(204)
  async remove(@Param("id") id: string): Promise<void> {
    await this.testimonials.remove(id);
  }
}

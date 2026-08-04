import {
  BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, Post, Query,
  UploadedFile, UseGuards, UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  paginationQuerySchema, uploadMediaSchema,
  type PaginationQuery, type UploadMediaInput,
} from "@homeinn/types";
import { JwtGuard } from "../auth/jwt.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { MediaService } from "./media.service";

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

@Controller("media")
@UseGuards(JwtGuard, RolesGuard)
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post()
  @Roles("ADMIN", "EDITOR")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: MAX_UPLOAD_BYTES } }))
  async upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body(new ZodValidationPipe(uploadMediaSchema)) body: UploadMediaInput,
  ) {
    if (!file) throw new BadRequestException("A file is required under the \"file\" field");
    const row = await this.media.ingest(file, body);
    return this.media.toPublic(row);
  }

  @Get()
  list(@Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQuery) {
    return this.media.list(query);
  }

  @Delete(":id")
  @Roles("ADMIN")
  @HttpCode(204)
  async remove(@Param("id") id: string): Promise<void> {
    await this.media.remove(id);
  }
}

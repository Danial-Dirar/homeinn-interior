import {
  BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query,
  UploadedFile, UseGuards, UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  mediaListQuerySchema, uploadMediaSchema,
  type MediaListQuery, type UploadMediaInput,
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

  /** The library. `?q=` searches the English and Bangla alt text. */
  @Get()
  list(@Query(new ZodValidationPipe(mediaListQuerySchema)) query: MediaListQuery) {
    return this.media.list(query);
  }

  /** Alt text is required at upload and must stay correctable afterwards. */
  @Patch(":id")
  @Roles("ADMIN", "EDITOR")
  async updateAlt(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(uploadMediaSchema)) body: UploadMediaInput,
  ) {
    return this.media.toPublic(await this.media.updateAlt(id, body));
  }

  @Delete(":id")
  @Roles("ADMIN")
  @HttpCode(204)
  async remove(@Param("id") id: string): Promise<void> {
    await this.media.remove(id);
  }
}

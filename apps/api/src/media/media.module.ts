import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { MediaController } from "./media.controller";
import { MediaService } from "./media.service";
import { LocalDiskStorage } from "./storage/local-disk.storage";
import { StorageService } from "./storage/storage.interface";

@Module({
  imports: [AuthModule],
  controllers: [MediaController],
  providers: [MediaService, { provide: StorageService, useClass: LocalDiskStorage }],
  exports: [MediaService],
})
export class MediaModule {}

import { Injectable } from "@nestjs/common";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { StorageService } from "./storage.interface";

@Injectable()
export class LocalDiskStorage extends StorageService {
  private readonly root = process.env.UPLOAD_DIR ?? "./uploads";
  private readonly base = process.env.PUBLIC_MEDIA_BASE_URL ?? "http://localhost:4000/media";

  async put(key: string, data: Buffer): Promise<void> {
    const path = join(this.root, key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, data);
  }

  async delete(key: string): Promise<void> {
    await rm(join(this.root, key), { force: true });
  }

  publicUrl(key: string): string {
    return `${this.base}/${key}`;
  }
}

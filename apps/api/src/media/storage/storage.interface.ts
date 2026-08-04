export abstract class StorageService {
  abstract put(key: string, data: Buffer, mime: string): Promise<void>;
  abstract delete(key: string): Promise<void>;
  abstract publicUrl(key: string): string;
}

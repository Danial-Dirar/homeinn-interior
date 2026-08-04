import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import cookieParser from "cookie-parser";
import { join } from "node:path";
import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.use(cookieParser());
  app.useStaticAssets(join(process.cwd(), process.env.UPLOAD_DIR ?? "./uploads"), { prefix: "/media/" });
  app.setGlobalPrefix("api");
  app.enableCors({ origin: process.env.WEB_ORIGIN ?? "http://localhost:3000", credentials: true });
  await app.listen(Number(process.env.PORT ?? 4000));
}
void bootstrap();

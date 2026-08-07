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
  // The lead form posts straight from the browser (the throttler is per-IP, so
  // proxying would collapse every visitor onto one budget), which makes CORS
  // load-bearing. Accept a comma-separated list so a dev port and the real
  // origin can both be allowed without a code change.
  const origins = (process.env.WEB_ORIGIN ?? "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({ origin: origins, credentials: true });
  await app.listen(Number(process.env.PORT ?? 4000));
}
void bootstrap();

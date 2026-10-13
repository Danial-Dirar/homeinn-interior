import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import cookieParser from "cookie-parser";
import { join } from "node:path";
import { AppModule } from "./app.module";
import { trustProxySetting } from "./common/trust-proxy";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.use(cookieParser());
  // Behind a tunnel or reverse proxy every request arrives from the proxy, and
  // the per-IP limits on login and the lead form would collapse into one bucket
  // that a single visitor could exhaust. Trust the forwarded address from the
  // loopback proxy by default; TRUST_PROXY overrides it (Express syntax).
  app.set("trust proxy", trustProxySetting(process.env.TRUST_PROXY));
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
  // HOST=127.0.0.1 on the host: the only client there is the local proxy, and
  // a wildcard bind would let anything on the LAN reach the API unproxied.
  const port = Number(process.env.PORT ?? 4000);
  if (process.env.HOST) await app.listen(port, process.env.HOST);
  else await app.listen(port);
}
void bootstrap();

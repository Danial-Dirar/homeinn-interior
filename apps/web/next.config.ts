import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";
import { join } from "node:path";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const config: NextConfig = {
  reactStrictMode: true,
  // A stray lockfile in $HOME makes Next infer the wrong workspace root.
  outputFileTracingRoot: join(import.meta.dirname, "../.."),
  // Images are already optimised by the API's sharp pipeline into responsive
  // AVIF + WebP derivatives, so nothing here goes through the Next loader.
  images: { unoptimized: true },
  // @homeinn/ui ships TypeScript source rather than a build step.
  transpilePackages: ["@homeinn/ui"],
};

export default withNextIntl(config);

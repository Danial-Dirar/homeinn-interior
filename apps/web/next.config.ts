import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const config: NextConfig = {
  reactStrictMode: true,
  // Images are already optimised by the API's sharp pipeline into responsive
  // AVIF + WebP derivatives, so nothing here goes through the Next loader.
  images: { unoptimized: true },
};

export default withNextIntl(config);

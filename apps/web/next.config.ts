import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  // Images are already optimised by the API's sharp pipeline into responsive
  // AVIF + WebP derivatives, so nothing here goes through the Next loader.
  images: { unoptimized: true },
};

export default config;

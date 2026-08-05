import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./"),
      "@homeinn/ui": resolve(__dirname, "../../packages/ui/src"),
      // next-intl imports "next/navigation" extensionless, which Node's ESM
      // resolver rejects from inside its own package. Point it at the real file
      // so the mock in vitest.setup.ts can take over.
      "next/navigation": resolve(__dirname, "node_modules/next/navigation.js"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["{app,components,hooks,lib,messages}/**/*.test.{ts,tsx}"],
    // Vite must transform next-intl for the alias above to reach its imports.
    server: { deps: { inline: ["next-intl"] } },
  },
});

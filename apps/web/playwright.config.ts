import { defineConfig, devices } from "@playwright/test";

// Port 3000 is often taken on dev machines; PORT decides, and the tests follow.
const PORT = process.env.PORT ?? "3100";
const WEB = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: WEB, trace: "on-first-retry" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 5"] } },
  ],
  // The API must already be running against a seeded database:
  //   pnpm db:start && pnpm --filter @homeinn/api build && pnpm --filter @homeinn/api seed
  //   pnpm --filter @homeinn/api start
  webServer: {
    command: `PORT=${PORT} pnpm start`,
    url: WEB,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});

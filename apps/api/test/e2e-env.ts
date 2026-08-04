import { resolve } from "node:path";
import { config } from "dotenv";

// e2e truncates every table, so it must never point at the dev database.
config({ path: resolve(__dirname, "../../../.env"), quiet: true });

const url = process.env.TEST_DATABASE_URL;
if (!url) {
  throw new Error("TEST_DATABASE_URL is not set — see .env.example");
}
if (!/\/[a-z0-9_]*_test(\?|$)/i.test(url)) {
  throw new Error(
    `Refusing to run e2e against ${url} — the database name must end in "_test".`,
  );
}

process.env.DATABASE_URL = url;

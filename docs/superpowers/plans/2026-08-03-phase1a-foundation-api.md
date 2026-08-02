# Home Inn Phase 1A — Foundation & API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A migrated PostgreSQL database, a tested NestJS REST API covering auth, media, content, and leads, and a seed script loading Home Inn's real business data.

**Architecture:** pnpm + Turborepo monorepo. `apps/api` is NestJS 11 over Prisma/PostgreSQL 18. `packages/types` exports Zod schemas that the API validates with and the web app will later infer types from — one contract, two consumers. Storage is behind a `StorageService` interface so the local-disk implementation can be swapped for S3 without touching call sites.

**Tech Stack:** TypeScript 5.7, NestJS 11, Prisma 6, PostgreSQL 18, Zod 3, argon2, sharp, Jest, supertest.

**Spec:** `docs/superpowers/specs/2026-08-03-homeinn-phase1-design.md`

## Global Constraints

- **PostgreSQL 18.** Dev runs a project-local cluster at `.pgdata` on port **5433**, started with `pg_ctl`. No Docker, no sudo, no system service.
- **Every user-facing text field is bilingual** — stored as `<name>En` and `<name>Bn` column pairs. No exceptions, no single-language content fields.
- **`Media.altEn` and `Media.altBn` are required and must be non-empty.** Enforced at the API layer, not just the DB.
- **No fabricated content.** Testimonials and team seed empty. Only stats traceable to the company profile PDF are used. See spec §12.
- **`ResidentialClient.publiclyListed` defaults to `false`.** The public API must never return residential client names unless that flag is true. See spec §11.
- **Publish claims use "projects", never "clients"** — 73 corporate *projects*, 57 residential *projects*.
- **Git commits carry no `Co-Authored-By` trailer and no "Generated with Claude Code" line.** The user is the sole author.
- Node 26, pnpm 11. `pnpm` is at `~/.npm-global/bin/pnpm`; ensure that is on `PATH`.
- All IDs are `cuid()`. All timestamps are `DateTime`.

## File Structure

```
homeinn/
├─ package.json                    workspace root, scripts
├─ pnpm-workspace.yaml
├─ turbo.json
├─ .gitignore                      already exists — extend with .pgdata/
├─ scripts/
│  └─ pg.sh                        init/start/stop the local cluster
├─ packages/
│  ├─ config/
│  │  ├─ package.json
│  │  ├─ tsconfig.base.json
│  │  └─ eslint.config.js
│  └─ types/
│     ├─ package.json
│     ├─ src/index.ts              barrel
│     ├─ src/common.ts             Locale, pagination, id schemas
│     ├─ src/auth.ts               login, token, role schemas
│     ├─ src/media.ts              media + upload schemas
│     ├─ src/lead.ts               lead schemas
│     └─ src/content.ts            service/project/client/hero/blog schemas
└─ apps/
   └─ api/
      ├─ package.json
      ├─ tsconfig.json
      ├─ nest-cli.json
      ├─ prisma/
      │  ├─ schema.prisma
      │  └─ seed.ts
      ├─ src/
      │  ├─ main.ts
      │  ├─ app.module.ts
      │  ├─ prisma/                PrismaModule, PrismaService
      │  ├─ common/
      │  │  ├─ zod-validation.pipe.ts
      │  │  └─ slug.ts             pure slug helper
      │  ├─ auth/                  controller, service, guards, strategies
      │  ├─ media/                 controller, service, storage/
      │  ├─ leads/                 controller, service
      │  ├─ content/               services, projects, clients, hero, blog…
      │  └─ settings/
      └─ test/
         ├─ setup-db.ts            per-run migrate + truncate helpers
         └─ *.e2e-spec.ts
```

Each Nest feature folder owns one resource: module, controller, service, and its
tests. Files that change together live together. Nothing in `content/` imports
from `auth/` except the guards, which are re-exported from `auth/index.ts`.

---

## Task 1: Monorepo skeleton

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `turbo.json`
- Create: `packages/config/package.json`, `packages/config/tsconfig.base.json`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: nothing
- Produces: workspace resolution for `@homeinn/config`, `@homeinn/types`, `@homeinn/api`. Root scripts `pnpm build`, `pnpm test`, `pnpm lint`, `pnpm typecheck`.

- [ ] **Step 1: Create the workspace manifest**

`pnpm-workspace.yaml`:
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

`package.json`:
```json
{
  "name": "homeinn",
  "private": true,
  "packageManager": "pnpm@11.18.0",
  "engines": { "node": ">=22" },
  "scripts": {
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "db:init": "bash scripts/pg.sh init",
    "db:start": "bash scripts/pg.sh start",
    "db:stop": "bash scripts/pg.sh stop",
    "db:status": "bash scripts/pg.sh status"
  },
  "devDependencies": {
    "turbo": "^2.3.0",
    "typescript": "^5.7.2"
  }
}
```

`turbo.json`:
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**", ".next/**"] },
    "test": { "dependsOn": ["^build"] },
    "lint": {},
    "typecheck": { "dependsOn": ["^build"] }
  }
}
```

- [ ] **Step 2: Create the shared tsconfig package**

`packages/config/package.json`:
```json
{
  "name": "@homeinn/config",
  "version": "0.0.0",
  "private": true,
  "files": ["tsconfig.base.json"]
}
```

`packages/config/tsconfig.base.json`:
```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ES2023",
    "lib": ["ES2023"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "sourceMap": true
  }
}
```

- [ ] **Step 3: Extend .gitignore**

Append to the existing `.gitignore`:
```
.pgdata/
*.tsbuildinfo
```

- [ ] **Step 4: Install and verify the workspace resolves**

Run: `pnpm install`
Expected: completes; `packages/config` is linked.

Run: `pnpm ls --depth -1`
Expected: lists `homeinn` and the workspace packages without error.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-workspace.yaml turbo.json packages/config .gitignore pnpm-lock.yaml
git commit -m "chore: initialise pnpm + turborepo workspace"
```

---

## Task 2: Local PostgreSQL cluster

The dev machine has no Docker and no passwordless sudo. This task creates a
repo-local, user-owned cluster. **Prerequisite:** the `postgresql` package must
be installed (`sudo pacman -S postgresql`) so that `initdb` and `pg_ctl` exist.
The machine ships only `postgresql-libs`.

**Files:**
- Create: `scripts/pg.sh`
- Create: `.env.example`

**Interfaces:**
- Consumes: Task 1's root scripts
- Produces: a running cluster on `localhost:5433`, databases `homeinn_dev` and `homeinn_test`. Connection string shape: `postgresql://$USER@localhost:5433/homeinn_dev?schema=public`

- [ ] **Step 1: Verify the server binaries exist**

Run: `command -v initdb pg_ctl`
Expected: both print a path.
If not: stop and run `sudo pacman -S postgresql`, then retry. Do not proceed without them.

- [ ] **Step 2: Write the cluster script**

`scripts/pg.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail

PGDATA="$(cd "$(dirname "$0")/.." && pwd)/.pgdata"
PORT=5433
LOG="$PGDATA/server.log"

case "${1:-}" in
  init)
    if [ -d "$PGDATA" ]; then echo "cluster already exists at $PGDATA"; exit 0; fi
    initdb -D "$PGDATA" -U "$USER" --auth=trust --encoding=UTF8 --locale=C
    echo "unix_socket_directories = '$PGDATA'" >> "$PGDATA/postgresql.conf"
    pg_ctl -D "$PGDATA" -o "-p $PORT" -l "$LOG" start
    until pg_isready -h localhost -p "$PORT" -q; do sleep 0.3; done
    createdb -h localhost -p "$PORT" homeinn_dev
    createdb -h localhost -p "$PORT" homeinn_test
    echo "created homeinn_dev and homeinn_test on port $PORT"
    ;;
  start)
    pg_ctl -D "$PGDATA" -o "-p $PORT" -l "$LOG" start
    until pg_isready -h localhost -p "$PORT" -q; do sleep 0.3; done
    echo "postgres up on $PORT"
    ;;
  stop)   pg_ctl -D "$PGDATA" -m fast stop ;;
  status) pg_isready -h localhost -p "$PORT" ;;
  *) echo "usage: pg.sh {init|start|stop|status}"; exit 1 ;;
esac
```

Make it executable: `chmod +x scripts/pg.sh`

- [ ] **Step 3: Write .env.example**

`.env.example`:
```
DATABASE_URL="postgresql://muhammad@localhost:5433/homeinn_dev?schema=public"
TEST_DATABASE_URL="postgresql://muhammad@localhost:5433/homeinn_test?schema=public"
JWT_ACCESS_SECRET="change-me-in-production"
JWT_REFRESH_SECRET="change-me-too-in-production"
UPLOAD_DIR="./uploads"
PUBLIC_MEDIA_BASE_URL="http://localhost:4000/media"
PORT=4000
```

Copy it: `cp .env.example .env` and replace `muhammad` with `$USER` if different.

- [ ] **Step 4: Initialise and verify**

Run: `pnpm db:init`
Expected: prints "created homeinn_dev and homeinn_test on port 5433".

Run: `psql -h localhost -p 5433 -d homeinn_dev -c "select version();"`
Expected: prints `PostgreSQL 18.x`.

- [ ] **Step 5: Commit**

```bash
git add scripts/pg.sh .env.example .gitignore
git commit -m "chore: add repo-local postgres cluster scripts"
```

---

## Task 3: Shared Zod schemas — common and auth

**Files:**
- Create: `packages/types/package.json`, `packages/types/tsconfig.json`
- Create: `packages/types/src/common.ts`, `packages/types/src/auth.ts`, `packages/types/src/index.ts`
- Test: `packages/types/src/common.test.ts`, `packages/types/src/auth.test.ts`

**Interfaces:**
- Consumes: `@homeinn/config` tsconfig base
- Produces:
  - `localeSchema: ZodEnum<["en","bn"]>`, type `Locale`
  - `paginationQuerySchema` → `{ page: number; perPage: number }` (defaults 1 / 20, perPage max 100)
  - `bilingualText(field: string)` → helper producing `{ <field>En: string; <field>Bn: string }` with both non-empty
  - `loginSchema` → `{ email: string; password: string }`
  - `roleSchema: ZodEnum<["ADMIN","EDITOR"]>`, type `Role`
  - `authUserSchema` → `{ id, email, name, role }`

- [ ] **Step 1: Write the failing tests**

`packages/types/src/common.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { paginationQuerySchema, bilingualText, localeSchema } from "./common.js";

describe("localeSchema", () => {
  it("accepts en and bn", () => {
    expect(localeSchema.parse("en")).toBe("en");
    expect(localeSchema.parse("bn")).toBe("bn");
  });
  it("rejects anything else", () => {
    expect(() => localeSchema.parse("hi")).toThrow();
  });
});

describe("paginationQuerySchema", () => {
  it("defaults to page 1, perPage 20", () => {
    expect(paginationQuerySchema.parse({})).toEqual({ page: 1, perPage: 20 });
  });
  it("coerces numeric strings from query params", () => {
    expect(paginationQuerySchema.parse({ page: "3", perPage: "50" }))
      .toEqual({ page: 3, perPage: 50 });
  });
  it("caps perPage at 100", () => {
    expect(() => paginationQuerySchema.parse({ perPage: 101 })).toThrow();
  });
});

describe("bilingualText", () => {
  const schema = bilingualText("title");
  it("requires both languages to be non-empty", () => {
    expect(schema.parse({ titleEn: "Living Room", titleBn: "বসার ঘর" }))
      .toEqual({ titleEn: "Living Room", titleBn: "বসার ঘর" });
  });
  it("rejects an empty bangla field", () => {
    expect(() => schema.parse({ titleEn: "Living Room", titleBn: "" })).toThrow();
  });
  it("rejects a missing bangla field", () => {
    expect(() => schema.parse({ titleEn: "Living Room" })).toThrow();
  });
});
```

`packages/types/src/auth.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { loginSchema, roleSchema } from "./auth.js";

describe("loginSchema", () => {
  it("accepts a valid credential pair", () => {
    expect(loginSchema.parse({ email: "a@b.com", password: "hunter22" }))
      .toEqual({ email: "a@b.com", password: "hunter22" });
  });
  it("lowercases and trims the email", () => {
    expect(loginSchema.parse({ email: "  A@B.COM ", password: "hunter22" }).email)
      .toBe("a@b.com");
  });
  it("rejects a malformed email", () => {
    expect(() => loginSchema.parse({ email: "nope", password: "hunter22" })).toThrow();
  });
  it("rejects a password shorter than 8 characters", () => {
    expect(() => loginSchema.parse({ email: "a@b.com", password: "short" })).toThrow();
  });
});

describe("roleSchema", () => {
  it("accepts ADMIN and EDITOR", () => {
    expect(roleSchema.parse("ADMIN")).toBe("ADMIN");
    expect(roleSchema.parse("EDITOR")).toBe("EDITOR");
  });
  it("rejects an unknown role", () => {
    expect(() => roleSchema.parse("SUPERUSER")).toThrow();
  });
});
```

- [ ] **Step 2: Create the package and run the tests to verify they fail**

`packages/types/package.json`:
```json
{
  "name": "@homeinn/types",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": { ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" } },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": { "zod": "^3.24.1" },
  "devDependencies": { "vitest": "^2.1.8", "typescript": "^5.7.2" }
}
```

`packages/types/tsconfig.json`:
```json
{
  "extends": "@homeinn/config/tsconfig.base.json",
  "compilerOptions": { "rootDir": "src", "outDir": "dist" },
  "include": ["src/**/*"],
  "exclude": ["src/**/*.test.ts"]
}
```

Run: `pnpm install && pnpm --filter @homeinn/types test`
Expected: FAIL — cannot resolve `./common.js` / `./auth.js`.

- [ ] **Step 3: Implement the schemas**

`packages/types/src/common.ts`:
```ts
import { z } from "zod";

export const localeSchema = z.enum(["en", "bn"]);
export type Locale = z.infer<typeof localeSchema>;

export const idSchema = z.string().cuid();

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

/** Builds `{ <field>En, <field>Bn }`, both required and non-empty. */
export function bilingualText(field: string, max = 5000) {
  return z.object({
    [`${field}En`]: z.string().trim().min(1).max(max),
    [`${field}Bn`]: z.string().trim().min(1).max(max),
  });
}
```

`packages/types/src/auth.ts`:
```ts
import { z } from "zod";

export const roleSchema = z.enum(["ADMIN", "EDITOR"]);
export type Role = z.infer<typeof roleSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(200),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const authUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: roleSchema,
});
export type AuthUser = z.infer<typeof authUserSchema>;
```

`packages/types/src/index.ts`:
```ts
export * from "./common.js";
export * from "./auth.js";
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @homeinn/types test`
Expected: PASS — 11 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/types pnpm-lock.yaml
git commit -m "feat(types): add locale, pagination, bilingual, and auth schemas"
```

---

## Task 4: Prisma schema and first migration

**Files:**
- Create: `apps/api/package.json`, `apps/api/tsconfig.json`, `apps/api/nest-cli.json`
- Create: `apps/api/prisma/schema.prisma`
- Test: `apps/api/test/schema.spec.ts`

**Interfaces:**
- Consumes: `DATABASE_URL` from Task 2
- Produces: a generated Prisma client at `@prisma/client` with all models from spec §5, and a migration in `apps/api/prisma/migrations/`.

- [ ] **Step 1: Scaffold the API package**

`apps/api/package.json`:
```json
{
  "name": "@homeinn/api",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "build": "nest build",
    "dev": "nest start --watch",
    "start": "node dist/main.js",
    "test": "jest",
    "test:e2e": "jest --config test/jest-e2e.json --runInBand",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:deploy": "prisma migrate deploy",
    "seed": "tsx prisma/seed.ts"
  },
  "prisma": { "seed": "tsx prisma/seed.ts" },
  "dependencies": {
    "@homeinn/types": "workspace:*",
    "@nestjs/common": "^11.0.0",
    "@nestjs/config": "^4.0.0",
    "@nestjs/core": "^11.0.0",
    "@nestjs/jwt": "^11.0.0",
    "@nestjs/platform-express": "^11.0.0",
    "@nestjs/throttler": "^6.3.0",
    "@prisma/client": "^6.2.0",
    "argon2": "^0.41.1",
    "cookie-parser": "^1.4.7",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1",
    "sharp": "^0.33.5",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@homeinn/config": "workspace:*",
    "@nestjs/cli": "^11.0.0",
    "@nestjs/testing": "^11.0.0",
    "@types/cookie-parser": "^1.4.8",
    "@types/express": "^5.0.0",
    "@types/jest": "^29.5.14",
    "@types/node": "^22.10.2",
    "@types/supertest": "^6.0.2",
    "jest": "^29.7.0",
    "prisma": "^6.2.0",
    "supertest": "^7.0.0",
    "ts-jest": "^29.2.5",
    "tsx": "^4.19.2",
    "typescript": "^5.7.2"
  },
  "jest": {
    "moduleFileExtensions": ["js", "json", "ts"],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": { "^.+\\.ts$": "ts-jest" },
    "testEnvironment": "node"
  }
}
```

`apps/api/tsconfig.json`:
```json
{
  "extends": "@homeinn/config/tsconfig.base.json",
  "compilerOptions": {
    "module": "CommonJS",
    "moduleResolution": "Node",
    "rootDir": "./",
    "outDir": "./dist",
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "strictPropertyInitialization": false
  },
  "include": ["src/**/*", "prisma/**/*", "test/**/*"]
}
```

`apps/api/nest-cli.json`:
```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": { "deleteOutDir": true }
}
```

- [ ] **Step 2: Write the schema**

`apps/api/prisma/schema.prisma` — transcribe spec §5 verbatim, plus this header:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Then every model from spec §5 in this order: `Media`, `Seo`, `Service`,
`WorkingArea`, `Project`, `CorporateClient`, `ResidentialClient`,
`Certification`, `HeroSegment`, `BlogPost`, `Testimonial`, `TeamMember`,
`Lead` (+ `LeadType`, `LeadStatus` enums), `SiteSettings`, `AdminUser`
(+ `Role` enum), `RefreshToken`.

Two additions the spec's prose implies but its schema block omits — include them:
- `Media` needs the back-relations for every named relation it participates in
  (`ServiceGallery`, `ProjectGallery`, `HeroBg`, `HeroFg`, and the singular
  `cover` / `avatar` / `photo` / `document` / `ogImage` relations). Prisma will
  refuse to generate without them.
- `RefreshToken` gets `@@index([userId])`.

- [ ] **Step 3: Write the failing schema test**

`apps/api/test/schema.spec.ts`:
```ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

describe("schema", () => {
  afterAll(async () => { await prisma.$disconnect(); });

  it("stores and reads a bilingual working area", async () => {
    const created = await prisma.workingArea.create({
      data: { slug: "gypsum-work", nameEn: "Gypsum Work", nameBn: "জিপসাম ওয়ার্ক", sortOrder: 8 },
    });
    expect(created.nameBn).toBe("জিপসাম ওয়ার্ক");
    await prisma.workingArea.delete({ where: { id: created.id } });
  });

  it("defaults ResidentialClient.publiclyListed to false", async () => {
    const created = await prisma.residentialClient.create({
      data: { serial: 999, clientName: "Test Person", address: "Nowhere" },
    });
    expect(created.publiclyListed).toBe(false);
    await prisma.residentialClient.delete({ where: { id: created.id } });
  });

  it("enforces slug uniqueness on Service", async () => {
    const base = {
      titleEn: "T", titleBn: "ট", summaryEn: "S", summaryBn: "স",
      bodyEn: "B", bodyBn: "ব", icon: "sofa",
    };
    const a = await prisma.service.create({ data: { slug: "dupe-test", ...base } });
    await expect(
      prisma.service.create({ data: { slug: "dupe-test", ...base } }),
    ).rejects.toThrow();
    await prisma.service.delete({ where: { id: a.id } });
  });
});
```

- [ ] **Step 4: Run it to verify it fails**

Run: `cd apps/api && pnpm jest --rootDir . test/schema.spec.ts`
Expected: FAIL — `@prisma/client` did not initialise / table does not exist.

- [ ] **Step 5: Generate the client and migrate**

Run:
```bash
pnpm db:start
cd apps/api
pnpm prisma migrate dev --name init
pnpm prisma generate
```
Expected: migration `init` applied; client generated.

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd apps/api && pnpm jest --rootDir . test/schema.spec.ts`
Expected: PASS — 3 tests.

- [ ] **Step 7: Commit**

```bash
git add apps/api pnpm-lock.yaml
git commit -m "feat(api): add prisma schema and initial migration"
```

---

## Task 5: Nest bootstrap, PrismaService, and Zod validation pipe

**Files:**
- Create: `apps/api/src/main.ts`, `apps/api/src/app.module.ts`
- Create: `apps/api/src/prisma/prisma.service.ts`, `apps/api/src/prisma/prisma.module.ts`
- Create: `apps/api/src/common/zod-validation.pipe.ts`
- Test: `apps/api/src/common/zod-validation.pipe.spec.ts`

**Interfaces:**
- Consumes: `@homeinn/types` schemas
- Produces:
  - `PrismaService extends PrismaClient implements OnModuleInit` — injectable, exported from `PrismaModule` (global)
  - `ZodValidationPipe` — `new ZodValidationPipe(schema)`, throws `BadRequestException` with `{ message: "Validation failed", issues: ZodIssue[] }`
  - `GET /health` → `{ status: "ok" }`

- [ ] **Step 1: Write the failing pipe test**

`apps/api/src/common/zod-validation.pipe.spec.ts`:
```ts
import { BadRequestException } from "@nestjs/common";
import { z } from "zod";
import { ZodValidationPipe } from "./zod-validation.pipe";

const schema = z.object({ name: z.string().min(2) });

describe("ZodValidationPipe", () => {
  it("returns the parsed value when valid", () => {
    const pipe = new ZodValidationPipe(schema);
    expect(pipe.transform({ name: "Ada" })).toEqual({ name: "Ada" });
  });

  it("strips unknown keys", () => {
    const pipe = new ZodValidationPipe(schema);
    expect(pipe.transform({ name: "Ada", admin: true })).toEqual({ name: "Ada" });
  });

  it("throws BadRequestException listing the issues when invalid", () => {
    const pipe = new ZodValidationPipe(schema);
    try {
      pipe.transform({ name: "A" });
      fail("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(BadRequestException);
      const body = (e as BadRequestException).getResponse() as { issues: unknown[] };
      expect(body.issues).toHaveLength(1);
    }
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd apps/api && pnpm test -- zod-validation`
Expected: FAIL — cannot find module `./zod-validation.pipe`.

- [ ] **Step 3: Implement the pipe, PrismaService, and bootstrap**

`apps/api/src/common/zod-validation.pipe.ts`:
```ts
import { BadRequestException, PipeTransform } from "@nestjs/common";
import { ZodSchema } from "zod";

export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        message: "Validation failed",
        issues: result.error.issues,
      });
    }
    return result.data;
  }
}
```

`apps/api/src/prisma/prisma.service.ts`:
```ts
import { Injectable, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }
}
```

`apps/api/src/prisma/prisma.module.ts`:
```ts
import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

@Global()
@Module({ providers: [PrismaService], exports: [PrismaService] })
export class PrismaModule {}
```

`apps/api/src/app.module.ts`:
```ts
import { Controller, Get, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { PrismaModule } from "./prisma/prisma.module";

@Controller("health")
export class HealthController {
  @Get()
  check(): { status: string } {
    return { status: "ok" };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ["../../.env"] }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
```

`apps/api/src/main.ts`:
```ts
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.setGlobalPrefix("api");
  app.enableCors({ origin: process.env.WEB_ORIGIN ?? "http://localhost:3000", credentials: true });
  await app.listen(Number(process.env.PORT ?? 4000));
}
void bootstrap();
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd apps/api && pnpm test -- zod-validation`
Expected: PASS — 3 tests.

- [ ] **Step 5: Verify the server boots**

Run: `cd apps/api && pnpm build && node dist/main.js &` then `curl -s localhost:4000/api/health`
Expected: `{"status":"ok"}`. Kill the process afterwards.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src
git commit -m "feat(api): bootstrap nest app with prisma and zod validation"
```

---

## Task 6: Password hashing and AdminUser lookup

**Files:**
- Create: `apps/api/src/auth/password.service.ts`, `apps/api/src/auth/users.service.ts`
- Test: `apps/api/src/auth/password.service.spec.ts`

**Interfaces:**
- Consumes: `PrismaService`
- Produces:
  - `PasswordService.hash(plain: string): Promise<string>`
  - `PasswordService.verify(hash: string, plain: string): Promise<boolean>`
  - `UsersService.findByEmail(email: string): Promise<AdminUser | null>`
  - `UsersService.findById(id: string): Promise<AdminUser | null>`

- [ ] **Step 1: Write the failing test**

`apps/api/src/auth/password.service.spec.ts`:
```ts
import { PasswordService } from "./password.service";

describe("PasswordService", () => {
  const svc = new PasswordService();

  it("produces an argon2id hash that is not the plaintext", async () => {
    const hash = await svc.hash("correct horse battery");
    expect(hash).toMatch(/^\$argon2id\$/);
    expect(hash).not.toContain("correct horse battery");
  });

  it("verifies a correct password", async () => {
    const hash = await svc.hash("correct horse battery");
    await expect(svc.verify(hash, "correct horse battery")).resolves.toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await svc.hash("correct horse battery");
    await expect(svc.verify(hash, "wrong horse battery")).resolves.toBe(false);
  });

  it("returns false rather than throwing on a malformed hash", async () => {
    await expect(svc.verify("not-a-hash", "anything")).resolves.toBe(false);
  });

  it("produces a different hash for the same input each time", async () => {
    const a = await svc.hash("same input");
    const b = await svc.hash("same input");
    expect(a).not.toBe(b);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd apps/api && pnpm test -- password.service`
Expected: FAIL — cannot find module `./password.service`.

- [ ] **Step 3: Implement**

`apps/api/src/auth/password.service.ts`:
```ts
import { Injectable } from "@nestjs/common";
import * as argon2 from "argon2";

@Injectable()
export class PasswordService {
  hash(plain: string): Promise<string> {
    return argon2.hash(plain, { type: argon2.argon2id });
  }

  async verify(hash: string, plain: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain);
    } catch {
      return false;
    }
  }
}
```

`apps/api/src/auth/users.service.ts`:
```ts
import { Injectable } from "@nestjs/common";
import type { AdminUser } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<AdminUser | null> {
    return this.prisma.adminUser.findUnique({ where: { email: email.toLowerCase() } });
  }

  findById(id: string): Promise<AdminUser | null> {
    return this.prisma.adminUser.findUnique({ where: { id } });
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd apps/api && pnpm test -- password.service`
Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/auth
git commit -m "feat(api): add argon2id password hashing and user lookup"
```

---

## Task 7: Login, token issue, and refresh rotation with reuse detection

**Files:**
- Create: `apps/api/src/auth/token.service.ts`, `apps/api/src/auth/auth.service.ts`
- Create: `apps/api/src/auth/auth.controller.ts`, `apps/api/src/auth/auth.module.ts`
- Test: `apps/api/src/auth/auth.service.spec.ts`

**Interfaces:**
- Consumes: `PasswordService`, `UsersService`, `PrismaService`, `loginSchema` and `AuthUser` from `@homeinn/types`
- Produces:
  - `TokenService.signAccess(user: AuthUser): Promise<string>` — 15 min
  - `TokenService.issueRefresh(userId: string): Promise<string>` — 7 d, sha256 of the token stored in `RefreshToken.tokenHash`
  - `TokenService.rotate(presented: string): Promise<{ userId: string; refresh: string }>` — throws `UnauthorizedException` on unknown, expired, or already-revoked tokens; on a revoked token it also revokes the whole chain for that user
  - `AuthService.login(input: LoginInput)` → `{ user: AuthUser; access: string; refresh: string }`
  - `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`, `GET /api/auth/me`
  - Cookies: `hi_access` and `hi_refresh`, both `httpOnly`, `sameSite: "lax"`, `secure` in production

- [ ] **Step 1: Write the failing tests**

`apps/api/src/auth/auth.service.spec.ts`:
```ts
import { UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PasswordService } from "./password.service";
import { TokenService } from "./token.service";
import { AuthService } from "./auth.service";

type Row = { id: string; userId: string; tokenHash: string; expiresAt: Date; revokedAt: Date | null };

function fakePrisma() {
  const rows: Row[] = [];
  return {
    rows,
    refreshToken: {
      create: async ({ data }: { data: Omit<Row, "id"> }) => {
        const row = { id: `r${rows.length}`, ...data };
        rows.push(row);
        return row;
      },
      findUnique: async ({ where }: { where: { tokenHash: string } }) =>
        rows.find((r) => r.tokenHash === where.tokenHash) ?? null,
      update: async ({ where, data }: { where: { id: string }; data: Partial<Row> }) => {
        const row = rows.find((r) => r.id === where.id)!;
        Object.assign(row, data);
        return row;
      },
      updateMany: async ({ where, data }: { where: { userId: string }; data: Partial<Row> }) => {
        const hit = rows.filter((r) => r.userId === where.userId);
        hit.forEach((r) => Object.assign(r, data));
        return { count: hit.length };
      },
    },
  };
}

const jwt = new JwtService({ secret: "test-secret" });

describe("TokenService", () => {
  it("issues a refresh token and stores only its hash", async () => {
    const prisma = fakePrisma();
    const svc = new TokenService(jwt, prisma as never);
    const token = await svc.issueRefresh("user-1");
    expect(prisma.rows).toHaveLength(1);
    expect(prisma.rows[0]!.tokenHash).not.toBe(token);
  });

  it("rotates a valid refresh token and revokes the old one", async () => {
    const prisma = fakePrisma();
    const svc = new TokenService(jwt, prisma as never);
    const first = await svc.issueRefresh("user-1");
    const { userId, refresh } = await svc.rotate(first);
    expect(userId).toBe("user-1");
    expect(refresh).not.toBe(first);
    expect(prisma.rows[0]!.revokedAt).not.toBeNull();
  });

  it("rejects an unknown refresh token", async () => {
    const prisma = fakePrisma();
    const svc = new TokenService(jwt, prisma as never);
    await expect(svc.rotate("never-issued")).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("revokes the whole chain when a used token is replayed", async () => {
    const prisma = fakePrisma();
    const svc = new TokenService(jwt, prisma as never);
    const first = await svc.issueRefresh("user-1");
    await svc.rotate(first);
    await expect(svc.rotate(first)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.rows.every((r) => r.revokedAt !== null)).toBe(true);
  });

  it("rejects an expired refresh token", async () => {
    const prisma = fakePrisma();
    const svc = new TokenService(jwt, prisma as never);
    const token = await svc.issueRefresh("user-1");
    prisma.rows[0]!.expiresAt = new Date(Date.now() - 1000);
    await expect(svc.rotate(token)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

describe("AuthService.login", () => {
  const passwords = new PasswordService();

  it("returns tokens for correct credentials", async () => {
    const prisma = fakePrisma();
    const hash = await passwords.hash("hunter22");
    const users = {
      findByEmail: async () => ({ id: "u1", email: "a@b.com", name: "A", passwordHash: hash, role: "ADMIN" }),
    };
    const svc = new AuthService(users as never, passwords, new TokenService(jwt, prisma as never));
    const out = await svc.login({ email: "a@b.com", password: "hunter22" });
    expect(out.user).toEqual({ id: "u1", email: "a@b.com", name: "A", role: "ADMIN" });
    expect(out.access).toBeTruthy();
    expect(out.refresh).toBeTruthy();
  });

  it("rejects a wrong password", async () => {
    const prisma = fakePrisma();
    const hash = await passwords.hash("hunter22");
    const users = {
      findByEmail: async () => ({ id: "u1", email: "a@b.com", name: "A", passwordHash: hash, role: "ADMIN" }),
    };
    const svc = new AuthService(users as never, passwords, new TokenService(jwt, prisma as never));
    await expect(svc.login({ email: "a@b.com", password: "wrong-one" }))
      .rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects an unknown email with the same error as a wrong password", async () => {
    const prisma = fakePrisma();
    const users = { findByEmail: async () => null };
    const svc = new AuthService(users as never, passwords, new TokenService(jwt, prisma as never));
    await expect(svc.login({ email: "nobody@b.com", password: "hunter22" }))
      .rejects.toBeInstanceOf(UnauthorizedException);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/api && pnpm test -- auth.service`
Expected: FAIL — cannot find `./token.service`.

- [ ] **Step 3: Implement TokenService and AuthService**

`apps/api/src/auth/token.service.ts`:
```ts
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { createHash, randomBytes } from "node:crypto";
import type { AuthUser } from "@homeinn/types";
import { PrismaService } from "../prisma/prisma.service";

const REFRESH_DAYS = 7;

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  private static digest(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  signAccess(user: AuthUser): Promise<string> {
    return this.jwt.signAsync(
      { sub: user.id, email: user.email, name: user.name, role: user.role },
      { secret: process.env.JWT_ACCESS_SECRET, expiresIn: "15m" },
    );
  }

  async issueRefresh(userId: string): Promise<string> {
    const token = randomBytes(48).toString("base64url");
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: TokenService.digest(token),
        expiresAt: new Date(Date.now() + REFRESH_DAYS * 86_400_000),
      },
    });
    return token;
  }

  async rotate(presented: string): Promise<{ userId: string; refresh: string }> {
    const row = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: TokenService.digest(presented) },
    });
    if (!row) throw new UnauthorizedException("Invalid refresh token");

    // Replay of an already-rotated token: assume theft, kill every session.
    if (row.revokedAt) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: row.userId },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException("Refresh token reuse detected");
    }

    if (row.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException("Refresh token expired");
    }

    const refresh = await this.issueRefresh(row.userId);
    await this.prisma.refreshToken.update({
      where: { id: row.id },
      data: { revokedAt: new Date(), replacedBy: TokenService.digest(refresh) },
    });
    return { userId: row.userId, refresh };
  }

  async revokeAll(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
```

`apps/api/src/auth/auth.service.ts`:
```ts
import { Injectable, UnauthorizedException } from "@nestjs/common";
import type { AuthUser, LoginInput } from "@homeinn/types";
import { PasswordService } from "./password.service";
import { TokenService } from "./token.service";
import { UsersService } from "./users.service";

export interface LoginResult {
  user: AuthUser;
  access: string;
  refresh: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
  ) {}

  async login(input: LoginInput): Promise<LoginResult> {
    const record = await this.users.findByEmail(input.email);
    // Same error for unknown email and bad password — no account enumeration.
    if (!record) throw new UnauthorizedException("Invalid credentials");

    const ok = await this.passwords.verify(record.passwordHash, input.password);
    if (!ok) throw new UnauthorizedException("Invalid credentials");

    const user: AuthUser = {
      id: record.id, email: record.email, name: record.name, role: record.role,
    };
    return {
      user,
      access: await this.tokens.signAccess(user),
      refresh: await this.tokens.issueRefresh(user.id),
    };
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd apps/api && pnpm test -- auth.service`
Expected: PASS — 8 tests.

- [ ] **Step 5: Add the controller and module**

`apps/api/src/auth/auth.controller.ts`:
```ts
import { Body, Controller, Get, HttpCode, Post, Req, Res, UnauthorizedException, UsePipes } from "@nestjs/common";
import type { Request, Response } from "express";
import { loginSchema, type LoginInput } from "@homeinn/types";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { AuthService } from "./auth.service";
import { TokenService } from "./token.service";
import { UsersService } from "./users.service";

const ACCESS_COOKIE = "hi_access";
const REFRESH_COOKIE = "hi_refresh";

function cookieOptions(maxAgeMs: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeMs,
  };
}

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly tokens: TokenService,
    private readonly users: UsersService,
  ) {}

  @Post("login")
  @HttpCode(200)
  @UsePipes(new ZodValidationPipe(loginSchema))
  async login(@Body() body: LoginInput, @Res({ passthrough: true }) res: Response) {
    const { user, access, refresh } = await this.auth.login(body);
    res.cookie(ACCESS_COOKIE, access, cookieOptions(15 * 60_000));
    res.cookie(REFRESH_COOKIE, refresh, cookieOptions(7 * 86_400_000));
    return { user };
  }

  @Post("refresh")
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const presented = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (!presented) throw new UnauthorizedException("No refresh token");

    const { userId, refresh } = await this.tokens.rotate(presented);
    const record = await this.users.findById(userId);
    if (!record) throw new UnauthorizedException("Unknown user");

    const access = await this.tokens.signAccess({
      id: record.id, email: record.email, name: record.name, role: record.role,
    });
    res.cookie(ACCESS_COOKIE, access, cookieOptions(15 * 60_000));
    res.cookie(REFRESH_COOKIE, refresh, cookieOptions(7 * 86_400_000));
    return { ok: true };
  }

  @Post("logout")
  @HttpCode(200)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const presented = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (presented) {
      const row = await this.tokens.rotate(presented).catch(() => null);
      if (row) await this.tokens.revokeAll(row.userId);
    }
    res.clearCookie(ACCESS_COOKIE, { path: "/" });
    res.clearCookie(REFRESH_COOKIE, { path: "/" });
    return { ok: true };
  }
}
```

`apps/api/src/auth/auth.module.ts`:
```ts
import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { PasswordService } from "./password.service";
import { TokenService } from "./token.service";
import { UsersService } from "./users.service";

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, PasswordService, TokenService, UsersService],
  exports: [TokenService, UsersService, PasswordService],
})
export class AuthModule {}
```

Register `AuthModule` in `app.module.ts`'s `imports`.

- [ ] **Step 6: Run the full API test suite**

Run: `cd apps/api && pnpm test`
Expected: PASS — all suites green.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src
git commit -m "feat(api): add login, refresh rotation, and reuse detection"
```

---

## Task 8: Auth guard and role guard

**Files:**
- Create: `apps/api/src/auth/jwt.guard.ts`, `apps/api/src/auth/roles.guard.ts`, `apps/api/src/auth/roles.decorator.ts`, `apps/api/src/auth/current-user.decorator.ts`
- Modify: `apps/api/src/auth/auth.controller.ts` — add `GET /api/auth/me`
- Test: `apps/api/src/auth/roles.guard.spec.ts`

**Interfaces:**
- Consumes: `TokenService`, `AuthUser`
- Produces:
  - `@UseGuards(JwtGuard)` — reads `hi_access` cookie or `Authorization: Bearer`, attaches `req.user: AuthUser`, throws `UnauthorizedException` otherwise
  - `@Roles("ADMIN")` + `@UseGuards(JwtGuard, RolesGuard)` — throws `ForbiddenException` when the role does not match
  - `@CurrentUser() user: AuthUser` param decorator

- [ ] **Step 1: Write the failing test**

`apps/api/src/auth/roles.guard.spec.ts`:
```ts
import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RolesGuard } from "./roles.guard";

function ctx(user: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe("RolesGuard", () => {
  it("allows the request when no roles are required", () => {
    const reflector = { getAllAndOverride: () => undefined } as unknown as Reflector;
    expect(new RolesGuard(reflector).canActivate(ctx({ role: "EDITOR" }))).toBe(true);
  });

  it("allows a matching role", () => {
    const reflector = { getAllAndOverride: () => ["ADMIN"] } as unknown as Reflector;
    expect(new RolesGuard(reflector).canActivate(ctx({ role: "ADMIN" }))).toBe(true);
  });

  it("forbids a non-matching role", () => {
    const reflector = { getAllAndOverride: () => ["ADMIN"] } as unknown as Reflector;
    expect(() => new RolesGuard(reflector).canActivate(ctx({ role: "EDITOR" })))
      .toThrow(ForbiddenException);
  });

  it("forbids when there is no user on the request", () => {
    const reflector = { getAllAndOverride: () => ["ADMIN"] } as unknown as Reflector;
    expect(() => new RolesGuard(reflector).canActivate(ctx(undefined)))
      .toThrow(ForbiddenException);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/api && pnpm test -- roles.guard`
Expected: FAIL — cannot find `./roles.guard`.

- [ ] **Step 3: Implement the guards and decorators**

`apps/api/src/auth/roles.decorator.ts`:
```ts
import { SetMetadata } from "@nestjs/common";
import type { Role } from "@homeinn/types";

export const ROLES_KEY = "roles";
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
```

`apps/api/src/auth/roles.guard.ts`:
```ts
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { AuthUser, Role } from "@homeinn/types";
import { ROLES_KEY } from "./roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const user = context.switchToHttp().getRequest<{ user?: AuthUser }>().user;
    if (!user || !required.includes(user.role)) {
      throw new ForbiddenException("Insufficient role");
    }
    return true;
  }
}
```

`apps/api/src/auth/jwt.guard.ts`:
```ts
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import { authUserSchema, type AuthUser } from "@homeinn/types";

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const bearer = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : undefined;
    const token = (req.cookies?.["hi_access"] as string | undefined) ?? bearer;
    if (!token) throw new UnauthorizedException("Not authenticated");

    try {
      const claims = await this.jwt.verifyAsync<{ sub: string; email: string; name: string; role: string }>(
        token, { secret: process.env.JWT_ACCESS_SECRET },
      );
      req.user = authUserSchema.parse({
        id: claims.sub, email: claims.email, name: claims.name, role: claims.role,
      });
      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }
  }
}
```

`apps/api/src/auth/current-user.decorator.ts`:
```ts
import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { AuthUser } from "@homeinn/types";

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser =>
    ctx.switchToHttp().getRequest<{ user: AuthUser }>().user,
);
```

Add to `auth.controller.ts`:
```ts
  @Get("me")
  @UseGuards(JwtGuard)
  me(@CurrentUser() user: AuthUser) {
    return { user };
  }
```
with the matching imports, and add `JwtGuard`, `RolesGuard` to `AuthModule`'s
`providers` and `exports`.

- [ ] **Step 4: Run to verify it passes**

Run: `cd apps/api && pnpm test -- roles.guard`
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/auth
git commit -m "feat(api): add jwt and role guards"
```

---

## Task 9: Auth end-to-end against the real database

**Files:**
- Create: `apps/api/test/jest-e2e.json`, `apps/api/test/setup-db.ts`
- Test: `apps/api/test/auth.e2e-spec.ts`

**Interfaces:**
- Consumes: everything from Tasks 4–8
- Produces: `resetDb(prisma: PrismaClient): Promise<void>` — truncates every table; `makeApp(): Promise<INestApplication>` — boots the Nest app with cookie-parser for tests

- [ ] **Step 1: Write the harness and the failing e2e test**

`apps/api/test/jest-e2e.json`:
```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": { "^.+\\.ts$": "ts-jest" },
  "moduleNameMapper": { "^@homeinn/types$": "<rootDir>/../../../packages/types/src/index.ts" }
}
```

`apps/api/test/setup-db.ts`:
```ts
import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PrismaClient } from "@prisma/client";
import cookieParser from "cookie-parser";
import { AppModule } from "../src/app.module";

export async function resetDb(prisma: PrismaClient): Promise<void> {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename NOT LIKE '_prisma%'`;
  if (tables.length === 0) return;
  const list = tables.map((t) => `"public"."${t.tablename}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

export async function makeApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  app.use(cookieParser());
  app.setGlobalPrefix("api");
  await app.init();
  return app;
}
```

`apps/api/test/auth.e2e-spec.ts`:
```ts
import { INestApplication } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import * as argon2 from "argon2";
import { makeApp, resetDb } from "./setup-db";

const prisma = new PrismaClient();
let app: INestApplication;

beforeAll(async () => {
  app = await makeApp();
});
afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

beforeEach(async () => {
  await resetDb(prisma);
  await prisma.adminUser.create({
    data: {
      email: "admin@homeinn.test",
      name: "Admin",
      role: "ADMIN",
      passwordHash: await argon2.hash("hunter22ok", { type: argon2.argon2id }),
    },
  });
});

const server = () => app.getHttpServer();

describe("auth", () => {
  it("logs in and sets both cookies", async () => {
    const res = await request(server())
      .post("/api/auth/login")
      .send({ email: "admin@homeinn.test", password: "hunter22ok" })
      .expect(200);

    expect(res.body.user.email).toBe("admin@homeinn.test");
    expect(res.body.user).not.toHaveProperty("passwordHash");

    const cookies = res.headers["set-cookie"] as unknown as string[];
    expect(cookies.some((c) => c.startsWith("hi_access=") && c.includes("HttpOnly"))).toBe(true);
    expect(cookies.some((c) => c.startsWith("hi_refresh=") && c.includes("HttpOnly"))).toBe(true);
  });

  it("rejects a bad password with 401", async () => {
    await request(server())
      .post("/api/auth/login")
      .send({ email: "admin@homeinn.test", password: "wrongpassword" })
      .expect(401);
  });

  it("rejects a malformed body with 400", async () => {
    await request(server())
      .post("/api/auth/login")
      .send({ email: "not-an-email", password: "x" })
      .expect(400);
  });

  it("returns the current user from /me with the access cookie", async () => {
    const login = await request(server())
      .post("/api/auth/login")
      .send({ email: "admin@homeinn.test", password: "hunter22ok" });
    const cookies = login.headers["set-cookie"] as unknown as string[];

    const me = await request(server()).get("/api/auth/me").set("Cookie", cookies).expect(200);
    expect(me.body.user.role).toBe("ADMIN");
  });

  it("rejects /me without a cookie", async () => {
    await request(server()).get("/api/auth/me").expect(401);
  });

  it("rotates the refresh cookie", async () => {
    const login = await request(server())
      .post("/api/auth/login")
      .send({ email: "admin@homeinn.test", password: "hunter22ok" });
    const cookies = login.headers["set-cookie"] as unknown as string[];
    const before = cookies.find((c) => c.startsWith("hi_refresh="))!;

    const refreshed = await request(server())
      .post("/api/auth/refresh").set("Cookie", cookies).expect(200);
    const after = (refreshed.headers["set-cookie"] as unknown as string[])
      .find((c) => c.startsWith("hi_refresh="))!;

    expect(after).not.toBe(before);
  });

  it("rejects a replayed refresh token with 401", async () => {
    const login = await request(server())
      .post("/api/auth/login")
      .send({ email: "admin@homeinn.test", password: "hunter22ok" });
    const cookies = login.headers["set-cookie"] as unknown as string[];

    await request(server()).post("/api/auth/refresh").set("Cookie", cookies).expect(200);
    await request(server()).post("/api/auth/refresh").set("Cookie", cookies).expect(401);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run:
```bash
pnpm db:start
cd apps/api
DATABASE_URL="$TEST_DATABASE_URL" pnpm prisma migrate deploy
DATABASE_URL="$TEST_DATABASE_URL" pnpm test:e2e
```
Expected: FAIL — the harness or route is missing.

- [ ] **Step 3: Fix whatever the run surfaces**

Typical causes: `AuthModule` not registered in `app.module.ts`; `cookie-parser`
default-import interop; `moduleNameMapper` path wrong. Fix until green — no new
behaviour, only wiring.

- [ ] **Step 4: Run to verify it passes**

Run: `cd apps/api && DATABASE_URL="$TEST_DATABASE_URL" pnpm test:e2e`
Expected: PASS — 7 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/api/test
git commit -m "test(api): add auth end-to-end coverage"
```

---

## Task 10: Media storage and upload

**Files:**
- Create: `apps/api/src/media/storage/storage.interface.ts`, `apps/api/src/media/storage/local-disk.storage.ts`
- Create: `apps/api/src/media/media.service.ts`, `apps/api/src/media/media.controller.ts`, `apps/api/src/media/media.module.ts`
- Create: `packages/types/src/media.ts`
- Test: `apps/api/src/media/media.service.spec.ts`

**Interfaces:**
- Consumes: `PrismaService`, `JwtGuard`, `RolesGuard`
- Produces:
  - `StorageService` (abstract class, DI token): `put(key: string, data: Buffer, mime: string): Promise<void>`, `delete(key: string): Promise<void>`, `publicUrl(key: string): string`
  - `LocalDiskStorage implements StorageService` — writes under `UPLOAD_DIR`
  - `MediaService.ingest(file: {buffer, mimetype, originalname}, alt: {altEn, altBn}): Promise<Media>` — rejects non-images, generates AVIF + WebP at 480/960/1440/1920, computes width/height/bytes, persists a `Media` row
  - `uploadMediaSchema` in `@homeinn/types` — `{ altEn: string; altBn: string }`, both non-empty
  - `POST /api/media` (ADMIN, EDITOR), `GET /api/media`, `DELETE /api/media/:id` (ADMIN)

- [ ] **Step 1: Write the failing test**

`apps/api/src/media/media.service.spec.ts`:
```ts
import { BadRequestException } from "@nestjs/common";
import sharp from "sharp";
import { MediaService } from "./media.service";
import type { StorageService } from "./storage/storage.interface";

function fakeStorage(): StorageService & { keys: string[] } {
  const keys: string[] = [];
  return {
    keys,
    put: async (key) => { keys.push(key); },
    delete: async (key) => { keys.splice(keys.indexOf(key), 1); },
    publicUrl: (key) => `http://cdn.test/${key}`,
  };
}

function fakePrisma() {
  return { media: { create: async ({ data }: { data: unknown }) => ({ id: "m1", ...(data as object) }) } };
}

async function png(width: number, height: number): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: "#888" } }).png().toBuffer();
}

describe("MediaService.ingest", () => {
  const alt = { altEn: "A living room", altBn: "একটি বসার ঘর" };

  it("rejects a non-image mime type", async () => {
    const svc = new MediaService(fakePrisma() as never, fakeStorage());
    await expect(
      svc.ingest({ buffer: Buffer.from("hi"), mimetype: "application/pdf", originalname: "a.pdf" }, alt),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects empty alt text", async () => {
    const svc = new MediaService(fakePrisma() as never, fakeStorage());
    await expect(
      svc.ingest({ buffer: await png(100, 100), mimetype: "image/png", originalname: "a.png" },
        { altEn: "", altBn: "কিছু" }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("records the source dimensions", async () => {
    const svc = new MediaService(fakePrisma() as never, fakeStorage());
    const row = await svc.ingest(
      { buffer: await png(1200, 800), mimetype: "image/png", originalname: "a.png" }, alt);
    expect(row.width).toBe(1200);
    expect(row.height).toBe(800);
  });

  it("writes one derivative per size per format, skipping upscales", async () => {
    const storage = fakeStorage();
    const svc = new MediaService(fakePrisma() as never, storage);
    // 1000px source → only the 480 and 960 widths apply, in avif and webp.
    await svc.ingest({ buffer: await png(1000, 700), mimetype: "image/png", originalname: "a.png" }, alt);
    expect(storage.keys.filter((k) => k.endsWith(".avif"))).toHaveLength(2);
    expect(storage.keys.filter((k) => k.endsWith(".webp"))).toHaveLength(2);
  });

  it("persists both alt languages", async () => {
    const svc = new MediaService(fakePrisma() as never, fakeStorage());
    const row = await svc.ingest(
      { buffer: await png(600, 400), mimetype: "image/png", originalname: "a.png" }, alt);
    expect(row.altEn).toBe("A living room");
    expect(row.altBn).toBe("একটি বসার ঘর");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/api && pnpm test -- media.service`
Expected: FAIL — cannot find `./media.service`.

- [ ] **Step 3: Implement storage and the service**

`apps/api/src/media/storage/storage.interface.ts`:
```ts
export abstract class StorageService {
  abstract put(key: string, data: Buffer, mime: string): Promise<void>;
  abstract delete(key: string): Promise<void>;
  abstract publicUrl(key: string): string;
}
```

`apps/api/src/media/storage/local-disk.storage.ts`:
```ts
import { Injectable } from "@nestjs/common";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { StorageService } from "./storage.interface";

@Injectable()
export class LocalDiskStorage extends StorageService {
  private readonly root = process.env.UPLOAD_DIR ?? "./uploads";
  private readonly base = process.env.PUBLIC_MEDIA_BASE_URL ?? "http://localhost:4000/media";

  async put(key: string, data: Buffer): Promise<void> {
    const path = join(this.root, key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, data);
  }

  async delete(key: string): Promise<void> {
    await rm(join(this.root, key), { force: true });
  }

  publicUrl(key: string): string {
    return `${this.base}/${key}`;
  }
}
```

`apps/api/src/media/media.service.ts`:
```ts
import { BadRequestException, Injectable } from "@nestjs/common";
import type { Media } from "@prisma/client";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "./storage/storage.interface";

const WIDTHS = [480, 960, 1440, 1920] as const;
const FORMATS = ["avif", "webp"] as const;

export interface IncomingFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
}

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async ingest(file: IncomingFile, alt: { altEn: string; altBn: string }): Promise<Media> {
    if (!file.mimetype.startsWith("image/")) {
      throw new BadRequestException("Only image uploads are accepted");
    }
    if (!alt.altEn.trim() || !alt.altBn.trim()) {
      throw new BadRequestException("Alt text is required in both English and Bangla");
    }

    const image = sharp(file.buffer);
    const meta = await image.metadata();
    if (!meta.width || !meta.height) {
      throw new BadRequestException("Could not read image dimensions");
    }

    const key = randomUUID();
    // Never upscale — a 1000px source gets 480 and 960 only.
    const widths = WIDTHS.filter((w) => w <= meta.width!);
    if (widths.length === 0) widths.push(meta.width as never);

    for (const width of widths) {
      for (const format of FORMATS) {
        const buf = await sharp(file.buffer).resize({ width })[format]({ quality: 72 }).toBuffer();
        await this.storage.put(`${key}/${width}.${format}`, buf, `image/${format}`);
      }
    }

    return this.prisma.media.create({
      data: {
        storageKey: key,
        mimeType: file.mimetype,
        width: meta.width,
        height: meta.height,
        bytes: file.buffer.byteLength,
        altEn: alt.altEn.trim(),
        altBn: alt.altBn.trim(),
      },
    });
  }
}
```

`packages/types/src/media.ts`:
```ts
import { z } from "zod";

export const uploadMediaSchema = z.object({
  altEn: z.string().trim().min(1).max(300),
  altBn: z.string().trim().min(1).max(300),
});
export type UploadMediaInput = z.infer<typeof uploadMediaSchema>;
```
Export it from `packages/types/src/index.ts`.

- [ ] **Step 4: Run to verify it passes**

Run: `cd apps/api && pnpm test -- media.service`
Expected: PASS — 5 tests.

- [ ] **Step 5: Add the controller and module**

`apps/api/src/media/media.module.ts` binds `StorageService` to `LocalDiskStorage`:
```ts
import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { MediaController } from "./media.controller";
import { MediaService } from "./media.service";
import { LocalDiskStorage } from "./storage/local-disk.storage";
import { StorageService } from "./storage/storage.interface";

@Module({
  imports: [JwtModule.register({})],
  controllers: [MediaController],
  providers: [MediaService, { provide: StorageService, useClass: LocalDiskStorage }],
  exports: [MediaService],
})
export class MediaModule {}
```

`apps/api/src/media/media.controller.ts` — `POST /api/media` with
`FileInterceptor("file")`, guarded by `JwtGuard`, body validated with
`uploadMediaSchema`; `GET /api/media` paginated; `DELETE /api/media/:id` with
`@Roles("ADMIN")`. Register `MediaModule` in `app.module.ts`.

Serve uploads statically in `main.ts`:
```ts
app.useStaticAssets(join(process.cwd(), process.env.UPLOAD_DIR ?? "./uploads"), { prefix: "/media/" });
```
(change `NestFactory.create` to `NestFactory.create<NestExpressApplication>`).

- [ ] **Step 6: Run the full suite**

Run: `cd apps/api && pnpm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/media packages/types/src/media.ts packages/types/src/index.ts apps/api/src/main.ts
git commit -m "feat(api): add media ingest with responsive derivatives"
```

---

## Task 11: Leads

**Files:**
- Create: `packages/types/src/lead.ts`
- Create: `apps/api/src/leads/leads.service.ts`, `leads.controller.ts`, `leads.module.ts`
- Test: `apps/api/src/leads/leads.service.spec.ts`, `apps/api/test/leads.e2e-spec.ts`

**Interfaces:**
- Consumes: `PrismaService`, `JwtGuard`, `RolesGuard`, `paginationQuerySchema`
- Produces:
  - `createLeadSchema` — `{ type, name, phone, email?, message?, serviceId?, sourcePath?, locale }`; phone validated against Bangladesh mobile format
  - `updateLeadSchema` — `{ status?, internalNotes? }`
  - `LeadsService.create(input)`, `.list(query)`, `.update(id, input)`
  - `POST /api/leads` (public, throttled 5/hour/IP), `GET /api/leads` (auth), `PATCH /api/leads/:id` (auth)

- [ ] **Step 1: Write the failing schema test**

`packages/types/src/lead.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { createLeadSchema } from "./lead.js";

const base = { type: "CONTACT" as const, name: "Rahim", phone: "01760775454", locale: "bn" as const };

describe("createLeadSchema", () => {
  it("accepts a local-format Bangladeshi mobile number", () => {
    expect(createLeadSchema.parse(base).phone).toBe("01760775454");
  });

  it("normalises +880 and 880 prefixes to the local 01… form", () => {
    expect(createLeadSchema.parse({ ...base, phone: "+8801760775454" }).phone).toBe("01760775454");
    expect(createLeadSchema.parse({ ...base, phone: "8801760775454" }).phone).toBe("01760775454");
  });

  it("strips spaces and dashes before validating", () => {
    expect(createLeadSchema.parse({ ...base, phone: "01760-775 454" }).phone).toBe("01760775454");
  });

  it("rejects a number that is not a Bangladeshi mobile", () => {
    expect(() => createLeadSchema.parse({ ...base, phone: "12345" })).toThrow();
    expect(() => createLeadSchema.parse({ ...base, phone: "01160775454" })).toThrow();
  });

  it("requires a name", () => {
    expect(() => createLeadSchema.parse({ ...base, name: "" })).toThrow();
  });

  it("allows an omitted email but rejects a malformed one", () => {
    expect(createLeadSchema.parse(base).email).toBeUndefined();
    expect(() => createLeadSchema.parse({ ...base, email: "nope" })).toThrow();
  });

  it("rejects an unknown lead type", () => {
    expect(() => createLeadSchema.parse({ ...base, type: "SPAM" })).toThrow();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @homeinn/types test`
Expected: FAIL — cannot resolve `./lead.js`.

- [ ] **Step 3: Implement the schema**

`packages/types/src/lead.ts`:
```ts
import { z } from "zod";
import { localeSchema } from "./common.js";

export const leadTypeSchema = z.enum(["CONTACT", "CONSULTATION", "QUOTE"]);
export const leadStatusSchema = z.enum(["NEW", "CONTACTED", "QUALIFIED", "WON", "LOST"]);

/** Bangladeshi mobile: 11 digits, 01[3-9] prefix. Accepts +880/880 and separators. */
const bdPhone = z
  .string()
  .transform((raw) => raw.replace(/[\s-()]/g, "").replace(/^\+?880/, "0"))
  .refine((v) => /^01[3-9]\d{8}$/.test(v), {
    message: "Must be a valid Bangladeshi mobile number",
  });

export const createLeadSchema = z.object({
  type: leadTypeSchema,
  name: z.string().trim().min(1).max(120),
  phone: bdPhone,
  email: z.string().trim().toLowerCase().email().optional(),
  message: z.string().trim().max(4000).optional(),
  serviceId: z.string().cuid().optional(),
  sourcePath: z.string().max(300).optional(),
  locale: localeSchema,
});
export type CreateLeadInput = z.infer<typeof createLeadSchema>;

export const updateLeadSchema = z.object({
  status: leadStatusSchema.optional(),
  internalNotes: z.string().max(4000).optional(),
});
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
```
Export from `packages/types/src/index.ts`.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @homeinn/types test`
Expected: PASS — 7 new tests.

- [ ] **Step 5: Implement the service, controller, and module**

`apps/api/src/leads/leads.service.ts`:
```ts
import { Injectable } from "@nestjs/common";
import type { Lead } from "@prisma/client";
import type { CreateLeadInput, PaginationQuery, UpdateLeadInput } from "@homeinn/types";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  create(input: CreateLeadInput): Promise<Lead> {
    return this.prisma.lead.create({ data: input });
  }

  async list(query: PaginationQuery): Promise<{ items: Lead[]; total: number }> {
    const [items, total] = await Promise.all([
      this.prisma.lead.findMany({
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.perPage,
        take: query.perPage,
      }),
      this.prisma.lead.count(),
    ]);
    return { items, total };
  }

  update(id: string, input: UpdateLeadInput): Promise<Lead> {
    return this.prisma.lead.update({ where: { id }, data: input });
  }
}
```

`apps/api/src/leads/leads.controller.ts` — `POST /api/leads` public with
`@Throttle({ default: { ttl: 3_600_000, limit: 5 } })`; `GET /api/leads` and
`PATCH /api/leads/:id` behind `@UseGuards(JwtGuard)`. Validate bodies with
`ZodValidationPipe`. Register `LeadsModule` in `app.module.ts`.

- [ ] **Step 6: Write and run the e2e test**

`apps/api/test/leads.e2e-spec.ts` — mirroring the auth e2e structure, assert:
public POST succeeds and returns 201; POST with a bad phone returns 400;
unauthenticated GET returns 401; authenticated GET returns the created lead;
a sixth POST from the same IP within the hour returns 429.

Run: `cd apps/api && DATABASE_URL="$TEST_DATABASE_URL" pnpm test:e2e`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/types apps/api/src/leads apps/api/test/leads.e2e-spec.ts
git commit -m "feat(api): add lead capture with bd phone validation and throttling"
```

---

## Task 12: Content resources — Services, WorkingAreas, Projects

**Files:**
- Create: `packages/types/src/content.ts`
- Create: `apps/api/src/common/slug.ts`
- Create: `apps/api/src/content/services.{service,controller}.ts`
- Create: `apps/api/src/content/working-areas.{service,controller}.ts`
- Create: `apps/api/src/content/projects.{service,controller}.ts`
- Create: `apps/api/src/content/content.module.ts`
- Test: `apps/api/src/common/slug.spec.ts`, `apps/api/src/content/services.service.spec.ts`

**Interfaces:**
- Consumes: `PrismaService`, guards, `bilingualText`
- Produces:
  - `slugify(input: string): string` — lowercase, ASCII, hyphenated, no leading/trailing hyphens
  - `uniqueSlug(base: string, exists: (s: string) => Promise<boolean>): Promise<string>` — appends `-2`, `-3`, … until free
  - `createServiceSchema`, `updateServiceSchema`, `createProjectSchema`, `updateProjectSchema`, `createWorkingAreaSchema`
  - `GET /api/services` (public, published only), `GET /api/services/:slug`, `POST|PATCH|DELETE /api/services` (auth)
  - Same shape for `/api/projects` and `/api/working-areas`
  - Public list endpoints **never** return `published: false` rows

- [ ] **Step 1: Write the failing slug test**

`apps/api/src/common/slug.spec.ts`:
```ts
import { slugify, uniqueSlug } from "./slug";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Home Furniture Supply")).toBe("home-furniture-supply");
  });
  it("strips punctuation", () => {
    expect(slugify("2D Plan & Solution")).toBe("2d-plan-solution");
  });
  it("collapses repeated separators", () => {
    expect(slugify("Resort,  Eco-Resort  &  Hotel")).toBe("resort-eco-resort-hotel");
  });
  it("trims leading and trailing hyphens", () => {
    expect(slugify("  --Gypsum Work--  ")).toBe("gypsum-work");
  });
  it("returns a fallback for input with no ascii word characters", () => {
    expect(slugify("বসার ঘর")).toBe("item");
  });
});

describe("uniqueSlug", () => {
  it("returns the base when it is free", async () => {
    expect(await uniqueSlug("living-room", async () => false)).toBe("living-room");
  });
  it("appends a counter until free", async () => {
    const taken = new Set(["living-room", "living-room-2"]);
    expect(await uniqueSlug("living-room", async (s) => taken.has(s))).toBe("living-room-3");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/api && pnpm test -- slug`
Expected: FAIL — cannot find `./slug`.

- [ ] **Step 3: Implement**

`apps/api/src/common/slug.ts`:
```ts
export function slugify(input: string): string {
  const slug = input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  // Bangla-only titles produce an empty slug; callers must still get a usable key.
  return slug || "item";
}

export async function uniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>,
): Promise<string> {
  const root = slugify(base);
  if (!(await exists(root))) return root;
  for (let n = 2; ; n++) {
    const candidate = `${root}-${n}`;
    if (!(await exists(candidate))) return candidate;
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd apps/api && pnpm test -- slug`
Expected: PASS — 7 tests.

- [ ] **Step 5: Write the failing published-filter test**

`apps/api/src/content/services.service.spec.ts`:
```ts
import { ServicesService } from "./services.service";

function fakePrisma(rows: { slug: string; published: boolean }[]) {
  return {
    service: {
      findMany: async ({ where }: { where?: { published?: boolean } }) =>
        rows.filter((r) => (where?.published === undefined ? true : r.published === where.published)),
      findFirst: async ({ where }: { where: { slug: string; published?: boolean } }) =>
        rows.find((r) => r.slug === where.slug &&
          (where.published === undefined || r.published === where.published)) ?? null,
    },
  };
}

const rows = [
  { slug: "interior-design", published: true },
  { slug: "draft-thing", published: false },
];

describe("ServicesService", () => {
  it("listPublic returns only published rows", async () => {
    const svc = new ServicesService(fakePrisma(rows) as never);
    const out = await svc.listPublic();
    expect(out.map((r) => r.slug)).toEqual(["interior-design"]);
  });

  it("listAll returns drafts too", async () => {
    const svc = new ServicesService(fakePrisma(rows) as never);
    expect(await svc.listAll()).toHaveLength(2);
  });

  it("findPublicBySlug returns null for a draft", async () => {
    const svc = new ServicesService(fakePrisma(rows) as never);
    expect(await svc.findPublicBySlug("draft-thing")).toBeNull();
  });
});
```

- [ ] **Step 6: Run to verify it fails, then implement**

Run: `cd apps/api && pnpm test -- services.service` → FAIL.

`apps/api/src/content/services.service.ts`:
```ts
import { Injectable } from "@nestjs/common";
import type { Service } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

const PUBLIC_ORDER = { sortOrder: "asc" } as const;

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  listPublic(): Promise<Service[]> {
    return this.prisma.service.findMany({ where: { published: true }, orderBy: PUBLIC_ORDER });
  }

  listAll(): Promise<Service[]> {
    return this.prisma.service.findMany({ orderBy: PUBLIC_ORDER });
  }

  findPublicBySlug(slug: string): Promise<Service | null> {
    return this.prisma.service.findFirst({ where: { slug, published: true } });
  }
}
```

Add `create`, `update`, `remove` using `uniqueSlug` for slug generation.
Build `working-areas` and `projects` to the same pattern — `listPublic` filters
`published: true`, projects additionally support `?workingArea=<slug>`.

Write `packages/types/src/content.ts` with `createServiceSchema` etc., each built
from `bilingualText("title")`, `bilingualText("summary")`, `bilingualText("body")`
merged with the non-text fields.

- [ ] **Step 7: Run to verify it passes**

Run: `cd apps/api && pnpm test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/types/src/content.ts apps/api/src/common/slug.ts apps/api/src/content
git commit -m "feat(api): add services, working areas, and projects resources"
```

---

## Task 13: Clients, hero segments, blog, testimonials, team, certifications, settings

**Files:**
- Create: `apps/api/src/content/clients.{service,controller}.ts`
- Create: `apps/api/src/content/hero.{service,controller}.ts`
- Create: `apps/api/src/content/blog.{service,controller}.ts`
- Create: `apps/api/src/content/testimonials.{service,controller}.ts`
- Create: `apps/api/src/content/team.{service,controller}.ts`
- Create: `apps/api/src/content/certifications.{service,controller}.ts`
- Create: `apps/api/src/settings/settings.{service,controller,module}.ts`
- Test: `apps/api/src/content/clients.service.spec.ts`, `apps/api/src/content/hero.service.spec.ts`

**Interfaces:**
- Consumes: `PrismaService`, guards
- Produces:
  - `ClientsService.listCorporatePublic()` → all corporate rows, ordered by `serial`
  - `ClientsService.residentialSummary()` → `{ total: number; districts: string[] }` — **never names**
  - `ClientsService.listResidentialPublic()` → only rows with `publiclyListed: true`
  - `HeroService.listActive(target: "desktop" | "mobile")` → active segments, `showOnMobile`-filtered for mobile, ordered by `sortOrder`
  - `SettingsService.get()` / `.update(input)` — singleton row keyed `"singleton"`
  - Public endpoints for all of the above; write endpoints behind `JwtGuard`

- [ ] **Step 1: Write the failing privacy test**

This is the single most important test in the plan. Spec §11 forbids leaking
residential client names.

`apps/api/src/content/clients.service.spec.ts`:
```ts
import { ClientsService } from "./clients.service";

const residential = [
  { id: "1", serial: 1, clientName: "Dr. Brig. Masud Ahmed", address: "Jolshiri Project, Purbachol, Dhaka", publiclyListed: false, needsVerification: false },
  { id: "2", serial: 2, clientName: "Md. Zahirul Alam", address: "Zinda Bazar, Sylhet", publiclyListed: false, needsVerification: false },
  { id: "3", serial: 3, clientName: "Consenting Client", address: "Mirpur, Dhaka", publiclyListed: true, needsVerification: false },
];

function fakePrisma() {
  return {
    residentialClient: {
      findMany: async ({ where }: { where?: { publiclyListed?: boolean } }) =>
        residential.filter((r) =>
          where?.publiclyListed === undefined ? true : r.publiclyListed === where.publiclyListed),
      count: async () => residential.length,
    },
    corporateClient: { findMany: async () => [] },
  };
}

describe("ClientsService — residential privacy", () => {
  it("residentialSummary never returns a client name", async () => {
    const svc = new ClientsService(fakePrisma() as never);
    const summary = await svc.residentialSummary();
    const serialised = JSON.stringify(summary);
    expect(serialised).not.toContain("Masud");
    expect(serialised).not.toContain("Zahirul");
    expect(serialised).not.toContain("Consenting");
  });

  it("residentialSummary reports the true total", async () => {
    const svc = new ClientsService(fakePrisma() as never);
    expect((await svc.residentialSummary()).total).toBe(3);
  });

  it("residentialSummary derives districts from addresses", async () => {
    const svc = new ClientsService(fakePrisma() as never);
    const { districts } = await svc.residentialSummary();
    expect(districts).toEqual(expect.arrayContaining(["Dhaka", "Sylhet"]));
  });

  it("listResidentialPublic returns only consented rows", async () => {
    const svc = new ClientsService(fakePrisma() as never);
    const out = await svc.listResidentialPublic();
    expect(out).toHaveLength(1);
    expect(out[0]!.clientName).toBe("Consenting Client");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/api && pnpm test -- clients.service`
Expected: FAIL — cannot find `./clients.service`.

- [ ] **Step 3: Implement ClientsService**

`apps/api/src/content/clients.service.ts`:
```ts
import { Injectable } from "@nestjs/common";
import type { CorporateClient, ResidentialClient } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export interface ResidentialSummary {
  total: number;
  districts: string[];
}

/** Known districts appearing in the company profile's address lines. */
const DISTRICTS = [
  "Dhaka", "Savar", "Narayanganj", "Gopalganj", "Barishal", "Chittagong",
  "Rangpur", "Sylhet", "Tangail", "Manikganj", "Narshingdi", "Noakhali", "Natore",
];

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  listCorporatePublic(): Promise<CorporateClient[]> {
    return this.prisma.corporateClient.findMany({ orderBy: { serial: "asc" } });
  }

  /**
   * Aggregate only. Spec §11: the residential list names private individuals
   * with their neighbourhoods, and consent for a PDF sent to one prospect is not
   * consent for a public web page. Names never leave this method.
   */
  async residentialSummary(): Promise<ResidentialSummary> {
    const [total, rows] = await Promise.all([
      this.prisma.residentialClient.count(),
      this.prisma.residentialClient.findMany({ select: { address: true } }),
    ]);
    const districts = DISTRICTS.filter((d) =>
      rows.some((r) => r.address.toLowerCase().includes(d.toLowerCase())),
    );
    return { total, districts };
  }

  listResidentialPublic(): Promise<ResidentialClient[]> {
    return this.prisma.residentialClient.findMany({
      where: { publiclyListed: true },
      orderBy: { serial: "asc" },
    });
  }
}
```

Note the `select: { address: true }` — names are not even loaded into memory.

- [ ] **Step 4: Run to verify it passes**

Run: `cd apps/api && pnpm test -- clients.service`
Expected: PASS — 4 tests.

- [ ] **Step 5: Write the hero test, then implement**

`apps/api/src/content/hero.service.spec.ts`:
```ts
import { HeroService } from "./hero.service";

const segments = [
  { id: "1", sortOrder: 0, active: true,  showOnMobile: true },
  { id: "2", sortOrder: 1, active: true,  showOnMobile: false },
  { id: "3", sortOrder: 2, active: false, showOnMobile: true },
  { id: "4", sortOrder: 3, active: true,  showOnMobile: true },
];

function fakePrisma() {
  return {
    heroSegment: {
      findMany: async ({ where }: { where: { active: boolean; showOnMobile?: boolean } }) =>
        segments
          .filter((s) => s.active === where.active)
          .filter((s) => where.showOnMobile === undefined || s.showOnMobile === where.showOnMobile)
          .sort((a, b) => a.sortOrder - b.sortOrder),
    },
  };
}

describe("HeroService.listActive", () => {
  it("returns every active segment for desktop", async () => {
    const svc = new HeroService(fakePrisma() as never);
    expect((await svc.listActive("desktop")).map((s) => s.id)).toEqual(["1", "2", "4"]);
  });

  it("returns only mobile-flagged active segments for mobile", async () => {
    const svc = new HeroService(fakePrisma() as never);
    expect((await svc.listActive("mobile")).map((s) => s.id)).toEqual(["1", "4"]);
  });

  it("never returns an inactive segment", async () => {
    const svc = new HeroService(fakePrisma() as never);
    const all = await svc.listActive("desktop");
    expect(all.some((s) => s.id === "3")).toBe(false);
  });
});
```

Run it (FAIL), then implement `HeroService.listActive` passing
`{ active: true, ...(target === "mobile" ? { showOnMobile: true } : {}) }` and
ordering by `sortOrder`.

- [ ] **Step 6: Implement the remaining straightforward resources**

Blog, testimonials, team, certifications, and settings all follow the
`listPublic` / `listAll` / `findPublicBySlug` pattern established in Task 12.
Blog additionally filters `publishedAt <= now()`. Settings is a singleton:
`get()` upserts the `"singleton"` row so a fresh database never 404s.

- [ ] **Step 7: Run the full suite**

Run: `cd apps/api && pnpm test && DATABASE_URL="$TEST_DATABASE_URL" pnpm test:e2e`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/content apps/api/src/settings
git commit -m "feat(api): add clients, hero, blog, and settings resources"
```

---

## Task 14: Seed the real business data

Everything seeded here traces to the company profile PDF. Nothing is invented.

**Files:**
- Create: `apps/api/prisma/seed.ts`
- Create: `apps/api/prisma/seed-data/corporate-clients.ts`, `residential-clients.ts`, `services.ts`, `working-areas.ts`
- Test: `apps/api/test/seed.e2e-spec.ts`

**Interfaces:**
- Consumes: the Prisma client, `PasswordService`
- Produces: an idempotent `pnpm --filter @homeinn/api seed` populating settings, 7 services, 9 working areas, 73 corporate rows, 57 residential rows, 3 certifications, and one ADMIN user

- [ ] **Step 1: Write the failing seed assertions**

`apps/api/test/seed.e2e-spec.ts`:
```ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
afterAll(async () => { await prisma.$disconnect(); });

describe("seed data", () => {
  it("creates the 7 services from the company profile", async () => {
    expect(await prisma.service.count()).toBe(7);
  });

  it("creates the 9 working areas", async () => {
    expect(await prisma.workingArea.count()).toBe(9);
  });

  it("creates 73 corporate and 57 residential rows", async () => {
    expect(await prisma.corporateClient.count()).toBe(73);
    expect(await prisma.residentialClient.count()).toBe(57);
  });

  it("marks residential rows 17 and 33 as needing verification", async () => {
    const flagged = await prisma.residentialClient.findMany({
      where: { needsVerification: true }, select: { serial: true },
    });
    expect(flagged.map((r) => r.serial).sort((a, b) => a - b)).toEqual([17, 33]);
  });

  it("leaves every residential row unlisted by default", async () => {
    expect(await prisma.residentialClient.count({ where: { publiclyListed: true } })).toBe(0);
  });

  it("seeds no testimonials and no team members", async () => {
    expect(await prisma.testimonial.count()).toBe(0);
    expect(await prisma.teamMember.count()).toBe(0);
  });

  it("records the established year and true project counts in settings", async () => {
    const s = await prisma.siteSettings.findUnique({ where: { id: "singleton" } });
    expect(s?.establishedYear).toBe(2015);
    expect(s?.corporateProjectCount).toBe(73);
    expect(s?.residentialProjectCount).toBe(57);
    expect(s?.phone).toBe("01760775454");
    expect(s?.email).toBe("homeinnbd14@gmail.com");
  });

  it("is idempotent — a second run does not duplicate rows", async () => {
    // Run `pnpm seed` twice before this suite; counts above must still hold.
    expect(await prisma.service.count()).toBe(7);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/api && DATABASE_URL="$TEST_DATABASE_URL" pnpm jest --config test/jest-e2e.json seed`
Expected: FAIL — counts are 0.

- [ ] **Step 3: Write the seed data files**

`apps/api/prisma/seed-data/working-areas.ts` — the 9 areas verbatim from spec §2,
each with an `En` and a `Bn` name. Bangla names are translations of the English,
written out in full; do not leave any `nameBn` equal to its English string.

`apps/api/prisma/seed-data/services.ts` — the 7 products verbatim, with
`summaryEn`/`summaryBn` and `bodyEn`/`bodyBn`. Bodies are expanded from the
profile's own wording; no new capability is claimed.

`apps/api/prisma/seed-data/corporate-clients.ts` — all 73 rows as
`{ serial, companyName, address }`, transcribed from spec §2's source tables.
Set `isFlagship: true` on: BFIDC, Dermatology Department (CMH), Department of
Narcotics, Gulshan Zone-Sub Register Office, Khilgaon Zone-Sub Register Office,
Prime Medical College & Hospital, Mohila Polytechnic Institute, Woodora
Furniture Ltd.

`apps/api/prisma/seed-data/residential-clients.ts` — all 57 rows as
`{ serial, clientName, address, needsVerification }`. Serials 17 and 33 are
unreadable in the source PDF: seed them as `clientName: "(unreadable in source)"`,
`address: "(unreadable in source)"`, `needsVerification: true`. Do not guess.

- [ ] **Step 4: Write the seed script**

`apps/api/prisma/seed.ts`:
```ts
import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";
import { corporateClients } from "./seed-data/corporate-clients";
import { residentialClients } from "./seed-data/residential-clients";
import { services } from "./seed-data/services";
import { workingAreas } from "./seed-data/working-areas";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  await prisma.siteSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      phone: "01760775454",
      whatsapp: "+8801760775454",
      email: "homeinnbd14@gmail.com",
      addressEn: "Plot# 18, Road# 03, Block# KHA, Section# 06, Mirpur-10, Dhaka-1216",
      addressBn: "প্লট# ১৮, রোড# ০৩, ব্লক# খ, সেকশন# ০৬, মিরপুর-১০, ঢাকা-১২১৬",
      hoursEn: "Open every day",
      hoursBn: "প্রতিদিন খোলা",
      facebookUrl: "https://www.facebook.com/homeinnbd14",
      instagramUrl: "https://www.instagram.com/homeinnbd",
      establishedYear: 2015,
      corporateProjectCount: 73,
      residentialProjectCount: 57,
      districtCount: 13,
    },
  });

  for (const area of workingAreas) {
    await prisma.workingArea.upsert({ where: { slug: area.slug }, update: area, create: area });
  }
  for (const service of services) {
    await prisma.service.upsert({ where: { slug: service.slug }, update: service, create: service });
  }

  // Client tables are keyed by serial so re-runs update rather than duplicate.
  for (const row of corporateClients) {
    const existing = await prisma.corporateClient.findFirst({ where: { serial: row.serial } });
    existing
      ? await prisma.corporateClient.update({ where: { id: existing.id }, data: row })
      : await prisma.corporateClient.create({ data: row });
  }
  for (const row of residentialClients) {
    const existing = await prisma.residentialClient.findFirst({ where: { serial: row.serial } });
    existing
      ? await prisma.residentialClient.update({ where: { id: existing.id }, data: row })
      : await prisma.residentialClient.create({ data: row });
  }

  const certifications = [
    { titleEn: "Trade License", titleBn: "ট্রেড লাইসেন্স", issuer: "M/S Ahasan Enterprise", reference: null, sortOrder: 0 },
    { titleEn: "VAT Registration", titleBn: "ভ্যাট নিবন্ধন", issuer: "National Board of Revenue", reference: "BIN 001489494-0804", sortOrder: 1 },
    { titleEn: "TIN Certificate", titleBn: "টিআইএন সার্টিফিকেট", issuer: "National Board of Revenue", reference: null, sortOrder: 2 },
  ];
  for (const cert of certifications) {
    const existing = await prisma.certification.findFirst({ where: { titleEn: cert.titleEn } });
    if (!existing) await prisma.certification.create({ data: cert });
  }

  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@homeinnbd.com";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMeNow!2026";
  await prisma.adminUser.upsert({
    where: { email },
    update: {},
    create: {
      email, name: "Home Inn Admin", role: "ADMIN",
      passwordHash: await argon2.hash(password, { type: argon2.argon2id }),
    },
  });

  // Testimonials and team are intentionally empty — spec §12, no invented content.
  console.log("seed complete");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => void prisma.$disconnect());
```

- [ ] **Step 5: Run the seed twice, then the tests**

Run:
```bash
cd apps/api
DATABASE_URL="$TEST_DATABASE_URL" pnpm seed
DATABASE_URL="$TEST_DATABASE_URL" pnpm seed
DATABASE_URL="$TEST_DATABASE_URL" pnpm jest --config test/jest-e2e.json seed
```
Expected: PASS — 8 tests, counts unchanged by the second seed run.

- [ ] **Step 6: Seed the dev database too**

Run: `cd apps/api && pnpm seed`
Expected: "seed complete".

- [ ] **Step 7: Commit**

```bash
git add apps/api/prisma
git commit -m "feat(api): seed real business data from the 2026 company profile"
```

---

## Task 15: Public API surface and full green run

**Files:**
- Create: `apps/api/test/public-api.e2e-spec.ts`
- Modify: `apps/api/src/app.module.ts` — ensure every module is registered

**Interfaces:**
- Consumes: everything above
- Produces: a verified public read surface consumed by Plan 1B

- [ ] **Step 1: Write the failing contract test**

`apps/api/test/public-api.e2e-spec.ts` asserts, without any auth cookie:
```
GET /api/health              → 200 { status: "ok" }
GET /api/services            → 200, array, every item published
GET /api/working-areas       → 200, 9 items
GET /api/projects            → 200, array, every item published
GET /api/clients/corporate   → 200, 73 items
GET /api/clients/residential-summary → 200 { total: 57, districts: string[] }
GET /api/hero?target=mobile  → 200, every item showOnMobile === true
GET /api/settings            → 200, establishedYear === 2015
GET /api/leads               → 401
POST /api/media              → 401
```

Plus one explicit privacy assertion:
```ts
it("never exposes a residential client name on any public route", async () => {
  const routes = [
    "/api/clients/corporate", "/api/clients/residential-summary",
    "/api/projects", "/api/services", "/api/settings",
  ];
  const names = (await prisma.residentialClient.findMany({ select: { clientName: true } }))
    .map((r) => r.clientName)
    .filter((n) => !n.startsWith("("));

  for (const route of routes) {
    const res = await request(server()).get(route).expect(200);
    const body = JSON.stringify(res.body);
    for (const name of names) expect(body).not.toContain(name);
  }
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd apps/api && DATABASE_URL="$TEST_DATABASE_URL" pnpm test:e2e`
Expected: FAIL on any route not yet registered.

- [ ] **Step 3: Register every module and fix the failures**

Ensure `app.module.ts` imports `AuthModule`, `MediaModule`, `LeadsModule`,
`ContentModule`, `SettingsModule`.

- [ ] **Step 4: Full green run**

Run:
```bash
pnpm db:start
cd apps/api
DATABASE_URL="$TEST_DATABASE_URL" pnpm prisma migrate deploy
DATABASE_URL="$TEST_DATABASE_URL" pnpm seed
DATABASE_URL="$TEST_DATABASE_URL" pnpm test:e2e
pnpm test
cd ../.. && pnpm typecheck && pnpm lint
```
Expected: every command exits 0.

- [ ] **Step 5: Commit**

```bash
git add apps/api
git commit -m "test(api): verify public read surface and residential privacy"
```

---

## Self-Review

**Spec coverage.** §4 architecture → Tasks 1, 5. §5 data model → Task 4.
§5 auth → Tasks 6–9. §5 media → Task 10. §5 leads → Task 11. §5 content models →
Tasks 12–13. §11 residential privacy → Task 13 Step 1 and Task 15 Step 1.
§12 honest content → Task 14 Steps 1, 3. §13 testing → every task. §14 local
cluster → Task 2.

Not covered here by design, because they belong to Plans 1B and 1C: spec §6
(page IA), §7 (scroll hero), §8 (visual design), §9 (i18n routing), §10 (admin
UI). The API endpoints those plans consume are all delivered and contract-tested
in Task 15.

**Deferred to Plan 1B/1C, tracked so it is not lost:** SEO metadata generation
(§11) is a web-app concern; the `Seo` model exists in the schema from Task 4 and
is returned by the content endpoints, so 1B has what it needs.

**Type consistency.** `AuthUser` is defined once in `packages/types/src/auth.ts`
and used unchanged in `TokenService.signAccess`, `JwtGuard`, `CurrentUser`, and
`AuthService.login`. `StorageService.put(key, data, mime)` is declared in Task 10
Step 3 and called with three arguments in `MediaService.ingest`. `slugify` and
`uniqueSlug` are defined in Task 12 Step 3 and referenced by name in Task 12
Step 6. `listPublic` / `listAll` / `findPublicBySlug` are the same three names
across `ServicesService`, projects, and blog.

**Placeholder scan.** No TBD, no "add error handling", no "similar to Task N".
The only prose-only steps are Task 12 Step 6, Task 13 Step 6, and Task 14 Step 3,
each of which names an established pattern from an earlier task in the same plan
and states the exact data to transcribe.

---

## Execution Handoff

Plan complete. Two execution options:

1. **Subagent-Driven (recommended)** — a fresh subagent per task, review between tasks.
2. **Inline Execution** — execute in this session with checkpoints.

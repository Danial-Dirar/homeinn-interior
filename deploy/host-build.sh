#!/usr/bin/env bash
#
# Build Home Inn on the hosting Mac. Run from the repo root by
# `hosting deploy homeinn` (~/Development/Hosting/scripts/hosting.sh), which
# fast-forwards the checkout first and restarts the services afterwards.
#
# Everything is read from the repo-root .env (never committed): the API's
# settings, and the web's NEXT_PUBLIC_* values, which Next writes into the
# build. The web build fetches content from the running API over
# API_INTERNAL_URL, so the API must be up (on the old build is fine).
set -euo pipefail
cd "$(dirname "$0")/.."

[ -f .env ] || { echo "✗ no .env at $(pwd) — see deploy/README.md"; exit 1; }
set -a; . ./.env; set +a

# Home Inn brings its own Node (NODE_BIN_DIR, a keg-only Homebrew node@24): the
# host's shared /usr/local Node serves the other sites and stays as it is.
[ -n "${NODE_BIN_DIR:-}" ] && PATH="$NODE_BIN_DIR:$PATH"
echo "▶ node $(node -v)"

# The pnpm version package.json pins, run through npx: nothing installed
# globally, and no corepack (the host's corepack predates npm's key rotation).
PNPM_VERSION="$(node -p "require('./package.json').packageManager.split('@')[1]")"
PNPM="npx --yes pnpm@$PNPM_VERSION"

echo "▶ installing exactly the committed lockfile…"
$PNPM install --frozen-lockfile

# @prisma/client's own postinstall cannot find apps/api/prisma/schema.prisma
# from inside a pnpm workspace and leaves an empty stub; generate it here.
echo "▶ generating the Prisma client…"
$PNPM --filter @homeinn/api exec prisma generate

echo "▶ applying database migrations…"
$PNPM --filter @homeinn/api exec prisma migrate deploy

echo "▶ building…"
$PNPM --filter @homeinn/types build
$PNPM --filter @homeinn/api build
$PNPM --filter @homeinn/web build

echo "✓ built"

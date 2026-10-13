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

# pnpm through corepack: nothing to install globally, and the version is the
# one package.json pins.
PNPM="corepack pnpm"

echo "▶ installing exactly the committed lockfile…"
$PNPM install --frozen-lockfile

echo "▶ applying database migrations…"
$PNPM --filter @homeinn/api exec prisma migrate deploy

echo "▶ building…"
$PNPM --filter @homeinn/types build
$PNPM --filter @homeinn/api build
$PNPM --filter @homeinn/web build

echo "✓ built"

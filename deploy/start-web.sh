#!/usr/bin/env bash
# launchd entry point for the Home Inn site (com.hosting.homeinn-web).
# Loads the repo-root .env (API_INTERNAL_URL, REVALIDATE_SECRET are read at
# run time; NEXT_PUBLIC_* were fixed at build), then serves on loopback only.
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; . ./.env; set +a
cd apps/web
exec node node_modules/next/dist/bin/next start -H 127.0.0.1 -p "${WEB_PORT:-3200}"

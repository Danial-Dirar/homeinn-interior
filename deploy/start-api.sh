#!/usr/bin/env bash
# launchd entry point for the Home Inn API (com.hosting.homeinn-api).
# Loads the repo-root .env, then runs the compiled API from apps/api, where
# ConfigModule also looks for ../../.env.
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; . ./.env; set +a
cd apps/api
exec node dist/main.js

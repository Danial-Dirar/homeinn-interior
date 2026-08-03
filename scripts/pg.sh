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

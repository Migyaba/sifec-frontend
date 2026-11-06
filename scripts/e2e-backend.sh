#!/usr/bin/env bash
# Backend des parcours Playwright, sur une base jetable : sifec_e2e est recréée à chaque lancement.
# Suppose PostgreSQL (port 5433) et Redis (port 6379) du dépôt sifec-backend démarrés :
#   docker compose up -d --no-deps db redis
set -euo pipefail

BACKEND="${SIFEC_BACKEND:-$(cd "$(dirname "$0")/../../sifec-backend" && pwd)}"
FRONTEND="$(cd "$(dirname "$0")/.." && pwd)"
DB_HOST="${E2E_DB_HOST:-localhost}"
DB_PORT="${E2E_DB_PORT:-5433}"
export DATABASE_URL="postgres://sifec:sifec@${DB_HOST}:${DB_PORT}/sifec_e2e"
export REDIS_URL="${E2E_REDIS_URL:-redis://localhost:6379/1}"
export DJANGO_SETTINGS_MODULE=config.settings.dev
export DJANGO_CSRF_TRUSTED_ORIGINS="${E2E_ORIGIN:-http://localhost:5174}"

cd "$BACKEND"
SQL=(-c "DROP DATABASE IF EXISTS sifec_e2e WITH (FORCE)" -c "CREATE DATABASE sifec_e2e")
if command -v psql > /dev/null; then
  PGPASSWORD=sifec psql -h "$DB_HOST" -p "$DB_PORT" -U sifec -d postgres -q "${SQL[@]}"
else
  # Sans client PostgreSQL sur la machine : celui du conteneur du projet.
  docker exec sifec-backend-db-1 psql -U sifec -d postgres -q "${SQL[@]}"
fi
uv run python manage.py migrate --no-input -v 0
uv run python manage.py shell < "$FRONTEND/tests/e2e/seed.py"
exec uv run python manage.py runserver 127.0.0.1:8000 --noreload

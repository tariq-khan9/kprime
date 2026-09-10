#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/home/tariq/kprime"
BACKUP_DIR="$APP_DIR/backups"
cd "$APP_DIR"

mkdir -p "$BACKUP_DIR"

echo "==> Backing up database"
docker compose exec -T kprime-postgres \
  pg_dump -U "${POSTGRES_USER:-kprime}" "${POSTGRES_DB:-kprime}" \
  | gzip > "$BACKUP_DIR/kprime-$(date +%F-%H%M%S).sql.gz"
find "$BACKUP_DIR" -name 'kprime-*.sql.gz' -mtime +7 -delete

echo "==> Saving rollback images"
for svc in backend storefront; do
  if docker image inspect "kprime-${svc}:latest" >/dev/null 2>&1; then
    docker image tag "kprime-${svc}:latest" "kprime-${svc}:rollback"
  fi
done

PREV_SHA=$(git rev-parse HEAD)
echo "==> Current: $(git rev-parse --short HEAD)"

git fetch origin main
git reset --hard origin/main
echo "==> Deploying: $(git rev-parse --short HEAD)"

echo "==> Building backend"
docker compose --profile app build backend

echo "==> Building storefront"
docker compose --profile app build storefront

echo "==> Running migrations"
docker compose --profile app run --rm backend npx medusa db:migrate

echo "==> Starting containers"
docker compose --profile app up -d

echo "==> Health check"
healthy=0
for i in $(seq 1 30); do
  if curl -fsS --max-time 3 http://127.0.0.1:9000/health >/dev/null \
     && curl -fsS --max-time 3 http://127.0.0.1:8000/ >/dev/null; then
    healthy=1
    echo "Healthy after $((i*3))s"
    break
  fi
  sleep 3
done

if [ "$healthy" -ne 1 ]; then
  echo "!! FAILED — rolling back"
  git reset --hard "$PREV_SHA"
  for svc in backend storefront; do
    docker image tag "kprime-${svc}:rollback" "kprime-${svc}:latest" || true
  done
  docker compose --profile app up -d --force-recreate
  exit 1
fi

docker image prune -f
echo "==> Done"
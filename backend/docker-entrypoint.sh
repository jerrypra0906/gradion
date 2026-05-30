#!/bin/sh
set -e

APP_USER="${APP_USER:-node}"

# Fix bind-mount permissions (host dirs are often owned by ubuntu uid 1000).
if [ "$(id -u)" = "0" ]; then
  mkdir -p uploads/banners uploads/cms uploads/videos logs
  chown -R "${APP_USER}:${APP_USER}" uploads logs 2>/dev/null || true
  exec su -s /bin/sh "${APP_USER}" -c "exec $0"
fi

mkdir -p uploads/banners uploads/cms uploads/videos logs 2>/dev/null || true

echo "Running database migrations..."
npx prisma migrate deploy

echo "Starting API server..."
exec node dist/index.js

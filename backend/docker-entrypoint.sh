#!/bin/sh
set -e

mkdir -p uploads/banners uploads/cms uploads/videos logs 2>/dev/null || true

echo "Running database migrations..."
npx prisma migrate deploy

echo "Starting API server..."
exec node dist/index.js

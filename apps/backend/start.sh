#!/bin/bash
set -e

echo "========================================"
echo "  WB Backend - Starting Server"
echo "========================================"

# Generate Prisma client
echo "→ Generating Prisma client..."
npx prisma generate --schema=prisma/schema.prisma

# Run database migrations
echo "→ Running database migrations..."
npx prisma migrate resolve --rolled-back "20250426_drop_deprecated_user_fields_and_add_captcha"
npx prisma migrate deploy --schema=prisma/schema.prisma

# Start the server
echo "========================================"
echo "  Server starting on port ${PORT:-3001}"
echo "  Health: http://localhost:${PORT:-3001}/health"
echo "========================================"

node dist/main.js

#!/bin/bash
set -euo pipefail

echo "========================================"
echo "  WB Backend - Starting Server"
echo "========================================"

# Generate Prisma client
echo "→ Generating Prisma client..."
npx prisma generate --schema=prisma/schema.prisma

# Run database migrations
echo "→ Running database migrations..."

# Clean up any failed migration records for migrations that no longer exist
# (e.g. 20250428_add_free_tier was removed from the codebase)
echo "→ Checking for orphaned failed migrations..."
npx prisma migrate resolve --rolled-back "20250428_add_free_tier" --schema=prisma/schema.prisma 2>/dev/null || true

npx prisma migrate deploy --schema=prisma/schema.prisma

# Start the server
echo "========================================"
echo "  Server starting on port ${PORT:-3001}"
echo "  Health: http://localhost:${PORT:-3001}/health"
echo "========================================"

node dist/main.js

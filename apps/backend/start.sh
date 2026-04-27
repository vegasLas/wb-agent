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

# Safely resolve the rolled-back migration only if the migrations table exists
# and the migration was actually marked as rolled back
npx prisma migrate deploy --schema=prisma/schema.prisma

# Start the server
echo "========================================"
echo "  Server starting on port ${PORT:-3001}"
echo "  Health: http://localhost:${PORT:-3001}/health"
echo "========================================"

node dist/main.js

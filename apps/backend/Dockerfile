# ==========================================
# WB Backend - Production Dockerfile
# ==========================================
# Multi-stage build with minimal production image

# ------------------------------------------
# Stage 1: Builder
# ------------------------------------------
FROM --platform=linux/amd64 node:20-bookworm-slim AS builder

WORKDIR /app

# Install build essentials
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ openssl \
    && rm -rf /var/lib/apt/lists/*

# Copy root config files (needed for build)
COPY package*.json ./
COPY nx.json ./
COPY tsconfig*.json ./

# Copy backend package.json
COPY apps/backend/package*.json ./apps/backend/

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY apps/backend ./apps/backend
COPY libs ./libs

# Install Playwright browser
RUN npx playwright install chromium

# Generate Prisma client
RUN npx prisma generate --schema=apps/backend/prisma/schema.prisma

# Build the application
RUN npx nx build backend

# Prune dev dependencies for production
RUN npm prune --omit=dev

# ------------------------------------------
# Stage 2: Production
# ------------------------------------------
FROM --platform=linux/amd64 node:20-bookworm-slim

WORKDIR /app

# Install Playwright system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    libatspi2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy production node_modules from builder (no dev deps, no nx)
COPY --from=builder /app/node_modules ./node_modules

# Copy built application
COPY --from=builder /app/dist/apps/api ./dist

# Copy prisma schema for migrations
COPY --from=builder /app/apps/backend/prisma ./prisma

# Copy start script
COPY apps/backend/start.sh ./start.sh
RUN chmod +x ./start.sh

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

CMD ["./start.sh"]

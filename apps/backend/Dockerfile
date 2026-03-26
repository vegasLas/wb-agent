# ==========================================
# WB Backend - Production Dockerfile
# ==========================================
# Multi-stage build with simplified dist structure

# ------------------------------------------
# Stage 1: Builder
# ------------------------------------------
FROM --platform=linux/amd64 node:20-bookworm-slim AS builder

WORKDIR /app

# Install build essentials
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ openssl \
    && rm -rf /var/lib/apt/lists/*

# Copy root config files
COPY package*.json ./
COPY nx.json ./
COPY tsconfig*.json ./
COPY tsconfig.base.json ./

# Copy source code
COPY apps/backend ./apps/backend
COPY libs ./libs

# Install all dependencies
RUN npm ci

# Install Playwright browser
RUN npx playwright install chromium

# Generate Prisma client
RUN npx prisma generate --schema=apps/backend/prisma/schema.prisma

# Build the application
RUN npx nx build api

# Restructure to clean dist folder in backend
RUN mkdir -p apps/backend/dist && \
    cp -r dist/apps/api/* apps/backend/dist/ && \
    cp apps/backend/prisma/schema.prisma apps/backend/dist/

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

# Copy production dependencies from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Copy built application (clean structure)
COPY --from=builder /app/apps/backend/dist ./

# Copy start script
COPY apps/backend/start.sh ./start.sh
RUN chmod +x ./start.sh

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

CMD ["./start.sh"]

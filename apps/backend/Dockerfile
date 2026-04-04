# ==========================================
# WB Backend - Production Dockerfile
# ==========================================
# Standalone build using backend's package.json + shared libs

# ------------------------------------------
# Stage 1: Builder
# ------------------------------------------
FROM --platform=linux/amd64 node:20-bookworm-slim AS builder

WORKDIR /app

# Install build essentials
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ openssl \
    && rm -rf /var/lib/apt/lists/*

# Copy backend package.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code (backend + libs)
COPY . .

# Install Playwright browser
# RUN npx playwright install chromium
# RUN npx playwright install-deps


# Generate Prisma client
RUN npx prisma generate --schema=prisma/schema.prisma

# Build with tsc
RUN npx tsc -p tsconfig.docker.json

# ------------------------------------------
# Stage 2: Production
# ------------------------------------------
FROM --platform=linux/amd64 node:20-bookworm-slim

WORKDIR /app

# Install Playwright system dependencies
# RUN apt-get update && apt-get install -y --no-install-recommends \
#     openssl \
#     libnss3 \
#     libnspr4 \
#     libatk1.0-0 \
#     libatk-bridge2.0-0 \
#     libcups2 \
#     libdrm2 \
#     libxkbcommon0 \
#     libxcomposite1 \
#     libxdamage1 \
#     libxfixes3 \
#     libxrandr2 \
#     libgbm1 \
#     libpango-1.0-0 \
#     libcairo2 \
#     libasound2 \
#     libatspi2.0-0 \
#     && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Copy node_modules from builder, then prune dev dependencies
COPY --from=builder /app/node_modules ./node_modules
RUN npm prune --omit=dev

# Copy Playwright browsers from builder
# COPY --from=builder /root/.cache/ms-playwright /root/.cache/ms-playwright

# Copy built application
COPY --from=builder /app/dist ./dist

# Copy prisma schema
COPY --from=builder /app/prisma ./prisma

# Copy start script
COPY start.sh ./start.sh
RUN chmod +x ./start.sh

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

CMD ["./start.sh"]

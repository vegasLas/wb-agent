# ==========================================
# WB Backend - Production Dockerfile
# Using Microsoft Playwright base image
# ==========================================

# ------------------------------------------
# Stage 1: Builder
# Uses Playwright image with browsers pre-installed
# ------------------------------------------
FROM --platform=linux/amd64 mcr.microsoft.com/playwright:v1.59.1-noble AS builder

WORKDIR /app


# Install build essentials (Python, make, g++, openssl)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ openssl \
    && rm -rf /var/lib/apt/lists/*

# Copy package files first for better layer caching
COPY package*.json ./

# Install npm dependencies
RUN npm install

# Copy source code (backend + libs)
COPY . .

# Stub out heavy AI SDK types to prevent tsc OOM during build
RUN cp docker-types/ai-stub.d.ts node_modules/ai/dist/index.d.ts
RUN cp docker-types/ai-sdk-stub.d.ts node_modules/@ai-sdk/deepseek/dist/index.d.ts

# Generate Prisma client
RUN npx prisma generate --schema=prisma/schema.prisma

# Build with tsc
RUN npx tsc -p tsconfig.docker.json

# Rewrite path aliases to relative paths
RUN npx tsc-alias -p tsconfig.docker.json

# ------------------------------------------
# Stage 2: Production
# Also uses Playwright image with browsers pre-installed
# ------------------------------------------
FROM --platform=linux/amd64 mcr.microsoft.com/playwright:v1.59.1-noble

WORKDIR /app


# Copy package files
COPY package*.json ./

# Copy node_modules from builder, then prune dev dependencies
COPY --from=builder /app/node_modules ./node_modules
RUN npm prune --omit=dev

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

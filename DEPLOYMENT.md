# wboi - Deployment Guide

## Overview

This document describes how to deploy the wboi backend using Docker.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- (Optional) Access to a Docker registry for image distribution

## Quick Start

### 1. Environment Setup

Copy the Docker environment example file and configure your values:

```bash
cp .env.docker.example .env.docker
```

Edit `.env.docker` and set the required values:
- `COOKIE_ENCRYPTION_KEY` - Must be at least 64 characters (hex encoded 32 bytes)
- `DATABASE_URL` - PostgreSQL connection string
- `TELEGRAM_BOT_TOKEN` - For bot notifications
- `YOOKASSA_SHOP_ID` and `YOOKASSA_SECRET_KEY` - For payment processing

### 2. Using Docker Compose (Recommended)

Start all services (PostgreSQL + Backend):

```bash
# Start services
docker-compose --env-file .env.docker up -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down

# Stop and remove volumes (WARNING: deletes database data)
docker-compose down -v
```

### 3. Using Docker Directly

Build and run the backend image manually:

```bash
# Build the image
docker build -t wb-agent-backend -f apps/backend/Dockerfile .

# Run the container
docker run -d \
  --name wb-agent-backend \
  -p 3001:3001 \
  -e NODE_ENV=production \
  -e PORT=3001 \
  -e DATABASE_URL=postgresql://user:pass@host:5432/db \
  -e COOKIE_ENCRYPTION_KEY=your_64_char_key \
  -e TELEGRAM_BOT_TOKEN=your_token \
  wb-agent-backend
```

## Available Scripts

The following npm scripts have been added to `package.json`:

```bash
# Build Docker image locally
npm run docker:build

# Build and push multi-platform image to registry
npm run docker:build:push

# Start services with docker-compose
npm run docker:up

# Stop services
npm run docker:down

# View backend logs
npm run docker:logs
```

## Dockerfile Structure

The Dockerfile uses a multi-stage build approach:

1. **Dependencies Stage**: Installs production npm dependencies
2. **Builder Stage**: Compiles TypeScript source code
3. **Production Stage**: Minimal image with Playwright support

### Key Features

- **Security**: Runs as non-root user (`appuser`)
- **Playwright**: Includes all system dependencies for Chromium browser
- **Prisma**: Auto-generates client and runs migrations on startup
- **Health Check**: Built-in health check endpoint at `/health`
- **Platform**: Targets `linux/amd64` for compatibility

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `COOKIE_ENCRYPTION_KEY` | Yes | - | Min 64 chars, encryption key |
| `NODE_ENV` | No | `production` | Runtime environment |
| `PORT` | No | `3001` | Server port |
| `FRONTEND_URL` | No | `http://localhost:3000` | CORS origin |
| `TELEGRAM_BOT_TOKEN` | No | - | Bot token for notifications |
| `YOOKASSA_SHOP_ID` | No | - | Payment provider ID |
| `YOOKASSA_SECRET_KEY` | No | - | Payment provider secret |
| `WB_API_BASE_URL` | No | WB seller API | Wildberries API endpoint |
| `PROXY_LIST` | No | - | Comma-separated proxy list |
| `RUN_MONITORING_CLEANUP` | No | `true` | Enable cron cleanup jobs |

## Health Checks

The container includes a health check that pings the `/health` endpoint every 30 seconds.

You can also check manually:

```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "environment": "production"
  }
}
```

## Troubleshooting

### Container fails to start

Check logs for errors:
```bash
docker-compose logs backend
```

Common issues:
- Missing required environment variables
- Database connection failures
- Invalid `COOKIE_ENCRYPTION_KEY` (must be 64+ chars)

### Database migrations fail

Migrations run automatically on startup. If they fail:

1. Check database connectivity
2. Verify `DATABASE_URL` is correct
3. Check PostgreSQL user has proper permissions

### Playwright browser issues

The image includes Chromium browser. If browser automation fails:

1. Ensure container has enough memory (2GB+ recommended)
2. Check logs for Playwright-specific errors

## Production Deployment

### 1. Build Production Image

```bash
docker buildx build \
  --platform linux/amd64 \
  -t your-registry/wb-agent-backend:latest \
  -f apps/backend/Dockerfile . \
  --push
```

### 2. Deploy to Server

Example with docker-compose on a production server:

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  backend:
    image: your-registry/wb-agent-backend:latest
    restart: always
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - COOKIE_ENCRYPTION_KEY=${COOKIE_ENCRYPTION_KEY}
      # ... other env vars
    ports:
      - "3001:3001"
```

Deploy:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Architecture

```
┌─────────────────┐
│   Load Balancer │
│   (Optional)    │
└────────┬────────┘
         │
┌────────▼────────┐
│  wboi API       │ Docker Container
│   (Port 3001)   │
│                 │
│  - Express.js   │
│  - Prisma ORM   │
│  - Playwright   │
└────────┬────────┘
         │
┌────────▼────────┐
│   PostgreSQL    │ Docker Container
│   (Port 5432)   │ (or external)
└─────────────────┘
```

# WB Refactored API

An Nx-powered monorepo migrating from Nuxt 3 to Express.js with full multi-account support for Wildberries seller automation.

## Overview

This project is a refactoring effort to migrate the Nuxt 3 server-side code to a clean Express.js architecture with:
- **Multi-account support** - Users can manage multiple WB accounts
- **Supplier management** - Full supplier and WB API integration
- **Autobooking** - Automated supply booking
- **Supply triggers** - Event-based supply management
- **Telegram integration** - Bot notifications and commands
- **Payment processing** - YooKassa integration

## Tech Stack

### Backend (New Express API)
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **Prisma** - Database ORM
- **PostgreSQL** - Database
- **JWT** - Authentication
- **Winston** - Logging
- **Zod** - Environment validation
- **Jest** - Testing

### Frontend (Existing)
- **Vue 3** - Progressive JavaScript framework
- **Pinia** - State management
- **Tailwind CSS** - Utility-first CSS
- **Vite** - Build tool

### Monorepo
- **Nx** - Build system and workspace management

## Project Structure

```
wb-refactored/
├── apps/
│   ├── api/                    # Express API application
│   │   ├── src/
│   │   │   ├── config/         # Environment & config
│   │   │   ├── routes/         # API routes (controllers)
│   │   │   ├── services/       # Business logic
│   │   │   ├── middleware/     # Express middleware
│   │   │   ├── utils/          # Utilities
│   │   │   ├── jobs/           # Background jobs
│   │   │   ├── types/          # TypeScript types
│   │   │   ├── __tests__/      # Jest tests
│   │   │   ├── app.ts          # Express app config
│   │   │   └── main.ts         # Entry point
│   │   ├── prisma/
│   │   │   └── schema.prisma   # Database schema
│   │   ├── project.json        # Nx project config
│   │   ├── jest.config.ts      # Jest config
│   │   └── tsconfig.*.json     # TypeScript configs
│   └── frontend/               # Vue 3 application
├── libs/
│   └── shared/                 # Shared types & utilities
│       └── src/
│           ├── types/
│           └── utils/
├── backend-plan/               # Implementation plans
│   ├── 00-INDEX.md
│   ├── 01-ARCHITECTURE.md
│   ├── 02-DATABASE.md
│   └── ... (see index)
└── nx.json
```

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL 14+
- npm

### Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Configure environment:**
```bash
# Copy example env file
cp .env.example .env

# Edit .env with your values
# Required: DATABASE_URL, JWT_SECRET
```

3. **Set up database:**
```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Or use Prisma directly
npx prisma migrate dev --schema=apps/api/prisma/schema.prisma
```

### Development

Run both frontend and backend:
```bash
npm run dev
```

Run backend only:
```bash
npm run dev:backend
```

Run frontend only:
```bash
npm run dev:frontend
```

### Testing

Run all tests:
```bash
npm run test
```

Run API tests only:
```bash
nx test api
```

Run tests in watch mode:
```bash
nx test api --watch
```

### Database Commands

```bash
# Generate Prisma client after schema changes
npm run db:generate

# Create and run migrations
npm run db:migrate

# Open Prisma Studio
npm run db:studio

# Reset database (caution: deletes all data)
npx prisma migrate reset --schema=apps/api/prisma/schema.prisma
```

## API Architecture

### Request Flow
```
Request → Middleware → Routes → Services → Prisma → Database
              ↓            ↓          ↓
         Auth/Rate    Validation   Business
          Limit                      Logic
```

### Response Format

**Success:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": { ... }
}
```

### Endpoints

| Endpoint | Description | Auth |
|----------|-------------|------|
| `GET /health` | Health check | No |
| `GET /api/v1` | API info | No |
| `POST /api/v1/auth/register` | Register user | No |
| `POST /api/v1/auth/login` | Login user | No |
| `GET /api/v1/accounts` | List accounts | Yes |
| `POST /api/v1/accounts` | Create account | Yes |
| ... | ... | ... |

See `backend-plan/` for complete endpoint documentation.

## Implementation Plans

The migration is organized into sequential implementation plans:

| Plan | File | Description |
|------|------|-------------|
| 01 | [ARCHITECTURE.md](backend-plan/01-ARCHITECTURE.md) | ✅ Project structure & Express setup |
| 02 | [DATABASE.md](backend-plan/02-DATABASE.md) | Prisma schema & database layer |
| 03 | [AUTH.md](backend-plan/03-AUTH.md) | Authentication & authorization |
| 04 | [ACCOUNTS.md](backend-plan/04-ACCOUNTS.md) | Account management |
| 05 | [SUPPLIERS.md](backend-plan/05-SUPPLIERS.md) | Supplier & WB API integration |
| 06 | [AUTOBOOKING.md](backend-plan/06-AUTOBOOKING.md) | Autobooking CRUD |
| 07 | [RESCHEDULE.md](backend-plan/07-RESCHEDULE.md) | Reschedule functionality |
| 08 | [TRIGGERS.md](backend-plan/08-TRIGGERS.md) | Supply triggers |
| 09 | [WAREHOUSES.md](backend-plan/09-WAREHOUSES.md) | Warehouse management |
| 10 | [SUPPLIES.md](backend-plan/10-SUPPLIES.md) | Supplies & drafts |
| 11 | [PAYMENTS.md](backend-plan/11-PAYMENTS.md) | YooKassa payments |
| 12 | [MONITORING.md](backend-plan/12-MONITORING.md) | Background monitoring jobs |
| 12A | [TRIGGER-DATE-UPDATE.md](backend-plan/12A-TRIGGER-DATE-UPDATE.md) | Date update jobs |
| 13 | [TELEGRAM.md](backend-plan/13-TELEGRAM.md) | Telegram bot integration |
| 14 | [ADMIN.md](backend-plan/14-ADMIN.md) | Admin services |
| 18 | [MIGRATION-GUIDE.md](backend-plan/18-MIGRATION-GUIDE.md) | Migration instructions |
| 19 | [TEST-MIGRATION.md](backend-plan/19-TEST-MIGRATION.md) | Test migration guide |

**Important:** Plans must be implemented sequentially. Do not skip ahead.

## Migration Approach

### Core Principle: ADAPT, Don't Rewrite

Business logic from the original Nuxt 3 server code is migrated and adapted to Express:

| Nuxt 3 | Express |
|--------|---------|
| `defineEventHandler()` | `router.get/post/put/delete()` |
| `readBody(event)` | `req.body` |
| `getRouterParam(event, 'id')` | `req.params.id` |
| `getQuery(event)` | `req.query` |
| `return { data }` | `res.json({ data })` |
| `throw createError()` | `next(new ApiError())` |

### Source Project Reference

Original Nuxt 3 project: `/Users/muhammad/Documents/wb`

Key directories:
- `server/api/v1/` - API routes (39 files)
- `server/services/` - Business logic (63 files)
- `server/plugins/` - Background jobs (4 files)
- `server/utils/` - Utilities (18 files)
- `server/types/` - TypeScript types (6 files)
- `tests/` - Test files (25 files)
- `prisma/` - Database schema

## License

MIT

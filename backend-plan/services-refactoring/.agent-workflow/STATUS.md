# Services Refactoring — Status Tracker

> Auto-generated status file. Update after each chunk completion.

---

## Overview

Migration of backend services from flat `services/` structure to organized architecture.

---

## Progress

| Chunk | Status | PR | Branch |
|-------|--------|-----|--------|
| 01 — External WB API Services | ✅ Merged | #92 | `refactor/chunk-1-external-wb-api` |
| 02 — Domain Services | ⏳ Not started | — | — |
| 03 — User & Account Services | ✅ Merged | #94 | `refactor/chunk-3-user-services` |
| 04 — Infrastructure Services | ⏳ Not started | — | — |

---

## Current Branch State

```
main
  └── refactor/services-architecture  ← HEAD at merge commit baed65d
```

**Parent branch commit:** `baed65d` — Merge pull request #94 from vegasLas/refactor/chunk-3-user-services

---

## Completed Work

### Chunk 3: User & Account Services (✅)

**Plan:** `backend-plan/services-refactoring/03-CHUNK-USER-SERVICES.md`

**Services moved to `services/user/`:**
- `auth.service.ts` — WB authentication via Playwright
- `user.service.ts` — User CRUD operations
- `account.service.ts` — Account & supplier management
- `supplier-api-key.service.ts` — API key management

**New file:**
- `services/user/index.ts` — Barrel export

**Files updated:**
- `routes/auth.routes.ts`
- `routes/accounts.routes.ts`
- `routes/suppliers.routes.ts`
- `routes/supplies.routes.ts`
- `routes/user.routes.ts`
- `routes/warehouses.routes.ts`
- `routes/supplier-api-keys.routes.ts`
- `services/telegram.service.ts`
- `tsconfig.json` — Fixed project references

### Chunk 1: External WB API Services (✅)

**Plan:** `backend-plan/services-refactoring/01-CHUNK-EXTERNAL-WB-API.md`

**Services moved to `services/external/wb/`:**
- `wb-supplier.service.ts` — Cookie API (supplier drafts, goods, supplies)
- `wb-warehouse.service.ts` — Cookie API (warehouse, transit, coefficients)
- `trigger.service.ts` — Common API (coefficients from WB API)
- `close-api.service.ts` — Cookie API (acceptance coefficients report)
- `free-warehouse.service.ts` — Common API (free warehouse API with caching)
- `wb-extended.service.ts` — Cookie API (measurement penalties, adverts)

**New file:**
- `services/external/wb/index.ts` — Barrel export

**Files updated:**
- `plugins/trigger-date-update.plugin.ts`
- `routes/coefficients.routes.ts`
- `routes/suppliers.routes.ts`
- `routes/supplies.routes.ts`
- `routes/triggers.routes.ts`
- `routes/warehouses.routes.ts`
- `services/monitoring/supply-trigger-monitoring.service.ts`
- `services/monitoring/warehouse-monitoring-v2.service.ts`
- `services/monitoring/__tests__/supply-trigger-monitoring.test.ts`
- `services/monitoring/__tests__/warehouse-monitoring-v2.test.ts`

---

## Verification Baseline

Last verified after Chunk 1:

| Check | Result |
|-------|--------|
| TypeScript compilation | ✅ Passes |
| Build | ✅ Passes |
| Tests | 13 failed, 379 passed (pre-existing failures — do NOT introduce new ones) |

---

## Next Steps

When starting a new chunk:

1. Read the chunk plan from `backend-plan/services-refactoring/`
2. Read `GIT_WORKFLOW.md` in this directory
3. Ensure you're branching from `refactor/services-architecture` (not `main`)
4. Follow the workflow steps exactly
5. Update this STATUS.md after completion

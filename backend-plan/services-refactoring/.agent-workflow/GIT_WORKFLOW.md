# AI Agent Git Workflow Guide — Services Refactoring

> **Purpose:** This document explains the git workflow pattern for applying refactoring chunks. Future AI agents must follow this exact process.

---

## Branch Architecture

```
main
  └── refactor/services-architecture      ← Parent (long-lived roadmap branch)
        ├── refactor/chunk-1-external-wb-api   ✅ Merged via PR #92
        ├── refactor/chunk-2-xxx               (future)
        ├── refactor/chunk-3-xxx               (future)
        └── ...
```

| Branch | Purpose | Base | Merged To |
|--------|---------|------|-----------|
| `refactor/services-architecture` | Parent branch — accumulates all refactoring chunks | `main` | Never directly — only via child PRs |
| `refactor/chunk-N-xxx` | Individual chunk implementation | `refactor/services-architecture` | `refactor/services-architecture` via PR |

---

## Workflow Steps (MUST FOLLOW)

### Step 1: Ensure Clean State

```bash
cd /path/to/wb-agent
git checkout main
git pull origin main
```

### Step 2: Update Parent Branch

```bash
git checkout refactor/services-architecture
git pull origin refactor/services-architecture
# OR if parent is behind main:
git merge main
```

### Step 3: Create Chunk Branch

Branch naming convention: `refactor/chunk-N-short-description`

```bash
git checkout -b refactor/chunk-N-short-description
```

### Step 4: Implement the Chunk

1. Read the chunk plan from `backend-plan/services-refactoring/`
2. Make changes according to the plan
3. **Group commits by logic** — see Commit Guidelines below

### Step 5: Verify Before Committing

```bash
# TypeScript check
npx tsc --noEmit -p apps/backend/tsconfig.json

# Build check
npm run build --workspace=apps/backend

# Test check (note: some pre-existing failures exist — do not introduce new ones)
npx nx test backend
```

### Step 6: Commit (Logical Grouping)

Group changes into logical commits. **Do NOT** squash everything into one commit unless the chunk is truly atomic.

**Typical commit structure for a chunk:**

```bash
# Commit 1: Structural changes (dirs, moves)
git add <moved-files>
git commit -m "refactor(chunk-N): move X service to new location

- Moved: service-a.ts, service-b.ts
- Created: new-dir/ structure

Part of: backend-plan/services-refactoring/NN-CHUNK-NAME.md"

# Commit 2: Import updates in moved files
git add <files-with-import-changes>
git commit -m "refactor(chunk-N): update cross-service imports in moved files

- Updated import paths for services referencing each other

Part of: backend-plan/services-refactoring/NN-CHUNK-NAME.md"

# Commit 3: Import updates in consumers
git add <routes-plugins-controllers>
git commit -m "refactor(chunk-N): update imports in routes, plugins, and controllers

- Updated all files that import the moved services

Part of: backend-plan/services-refactoring/NN-CHUNK-NAME.md"

# Commit 4: Test updates
git add <test-files>
git commit -m "test(chunk-N): update test mocks and imports

- Updated jest.mock() paths
- Updated import statements in tests

Part of: backend-plan/services-refactoring/NN-CHUNK-NAME.md"
```

### Step 7: Push Branch

```bash
git push -u origin refactor/chunk-N-short-description
```

### Step 8: Create PR via GitHub CLI

```bash
gh pr create \
  --base refactor/services-architecture \
  --head refactor/chunk-N-short-description \
  --title "Chunk N: Human-Readable Title" \
  --body "## Overview

Brief description of what this chunk does.

## Changes

- Change 1
- Change 2
- Change 3

## Verification

- [ ] TypeScript compilation passes: npx tsc --noEmit
- [ ] Build passes: npm run build --workspace=apps/backend
- [ ] No new test failures introduced

Part of: backend-plan/services-refactoring/NN-CHUNK-NAME.md"
```

### Step 9: Merge with Merge Commit

```bash
gh pr merge <PR_NUMBER> --merge --body "Merge Chunk N: Description"
```

**MUST use `--merge`** (not squash, not rebase) to preserve the chunk commit history.

---

## Commit Message Convention

```
<type>(chunk-N): <description>

<body>

Part of: backend-plan/services-refactoring/NN-CHUNK-NAME.md
```

| Type | Use When |
|------|----------|
| `refactor` | Moving files, restructuring, renaming |
| `feat` | New functionality added |
| `fix` | Bug fixes |
| `test` | Test-only changes |
| `chore` | Tooling, config, housekeeping |
| `docs` | Documentation changes |

---

## Critical Rules

1. **Always branch from `refactor/services-architecture`**, never from `main` or another chunk branch
2. **Always merge to `refactor/services-architecture`**, never to `main`
3. **Always use merge commits** (`--merge`) — never squash or rebase
4. **Never push directly** to `refactor/services-architecture` — always via PR
5. **Verify build before PR** — TypeScript and build must pass
6. **Do not introduce new test failures** — check against baseline
7. **Group commits logically** — don't squash unrelated changes

---

## Reference: Chunk 1 (Completed)

| Item | Value |
|------|-------|
| Plan | `backend-plan/services-refactoring/01-CHUNK-EXTERNAL-WB-API.md` |
| Branch | `refactor/chunk-1-external-wb-api` |
| PR | #92 |
| Commit | `9a14fc4` |
| Merge commit | `dfef9d9` |

---

## Current State

Check this file for the latest status:
```bash
cat backend-plan/services-refactoring/.agent-workflow/STATUS.md
```

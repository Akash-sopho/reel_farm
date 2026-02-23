# CLAUDE.md — ReelForge Agent Instructions

## Supervisor Workflow

At the start of every session:
1. Read `TASKS.md` in the repo root.
2. Find the first task with **Status: PENDING** whose dependencies are all **DONE**.
3. Update that task's status to **IN-PROGRESS** in `TASKS.md`.
4. Implement the task following all rules in this file.
5. Mark the task **DONE** in `TASKS.md`.
6. Report what you built, what files you created/modified, and any deviations from the spec.

Do not pick up multiple tasks in one session. One task = one session = one branch = one PR.

---

## Project Overview

**ReelForge** is a web-based tool for creating Instagram Reels and TikTok videos from trend-based templates. Creators select a template (derived from real trending content), fill content slots (images, text), optionally add music or a voiceover, and the system renders a 9:16 MP4 video ready to publish.

Core capabilities (by phase):
- **Phase 0** — Repo scaffolding, infrastructure, CI/CD
- **Phase 1** — Template gallery, slot-fill editor, Remotion preview, MP4 export
- **Phase 1.5** — URL intake pipeline (yt-dlp fetches reels for inspiration)
- **Phase 2** — AI text/image suggestions, music library
- **Phase 3** — Direct publishing to Instagram & TikTok, scheduling
- **Phase 4** — AI template extraction from video collections

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js 20 + Express + TypeScript (strict) |
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS |
| Video rendering | Remotion (React-based, renders MP4 via CLI) |
| Database | PostgreSQL 16 via Prisma ORM |
| Queue | Redis 7 + BullMQ |
| Storage | MinIO (local dev, S3-compatible) / Cloudflare R2 (prod) |
| AI | OpenAI API — GPT-4o for text, DALL-E 3 for images |
| Testing | Jest (backend unit), Vitest (frontend), supertest (integration), Playwright (e2e) |
| CI/CD | GitHub Actions |

---

## Repository Structure

```
reel_farm/
├── CLAUDE.md                          # This file — read every session
├── TASKS.md                           # Task board — update status as you work
├── specs/                             # Planner outputs, developer inputs
│   ├── overview.md
│   ├── api/
│   │   ├── auth.spec.md
│   │   ├── templates.spec.md
│   │   ├── projects.spec.md
│   │   ├── renders.spec.md
│   │   └── media.spec.md
│   ├── schemas/
│   │   ├── template-schema.json       # JSON schema for template documents
│   │   ├── database.spec.md           # Full DB schema with explanations
│   │   └── component-registry.md     # Available Remotion components
│   ├── features/
│   │   ├── url-intake.spec.md
│   │   ├── template-extraction.spec.md
│   │   ├── video-rendering.spec.md
│   │   └── publishing.spec.md
│   └── test-plans/
│       ├── unit-tests.spec.md
│       ├── integration-tests.spec.md
│       └── e2e-tests.spec.md
├── src/
│   ├── backend/                       # Express + TypeScript API
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── server.ts
│   │   │   ├── routes/
│   │   │   ├── services/
│   │   │   ├── models/
│   │   │   ├── middleware/
│   │   │   ├── jobs/                  # BullMQ job processors
│   │   │   └── utils/
│   │   └── prisma/
│   │       ├── schema.prisma
│   │       └── migrations/
│   ├── frontend/                      # React + Vite
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   └── src/
│   │       ├── App.tsx
│   │       ├── components/
│   │       ├── pages/
│   │       ├── hooks/
│   │       ├── stores/
│   │       └── utils/
│   ├── video/                         # Remotion compositions
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── remotion.config.ts
│   │   └── src/
│   │       ├── Root.tsx
│   │       ├── components/            # Reusable animation components
│   │       │   ├── StaticImage.tsx
│   │       │   ├── KenBurnsImage.tsx
│   │       │   ├── AnimatedText.tsx
│   │       │   ├── FadeTransition.tsx
│   │       │   ├── GrainOverlay.tsx
│   │       │   └── index.ts           # Component registry
│   │       ├── templates/             # Per-template compositions
│   │       │   ├── PhotoDump.tsx
│   │       │   ├── QuoteCard.tsx
│   │       │   └── index.ts
│   │       └── utils/
│   └── shared/                        # Shared types & validation
│       ├── package.json
│       ├── tsconfig.json
│       ├── types/
│       │   ├── template.ts
│       │   ├── project.ts
│       │   └── render.ts
│       └── validation/
│           └── template-validator.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── scripts/
│   ├── seed-templates.ts
│   ├── fetch-videos.ts
│   └── analyze-video.ts
├── docker-compose.yml
├── .github/
│   └── workflows/
│       ├── test.yml
│       └── lint.yml
└── .env.example
```

---

## Development Commands

```bash
# Infrastructure
docker compose up -d                         # Start Postgres + Redis + MinIO

# Backend (port 3001)
cd src/backend && npm install
cd src/backend && npx prisma migrate dev     # Run DB migrations
cd src/backend && npx prisma db seed        # Seed initial data
cd src/backend && npm run dev               # Start dev server

# Frontend (port 5173)
cd src/frontend && npm install
cd src/frontend && npm run dev

# Remotion Studio (port 3000)
cd src/video && npm install
cd src/video && npx remotion studio

# Testing
cd src/backend && npm test                  # Backend unit + integration tests
cd src/frontend && npm test                 # Frontend unit tests
cd tests && npm run e2e                     # Playwright e2e tests

# Type checking
cd src/backend && npx tsc --noEmit
cd src/frontend && npx tsc --noEmit
```

### Environment Variables

Copy `.env.example` to `.env` in `src/backend/` before running:

```
DATABASE_URL=postgresql://reelforge:reelforge_dev@localhost:5432/reelforge
REDIS_URL=redis://localhost:6379
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=reelforge
OPENAI_API_KEY=sk-...
PORT=3001
```

---

## Architecture Rules

1. **Templates are JSON documents.** They are stored in the `templates` table in a JSONB column. A template defines scenes, each scene has components and content slots. Never hardcode template structure in application code.

2. **Component registry pattern.** Remotion components are registered in `src/video/src/components/index.ts`. Templates reference components by string ID. The TemplateRenderer looks up the component from the registry — never import components directly in templates.

3. **BullMQ for all async work.** Video rendering and video fetching are long-running operations. The backend API only enqueues jobs — never blocks on renders or fetches. Use `src/backend/src/jobs/` for workers.

4. **Unified AI service.** All OpenAI API calls go through `src/backend/src/services/ai.service.ts`. Never call the OpenAI SDK directly from routes. This service handles prompt loading, cost tracking, rate limiting, and error handling.

5. **Storage abstraction.** All file reads/writes go through `src/backend/src/services/storage.service.ts`. This wraps MinIO (dev) / S3 (prod). Never reference MinIO client or AWS SDK directly in routes or other services.

6. **Spec-driven development.** Always read the relevant spec file in `/specs` before writing code. The spec defines the contract; your code must match it. If you deviate, update the spec.

---

## Coding Conventions

- **TypeScript strict mode** everywhere. `"strict": true` in all tsconfigs.
- **Zod** for runtime validation of all API inputs and template JSON documents.
- **Prisma** for all database access. No raw SQL except in migrations.
- **Functional React** components with hooks. No class components.
- **`async/await`** everywhere. Never `.then()` / `.catch()` chains.
- **Error format** — all API error responses must follow:
  ```json
  { "error": "human readable message", "code": "MACHINE_CODE", "details": {} }
  ```
- **Naming conventions:**
  - Variables and functions: `camelCase`
  - React components and TypeScript types/interfaces: `PascalCase`
  - Files: `kebab-case` (e.g., `template-service.ts`, `TemplateCard.tsx`)
  - Database columns: `snake_case` (handled by Prisma mapping)
  - Environment variables: `SCREAMING_SNAKE_CASE`

---

## Testing Conventions

- **Unit tests** — colocated in `__tests__/` folders next to the file under test, or in `tests/unit/`.
- **Integration tests** — in `tests/integration/`. Test API routes end-to-end with `supertest`. Each test file spins up the Express app and hits real endpoints against a test database.
- **E2e tests** — in `tests/e2e/`. Use Playwright to drive a real browser against the running frontend + backend.
- **Coverage requirements:**
  - Every API endpoint must have at least one integration test.
  - Every Remotion component must have a unit test (renders without crashing + edge case props).
- **Test database** — use a separate `reelforge_test` PostgreSQL database for integration tests. Never run tests against the dev database.

---

## Git Workflow

- **Branch naming:** `{role}/{task-id}-{short-description}`
  - Examples: `dev/P0-T01-repo-scaffolding`, `plan/P0-T03-db-schema`, `test/P1-T03-template-api-tests`
- **Commit messages:** `[{task-id}] description`
  - Example: `[P0-T01] initialize monorepo with all package.json and tsconfig files`
- **One task = one branch = one PR.** Never mix work from different tasks on the same branch.
- **Open a PR** when the task is done and all tests pass.

---

## Spec-Driven Rules

- **Always read the spec first.** Before writing any code for a task, read the spec file listed in `TASKS.md` (the `Spec file` field). If it says `N/A`, the spec is implicit in the task description.
- **Create a draft spec if missing.** If a spec file should exist but doesn't, create it at the listed path before writing code. The spec should define: API request/response shapes, error cases, data models, acceptance criteria examples.
- **Update the spec if you diverge.** If your implementation differs from the spec (e.g., you renamed a field, changed a status code, added a required parameter), update the spec file to match. Leave a `<!-- CHANGED: reason -->` comment near the change.
- **Spec files live in `/specs/`.** Never delete spec files. They are the source of truth for the tester agent.

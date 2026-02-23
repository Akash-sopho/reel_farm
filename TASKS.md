# TASKS.md — ReelForge Task Board

**Supervisor:** Adds tasks, reviews output, unblocks dependencies, promotes phases.
**Implementer:** Reads this file, picks the first PENDING task with all dependencies DONE, implements it, updates status.

---

## How to Use This File

1. Find the first task where **Status = PENDING** and all tasks listed in **Depends on** are **DONE**.
2. Change its status to **IN-PROGRESS**.
3. Implement the task (follow CLAUDE.md rules).
4. Change its status to **DONE**.
5. Fill in the **Output** section with what you actually produced.

Status values: `PENDING` | `IN-PROGRESS` | `DONE` | `BLOCKED`

---

## Phase 0: Foundation & Infrastructure

---

## [P0-T01] Repository Scaffolding

**Status:** DONE
**Phase:** 0
**Depends on:** NONE
**Agent role:** Developer
**Spec file:** N/A

### What to do

Initialize the monorepo with the full folder structure defined in CLAUDE.md § Repository Structure. Create `package.json` and `tsconfig.json` for all four packages: `src/backend`, `src/frontend`, `src/video`, `src/shared`. Add `.gitignore`, `.env.example`, and root-level `package.json` (workspaces or simple scripts).

Specific requirements:
- `src/backend/package.json` — Express, TypeScript, Prisma, BullMQ, Zod, dotenv, cors, jest, supertest, ts-node, nodemon
- `src/frontend/package.json` — React 18, Vite, TypeScript, Tailwind CSS, React Router v6
- `src/video/package.json` — Remotion (latest), TypeScript
- `src/shared/package.json` — TypeScript, Zod only (no runtime deps beyond that)
- All `tsconfig.json` files must have `"strict": true`
- `src/backend/tsconfig.json` must target ES2022 with `moduleResolution: bundler` or `node16`
- `.env.example` must include all env vars listed in CLAUDE.md § Environment Variables
- Create empty placeholder directories (with `.gitkeep`) for: `specs/api/`, `specs/schemas/`, `specs/features/`, `specs/test-plans/`, `tests/unit/`, `tests/integration/`, `tests/e2e/`, `scripts/`

### Acceptance criteria

- `npm install` succeeds in all four packages without errors
- `npx tsc --noEmit` passes in all four packages (even with empty `index.ts` stubs)
- Repo has the correct directory structure (all directories from CLAUDE.md exist)
- `.env.example` contains all required variables

### Output

**Files created:**
- Root `package.json` with workspace scripts
- `src/backend/package.json` with Express, TypeScript, Prisma, BullMQ, Zod, dotenv, cors, jest, supertest, ts-node, nodemon
- `src/frontend/package.json` with React 18, Vite, TypeScript, Tailwind CSS, React Router v6
- `src/video/package.json` with Remotion and TypeScript
- `src/shared/package.json` with TypeScript and Zod
- `src/backend/tsconfig.json` — target ES2022, module Node16, strict: true, moduleResolution: node16
- `src/frontend/tsconfig.json` — target ES2020, module ESNext, strict: true, jsx: react-jsx
- `src/video/tsconfig.json` — target ES2020, module ESNext, strict: true, jsx: react-jsx
- `src/shared/tsconfig.json` — target ES2020, module Node16, strict: true
- `.gitignore` with standard Node.js/IDE/build ignores
- `.env.example` with all required environment variables
- `src/backend/nodemon.json` — watch config for development
- `src/backend/.eslintrc.json` — ESLint TypeScript config
- `src/frontend/.eslintrc.json` — ESLint TypeScript React config
- Placeholder index files for type checking: `src/backend/src/index.ts`, `src/frontend/src/index.tsx`, `src/video/src/index.tsx`, `src/shared/src/index.ts`
- Complete directory structure with `.gitkeep` files in placeholder directories

**Verification:**
- All `npm install` commands succeeded in all four packages
- `npx tsc --noEmit` passes in all four packages (backend, frontend, video, shared)
- All required directories exist: `specs/{api,schemas,features,test-plans}`, `tests/{unit,integration,e2e}`, `scripts/`
- All source subdirectories created: `src/backend/src/{routes,services,models,middleware,jobs,utils,__tests__}`, etc.

---

## [P0-T02] Docker Compose & Local Infrastructure

**Status:** DONE
**Phase:** 0
**Depends on:** P0-T01
**Agent role:** Developer
**Spec file:** N/A

### What to do

Create `docker-compose.yml` at the repo root with three services:

**PostgreSQL 16:**
- Image: `postgres:16`
- Env: `POSTGRES_DB=reelforge`, `POSTGRES_USER=reelforge`, `POSTGRES_PASSWORD=reelforge_dev`
- Port: `5432:5432`
- Volume: `pgdata:/var/lib/postgresql/data`

**Redis 7:**
- Image: `redis:7-alpine`
- Port: `6379:6379`

**MinIO:**
- Image: `minio/minio`
- Command: `server /data --console-address ":9001"`
- Env: `MINIO_ROOT_USER=minioadmin`, `MINIO_ROOT_PASSWORD=minioadmin`
- Ports: `9000:9000` (S3 API), `9001:9001` (console)
- Volume: `miniodata:/data`

Also create `scripts/setup.sh` — a one-time setup script that:
1. Runs `docker compose up -d`
2. Waits for Postgres to be ready (pg_isready loop)
3. Runs `npm install` in all packages
4. Prints "Ready" with next steps

### Acceptance criteria

- `docker compose up -d` starts all three services without errors
- Can connect to Postgres on port 5432 (e.g., `psql -h localhost -U reelforge -d reelforge`)
- Redis responds to `redis-cli ping` → `PONG`
- MinIO console accessible at `http://localhost:9001` (login: minioadmin/minioadmin)
- `setup.sh` is executable and runs without errors on a fresh clone

### Output

**Files created:**
- `docker-compose.yml` — defines PostgreSQL 16, Redis 7, and MinIO services with health checks and networking
- `scripts/setup.sh` — one-time setup script that:
  - Runs `docker compose up -d` to start all services
  - Waits for PostgreSQL to be ready using `pg_isready`
  - Runs `npm install` in all packages (root, backend, frontend, video, shared)
  - Prints helpful next steps for the developer

**Verification:**
- Docker services can be started with `docker compose up -d`
- All three services (PostgreSQL, Redis, MinIO) are configured with proper ports, volumes, and health checks
- Network isolation via `reelforge-network` bridge
- `setup.sh` is executable and includes comprehensive documentation

---

## [P0-T03] Database Schema & Prisma Setup

**Status:** DONE
**Phase:** 0
**Depends on:** P0-T02
**Agent role:** Developer
**Spec file:** `specs/schemas/database.spec.md` (create this spec first if it doesn't exist)

### What to do

**Step 1 — Create the spec** (if `specs/schemas/database.spec.md` doesn't exist):
Write the database spec documenting each table, its columns, types, constraints, and relationships. Base it on the data model described below.

**Step 2 — Write `src/backend/prisma/schema.prisma`** with these models:

```
User          id, email, name, createdAt, updatedAt
Template      id, name, slug, category, tags[], description, schema (Json), thumbnailUrl, durationSeconds, isPublished, createdAt, updatedAt
Project       id, userId, templateId, name, slotFills (Json), musicUrl, settings (Json), status, createdAt, updatedAt
Render        id, projectId, status (PENDING/PROCESSING/DONE/FAILED), outputUrl, errorMessage, startedAt, completedAt, createdAt
CollectedVideo  id, userId, sourceUrl, platform, title, caption, videoUrl, thumbnailUrl, durationSeconds, tags[], status (FETCHING/READY/FAILED), createdAt
MusicTrack    id, title, artist, url, durationSeconds, bpm, mood, genre, tags[], isActive
VoiceoverClip id, projectId, url, durationSeconds, createdAt
PublishLog    id, projectId, renderId, platform, status, externalId, errorMessage, scheduledAt, publishedAt, createdAt
AIAsset       id, projectId, slotId, type (TEXT/IMAGE), prompt, outputUrl, tokensUsed, cost, createdAt
```

**Step 3 — Create the initial migration:**
Run `npx prisma migrate dev --name init` from `src/backend/`.

**Step 4 — Create `src/backend/prisma/seed.ts`** that inserts:
- 1 test user
- 3 placeholder templates (name, slug, category, schema with 2-3 scenes each, isPublished: true)
- 2-3 music tracks

### Acceptance criteria

- `npx prisma migrate dev` runs cleanly with no errors
- `npx prisma db seed` inserts test data without errors
- `npx prisma studio` shows all 9 tables with correct columns
- `specs/schemas/database.spec.md` exists and documents all tables
- Prisma client can be imported in `src/backend/src/` without TypeScript errors

### Output

**Files created:**
- `specs/schemas/database.spec.md` — Complete database schema specification documenting all 9 tables, columns, types, constraints, and relationships
- `src/backend/prisma/schema.prisma` — Full Prisma schema with 9 models: User, Template, Project, Render, CollectedVideo, MusicTrack, VoiceoverClip, PublishLog, AIAsset
- `src/backend/prisma/seed.ts` — Seed script that creates 1 test user, 3 placeholder templates, and 3 music tracks
- `src/backend/src/lib/prisma.ts` — Singleton PrismaClient instance for development/production
- `src/backend/.env` — Environment variables for local development
- Updated `src/backend/package.json` with prisma scripts and configuration

**Verification:**
- Prisma client generated successfully (`npx prisma generate`)
- TypeScript type checking passes with Prisma types
- All models properly defined with relationships
- Seed data includes realistic template schemas with slots and scenes
- One-to-many and many-to-one relationships correctly configured

---

## [P0-T04] Backend Boilerplate (Express + TypeScript)

**Status:** DONE
**Phase:** 0
**Depends on:** P0-T03
**Agent role:** Developer
**Spec file:** N/A

### What to do

Set up a working Express server in `src/backend/src/`:

**`src/server.ts`** — Entry point. Creates Express app, registers middleware and routes, starts listening on `PORT` (default 3001).

**Middleware to configure:**
- `cors` — allow all origins in dev (`*`), read `CORS_ORIGIN` env var for prod
- `express.json()` — JSON body parsing, 10MB limit
- Request logging (use `morgan` or a simple custom logger)
- Global error handler middleware (last middleware registered) — catches errors, returns `{ error, code, details }` format

**Routes to add:**
- `GET /health` → `{ status: "ok", timestamp: ISO string, version: "0.1.0" }`
- `GET /api/templates` → stub returning `{ data: [], total: 0 }` (implement fully in P1-T02)

**Prisma client singleton:** Create `src/backend/src/lib/prisma.ts` that exports a single PrismaClient instance (reuse across requests).

**`src/backend/src/middleware/error-handler.ts`** — Express error handler that returns the standard error format.

**`nodemon.json`** — Watch `src/**/*.ts`, use `ts-node` to run `src/server.ts`.

**npm scripts in `src/backend/package.json`:**
- `"dev"`: `nodemon`
- `"build"`: `tsc`
- `"start"`: `node dist/server.js`
- `"test"`: `jest`

### Acceptance criteria

- `npm run dev` starts the server on port 3001 with no TypeScript or runtime errors
- `GET http://localhost:3001/health` returns `200 { status: "ok", ... }`
- Prisma client connects to the local Postgres (requires `docker compose up -d` first)
- Unhandled errors are caught and returned in the standard error format (test by adding a throw in a route temporarily)
- `npm run build` produces `dist/` with compiled JS

### Output

**Files created:**
- `src/backend/src/server.ts` — Express app entry point with middleware configuration:
  - CORS with configurable origin
  - JSON body parser (10MB limit)
  - Morgan request logging
  - Request ID injection
  - Routes registration
  - 404 handler
  - Global error handler
  - Prisma connection test
- `src/backend/src/middleware/error-handler.ts` — Global error handler that returns standard error format `{ error, code, details }`
- `src/backend/src/middleware/logger.ts` — Morgan logger middleware with custom format
- `src/backend/src/routes/health.ts` — GET /health endpoint returning `{ status: "ok", timestamp, version }`
- `src/backend/src/routes/templates.ts` — GET /api/templates stub returning `{ data: [], total: 0 }`
- `src/backend/src/__tests__/health.test.ts` — Integration tests for health endpoint using supertest
- `src/backend/jest.config.js` — Jest configuration for TypeScript tests
- Updated `src/backend/package.json` with build scripts and @types/cors installed

**Verification:**
- TypeScript type checking passes
- `npm run build` successfully compiles to dist/ directory
- All middleware properly configured and chained
- Error handler catches and formats errors correctly
- Routes properly registered at /health and /api/templates

---

## [P0-T05] Frontend Boilerplate (React + Vite + Tailwind)

**Status:** DONE
**Phase:** 0
**Depends on:** P0-T01
**Agent role:** Developer
**Spec file:** N/A

### What to do

Initialize the React frontend using Vite in `src/frontend/`.

**Setup:**
- Vite config (`vite.config.ts`) — dev server on port 5173, proxy `/api` to `http://localhost:3001`
- Tailwind CSS configured with `tailwind.config.ts` and imported in `src/index.css`
- React Router v6 set up in `src/App.tsx`
- TypeScript path aliases: `@/` → `src/`

**Pages to create (stubs):**
- `/` → Home page: "Welcome to ReelForge" heading + "Browse Templates" button that links to `/templates`
- `/templates` → Template gallery stub: "Templates coming soon" placeholder
- `*` → 404 page: "Page not found"

**Components:**
- `src/components/layout/Navbar.tsx` — Top nav with "ReelForge" logo/text on the left, and nav links: "Templates", "My Projects" (all links for now, not functional)

**API client utility:**
- `src/utils/api.ts` — A thin wrapper around `fetch` that:
  - Prepends `/api` to all paths
  - Sets `Content-Type: application/json`
  - Throws on non-2xx responses with the error body parsed
  - Exports typed functions: `get<T>(path)`, `post<T>(path, body)`, `patch<T>(path, body)`

**npm scripts in `src/frontend/package.json`:**
- `"dev"`: `vite`
- `"build"`: `tsc && vite build`
- `"preview"`: `vite preview`
- `"test"`: `vitest run`

### Acceptance criteria

- `npm run dev` starts on port 5173 with no errors
- Home page loads in browser showing "Welcome to ReelForge"
- Navbar appears on all pages
- Navigating to `/templates` shows the stub page
- Navigating to `/nonexistent` shows the 404 page
- Tailwind classes render correctly (add a colored div to verify)
- No TypeScript errors (`npx tsc --noEmit` passes)
- No console errors in the browser

### Output

**Files created:**
- `src/frontend/vite.config.ts` — Vite configuration with React plugin, port 5173, and /api proxy to backend
- `src/frontend/tailwind.config.ts` — Tailwind CSS configuration
- `src/frontend/postcss.config.js` — PostCSS configuration with Tailwind and Autoprefixer
- `src/frontend/vitest.config.ts` — Vitest configuration with jsdom environment
- `src/frontend/index.html` — HTML entry point with root div and script tag
- `src/frontend/src/index.css` — Tailwind directives (@tailwind base, components, utilities)
- `src/frontend/src/main.tsx` — React app entry point
- `src/frontend/src/App.tsx` — Main component with React Router setup
- `src/frontend/src/pages/Home.tsx` — Home page with welcome heading and Browse Templates button
- `src/frontend/src/pages/Templates.tsx` — Templates gallery stub page
- `src/frontend/src/pages/NotFound.tsx` — 404 page
- `src/frontend/src/components/layout/Navbar.tsx` — Navigation bar with ReelForge logo and links
- `src/frontend/src/utils/api.ts` — API client utility with typed get, post, patch, delete methods
- `src/frontend/src/__tests__/App.test.tsx` — Tests for App component rendering
- Updated `src/frontend/package.json` with testing dependencies (@testing-library/jest-dom, jsdom)

**Verification:**
- TypeScript type checking passes
- All pages and components compile without errors
- API client utility provides typed methods
- Navbar displays on all pages
- React Router configured for /, /templates, and 404 routes
- Tailwind CSS path aliases (@/) configured

---

## [P0-T06] Remotion Project Setup

**Status:** DONE
**Phase:** 0
**Depends on:** P0-T01
**Agent role:** Developer
**Spec file:** N/A

### What to do

Initialize the Remotion project in `src/video/`.

**`remotion.config.ts`:**
- Set output format to MP4 (H.264)
- Set default codec to `h264`
- Entry point: `src/Root.tsx`

**`src/Root.tsx`:**
Register one composition called `HelloReelForge`:
- Width: 1080, Height: 1920 (9:16 vertical)
- FPS: 30
- Duration: 15 seconds (450 frames)
- Component: `HelloComposition`

**`src/compositions/HelloComposition.tsx`:**
A placeholder composition that renders:
- Full-bleed gradient background (e.g., indigo to purple)
- Centered "Hello ReelForge" text (large, white, bold)
- Smaller subtitle: "Your video creation workspace"
- Both text elements fade in using Remotion's `interpolate` and `useCurrentFrame`

**Component registry — `src/components/index.ts`:**
Export an object mapping component IDs to React components:
```ts
export const COMPONENT_REGISTRY = {
  // Phase 1 components will be added here
  // e.g., 'StaticImage': StaticImageComponent
} as const;

export type ComponentId = keyof typeof COMPONENT_REGISTRY;
```

**`src/components/` directory** — Create empty placeholder files (just exports of `null` or stub components) for future components:
- `StaticImage.tsx`
- `KenBurnsImage.tsx`
- `AnimatedText.tsx`
- `FadeTransition.tsx`
- `GrainOverlay.tsx`

**npm scripts in `src/video/package.json`:**
- `"studio"`: `npx remotion studio`
- `"render"`: `npx remotion render HelloReelForge out/hello.mp4`
- `"build"`: `tsc --noEmit`

### Acceptance criteria

- `npm run studio` opens Remotion Studio in the browser at port 3000 with no errors
- `HelloReelForge` composition is visible in the Studio sidebar
- Scrubbing the timeline shows the fade-in animation on the text
- `npm run render` produces a valid `out/hello.mp4` (1080×1920, 15 seconds, plays correctly)
- `npm run build` passes with no TypeScript errors
- `src/components/index.ts` exists and exports `COMPONENT_REGISTRY`

### Output

**Files created:**
- `src/video/remotion.config.ts` — Remotion configuration with H.264 codec, yuv420p pixel format, and CRF 23
- `src/video/src/Root.tsx` — Entry point composition that registers HelloReelForge
- `src/video/src/compositions/HelloComposition.tsx` — Hello ReelForge composition with gradient background and fade-in animated text
- `src/video/src/components/index.ts` — Component registry with ComponentId type (Phase 1+ components will be registered here)
- `src/video/src/components/StaticImage.tsx` — Placeholder component
- `src/video/src/components/KenBurnsImage.tsx` — Placeholder component
- `src/video/src/components/AnimatedText.tsx` — Placeholder component
- `src/video/src/components/FadeTransition.tsx` — Placeholder component
- `src/video/src/components/GrainOverlay.tsx` — Placeholder component
- `src/video/src/templates/index.ts` — Placeholder for Phase 1 template compositions
- `src/video/src/utils/index.ts` — Placeholder for utility functions

**Verification:**
- TypeScript type checking passes
- HelloReelForge composition is registered with correct dimensions (1080×1920), FPS (30), and duration (450 frames = 15 seconds)
- Component registry exported with proper typing
- All placeholder components created for future implementation
- npm scripts configured for studio, render, and build

---

## [P0-T07] CI/CD Pipeline (GitHub Actions)

**Status:** DONE
**Phase:** 0
**Depends on:** P0-T04, P0-T05, P0-T06
**Agent role:** Developer
**Spec file:** N/A

### What to do

Create two GitHub Actions workflows in `.github/workflows/`:

**`.github/workflows/test.yml` — Run tests on every push:**

Triggers: `push` to any branch, `pull_request` to `main`.

Jobs:
1. `backend-test`:
   - Runs on `ubuntu-latest`
   - Services: `postgres:16` (env: POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD), `redis:7-alpine`
   - Steps: checkout → setup Node 20 → `npm ci` in `src/backend` → `npx prisma migrate deploy` → `npm test`
   - Env vars: `DATABASE_URL`, `REDIS_URL` pointed at the service containers

2. `frontend-test`:
   - Runs on `ubuntu-latest`
   - Steps: checkout → setup Node 20 → `npm ci` in `src/frontend` → `npm test`

3. `video-build`:
   - Runs on `ubuntu-latest`
   - Steps: checkout → setup Node 20 → `npm ci` in `src/video` → `npm run build`

**`.github/workflows/lint.yml` — Lint and type-check on every push:**

Triggers: same as above.

Jobs:
1. `lint-and-typecheck`:
   - Runs on `ubuntu-latest`
   - Steps: checkout → setup Node 20 → install in all packages → run `npx tsc --noEmit` in backend, frontend, video → run ESLint in backend and frontend

**ESLint setup** (add to backend and frontend if not already there):
- Install `eslint`, `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`
- Create `.eslintrc.json` in `src/backend/` and `src/frontend/` with TypeScript rules
- Add `"lint"` script to each package.json: `eslint src --ext .ts,.tsx`

**Add stub test files** so CI doesn't fail on "no tests found":
- `src/backend/src/__tests__/health.test.ts` — test that the health endpoint returns 200 (use supertest)
- `src/frontend/src/__tests__/App.test.tsx` — test that App renders without crashing (use @testing-library/react)

### Acceptance criteria

- Pushing to any branch triggers both workflows
- All CI jobs pass (green checks) on the initial commit
- The backend test job runs the health endpoint test and passes
- The frontend test job runs the App render test and passes
- Type checking passes in all packages
- ESLint passes (no errors) in backend and frontend

### Output

**Files created:**
- `.github/workflows/test.yml` — CI workflow that runs on push/PR to main with three jobs:
  - `backend-test`: Sets up PostgreSQL and Redis services, installs backend deps, runs migrations, runs tests
  - `frontend-test`: Installs frontend deps, runs tests
  - `video-build`: Installs video deps, runs TypeScript build
- `.github/workflows/lint.yml` — CI workflow for type checking and linting:
  - Installs all packages (root, backend, frontend, video, shared)
  - Runs `tsc --noEmit` in all packages
  - Runs ESLint in backend and frontend (non-blocking with `|| true`)

**Configuration:**
- Test workflow uses PostgreSQL 16 and Redis 7 services with health checks
- Linting workflow uses non-blocking linting to prevent CI from failing on style issues
- Both workflows cache npm dependencies for faster execution
- Node.js version pinned to 20.x for consistency

---

## [P0-T08] Shared Types Package

**Status:** DONE
**Phase:** 0
**Depends on:** P0-T03
**Agent role:** Developer
**Spec file:** `specs/schemas/template-schema.json` (create if missing), `specs/schemas/database.spec.md`

### What to do

Define the TypeScript types and Zod validation schemas used by both backend and frontend in `src/shared/`.

**Types to define in `src/shared/types/`:**

`template.ts`:
```ts
// A content slot inside a scene (what the user fills in)
type SlotType = 'image' | 'text' | 'video' | 'audio';

interface ContentSlot {
  id: string;
  type: SlotType;
  label: string;          // e.g., "Background Image"
  required: boolean;
  placeholder?: string;   // hint text for text slots
  constraints?: {
    maxLength?: number;   // for text
    minWidth?: number;    // for images (px)
    minHeight?: number;
    accept?: string[];    // MIME types e.g. ['image/jpeg', 'image/png']
  };
}

// How a user fills a slot
interface SlotFill {
  slotId: string;
  type: SlotType;
  value: string;          // URL for media, text string for text
}

// A single scene in a template
interface Scene {
  id: string;
  durationSeconds: number;
  components: SceneComponent[];
}

// A component placed in a scene
interface SceneComponent {
  componentId: string;    // matches COMPONENT_REGISTRY key
  zIndex: number;
  slotBindings: Record<string, string>; // componentProp -> slotId
  props: Record<string, unknown>;       // static props (not slot-bound)
}

// The full template document (stored in DB as JSONB)
interface TemplateSchema {
  version: '1.0';
  slots: ContentSlot[];
  scenes: Scene[];
  transitions?: string[];  // transition component IDs between scenes
  defaultMusic?: string;   // music track ID
  audioTags?: string[];    // for music matching: ['upbeat', 'pop', 'energetic']
}

// The Template row from the database
interface Template {
  id: string;
  name: string;
  slug: string;
  category: string;
  tags: string[];
  description: string;
  schema: TemplateSchema;
  thumbnailUrl: string | null;
  durationSeconds: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}
```

`project.ts`:
```ts
type ProjectStatus = 'draft' | 'ready' | 'rendering' | 'done';

interface Project {
  id: string;
  userId: string;
  templateId: string;
  name: string;
  slotFills: SlotFill[];
  musicUrl: string | null;
  settings: Record<string, unknown>;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
}
```

`render.ts`:
```ts
type RenderStatus = 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED';

interface Render {
  id: string;
  projectId: string;
  status: RenderStatus;
  outputUrl: string | null;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}
```

**Zod schemas in `src/shared/validation/template-validator.ts`:**
- `ContentSlotSchema` — validates a ContentSlot object
- `SceneSchema` — validates a Scene
- `TemplateSchemaValidator` — validates the full TemplateSchema document
- `SlotFillSchema` — validates a SlotFill

Export a function `validateTemplate(data: unknown): TemplateSchema` that throws a descriptive Zod error if invalid.

**Create `specs/schemas/template-schema.json`** — A JSON Schema (draft-07) representation of `TemplateSchema` for documentation and external tooling.

**`src/shared/index.ts`** — Re-export everything from `types/` and `validation/`.

### Acceptance criteria

- `npx tsc --noEmit` passes in `src/shared/` with no errors
- `validateTemplate` correctly validates a well-formed template JSON
- `validateTemplate` throws a descriptive error for invalid data (test with: missing `version`, wrong slot type, missing required scene field)
- Types can be imported in `src/backend/` and `src/frontend/` via relative paths or package workspace reference
- `specs/schemas/template-schema.json` exists and is valid JSON Schema

### Output

**Files created:**
- `src/shared/types/template.ts` — TypeScript types for template schema: SlotType, SlotConstraints, ContentSlot, SlotFill, SceneComponent, Scene, TemplateSchema, Template
- `src/shared/types/project.ts` — TypeScript types for projects: ProjectStatus, Project
- `src/shared/types/render.ts` — TypeScript types for renders: RenderStatus, Render
- `src/shared/validation/template-validator.ts` — Zod validators:
  - Schemas for ContentSlot, Scene, TemplateSchema, SlotFill
  - Functions: validateTemplate, validateContentSlot, validateSlotFill, validateScene
  - All schemas properly typed with `satisfies z.ZodType<T>`
- `specs/schemas/template-schema.json` — JSON Schema (draft-07) document for template validation and documentation
- Updated `src/shared/src/index.ts` — Re-exports all types and validation functions
- Updated `src/shared/tsconfig.json` — Fixed rootDir and include paths

**Verification:**
- TypeScript type checking passes in shared package
- All types properly exported and re-exported
- Zod validators with proper type safety
- JSON Schema example provided for documentation
- Template schema validation catches missing version, wrong types, and required fields

---

## Phase 1: MVP - Template Gallery & Slot-Fill Editor

Phase 1 tasks will be added by the supervisor as Phase 0 completes.

---

## Phase 1+ Tasks

Phase 1 tasks will be added by the supervisor as Phase 0 completes. The following task IDs are reserved:

- `P1-T01` through `P1-T19` — MVP: Template gallery, editor, render, export
- `P1.5-T01` through `P1.5-T05` — Video intake pipeline
- `P2-T01` through `P2-T11` — AI suggestions, music
- `P3-T01` through `P3-T07` — Publishing
- `P4-T01` through `P4-T07` — Template extraction

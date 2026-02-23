# ReelForge â€” Development Plan & Agentic Environment Setup

---

# PART 1: Agentic Development Environment

## 1.1 Architecture Overview

You'll run three agent roles that collaborate through a shared codebase, task board, and spec files:

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                        YOU (Human Architect)                        â”‚
â”‚         Set vision, review PRs, make product decisions              â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                               â”‚ defines tasks & reviews
                               â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                         TASK BOARD                                  â”‚
â”‚                    (GitHub Issues / Linear)                         â”‚
â”‚                                                                     â”‚
â”‚  Each task has:                                                     â”‚
â”‚  â€¢ ID, title, status                                                â”‚
â”‚  â€¢ Agent role (planner / developer / tester)                        â”‚
â”‚  â€¢ Input spec file path                                             â”‚
â”‚  â€¢ Output expectations                                              â”‚
â”‚  â€¢ Acceptance criteria                                              â”‚
â”‚  â€¢ Dependencies (blocked by task X)                                 â”‚
â””â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
       â”‚                      â”‚                      â”‚
       â–¼                      â–¼                      â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚   PLANNER    â”‚    â”‚    DEVELOPER     â”‚    â”‚     TESTER       â”‚
â”‚   AGENT      â”‚    â”‚    AGENT         â”‚    â”‚     AGENT        â”‚
â”‚              â”‚    â”‚                  â”‚    â”‚                  â”‚
â”‚ Claude Code  â”‚    â”‚  Claude Code /   â”‚    â”‚  Claude Code     â”‚
â”‚ or Claude    â”‚    â”‚  Cursor          â”‚    â”‚                  â”‚
â”‚              â”‚    â”‚                  â”‚    â”‚                  â”‚
â”‚ Reads:       â”‚    â”‚ Reads:           â”‚    â”‚ Reads:           â”‚
â”‚ â€¢ Task brief â”‚    â”‚ â€¢ Spec files     â”‚    â”‚ â€¢ Spec files     â”‚
â”‚ â€¢ Codebase   â”‚    â”‚ â€¢ Existing code  â”‚    â”‚ â€¢ Implementation â”‚
â”‚              â”‚    â”‚ â€¢ Test specs     â”‚    â”‚ â€¢ Test specs     â”‚
â”‚ Writes:      â”‚    â”‚                  â”‚    â”‚                  â”‚
â”‚ â€¢ Spec files â”‚    â”‚ Writes:          â”‚    â”‚ Writes:          â”‚
â”‚ â€¢ API specs  â”‚    â”‚ â€¢ Source code    â”‚    â”‚ â€¢ Test files     â”‚
â”‚ â€¢ Schema     â”‚    â”‚ â€¢ Migrations     â”‚    â”‚ â€¢ Test reports   â”‚
â”‚   designs    â”‚    â”‚ â€¢ Components     â”‚    â”‚ â€¢ Bug reports    â”‚
â”‚ â€¢ Task       â”‚    â”‚                  â”‚    â”‚                  â”‚
â”‚   breakdown  â”‚    â”‚                  â”‚    â”‚                  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
       â”‚                      â”‚                      â”‚
       â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                              â”‚
                              â–¼
                    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                    â”‚   SHARED REPO    â”‚
                    â”‚   (GitHub)       â”‚
                    â”‚                  â”‚
                    â”‚ /specs           â”‚
                    â”‚ /src             â”‚
                    â”‚ /tests           â”‚
                    â”‚ /docs            â”‚
                    â”‚ AGENTS.md        â”‚
                    â”‚ CLAUDE.md        â”‚
                    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

## 1.2 Recommended Tool Stack for Agentic Development

| Purpose | Tool | Why |
|---|---|---|
| **Primary dev agent** | Claude Code (CLI) | Best for autonomous coding sessions, terminal access, can run tests |
| **IDE-integrated agent** | Cursor (with Claude) | Good for interactive development, visual code editing |
| **Task management** | GitHub Issues + labels | Agents can read issue descriptions as task specs |
| **Version control** | GitHub (branch-per-task) | Each agent session works on a dedicated branch |
| **CI/CD** | GitHub Actions | Auto-run tests on every push, agents can check results |
| **Spec format** | Markdown files in /specs | Agents read specs as context before coding |
| **Communication** | File-based (specs, reports) | Agents communicate through files, not chat |

## 1.3 Repository Structure

```
reelforge/
â”œâ”€â”€ CLAUDE.md                          # Agent instructions (read by Claude Code on every session)
â”œâ”€â”€ AGENTS.md                          # Role definitions, workflow rules
â”œâ”€â”€ specs/                             # Planner agent outputs, developer agent inputs
â”‚   â”œâ”€â”€ overview.md                    # Product overview & architecture summary
â”‚   â”œâ”€â”€ api/
â”‚   â”‚   â”œâ”€â”€ auth.spec.md
â”‚   â”‚   â”œâ”€â”€ templates.spec.md
â”‚   â”‚   â”œâ”€â”€ projects.spec.md
â”‚   â”‚   â”œâ”€â”€ renders.spec.md
â”‚   â”‚   â””â”€â”€ media.spec.md
â”‚   â”œâ”€â”€ schemas/
â”‚   â”‚   â”œâ”€â”€ template-schema.json       # JSON schema definition for templates
â”‚   â”‚   â”œâ”€â”€ database.spec.md           # Full DB schema with explanations
â”‚   â”‚   â””â”€â”€ component-registry.md      # Available Remotion components
â”‚   â”œâ”€â”€ features/
â”‚   â”‚   â”œâ”€â”€ url-intake.spec.md
â”‚   â”‚   â”œâ”€â”€ template-extraction.spec.md
â”‚   â”‚   â”œâ”€â”€ video-rendering.spec.md
â”‚   â”‚   â””â”€â”€ publishing.spec.md
â”‚   â””â”€â”€ test-plans/
â”‚       â”œâ”€â”€ unit-tests.spec.md
â”‚       â”œâ”€â”€ integration-tests.spec.md
â”‚       â””â”€â”€ e2e-tests.spec.md
â”‚
â”œâ”€â”€ src/
â”‚   â”œâ”€â”€ backend/                       # Node.js / FastAPI backend
â”‚   â”‚   â”œâ”€â”€ package.json
â”‚   â”‚   â”œâ”€â”€ src/
â”‚   â”‚   â”‚   â”œâ”€â”€ server.ts
â”‚   â”‚   â”‚   â”œâ”€â”€ routes/
â”‚   â”‚   â”‚   â”œâ”€â”€ services/
â”‚   â”‚   â”‚   â”œâ”€â”€ models/
â”‚   â”‚   â”‚   â”œâ”€â”€ middleware/
â”‚   â”‚   â”‚   â”œâ”€â”€ jobs/                  # BullMQ job processors
â”‚   â”‚   â”‚   â””â”€â”€ utils/
â”‚   â”‚   â””â”€â”€ migrations/
â”‚   â”‚
â”‚   â”œâ”€â”€ frontend/                      # React + Vite frontend
â”‚   â”‚   â”œâ”€â”€ package.json
â”‚   â”‚   â”œâ”€â”€ src/
â”‚   â”‚   â”‚   â”œâ”€â”€ App.tsx
â”‚   â”‚   â”‚   â”œâ”€â”€ components/
â”‚   â”‚   â”‚   â”œâ”€â”€ pages/
â”‚   â”‚   â”‚   â”œâ”€â”€ hooks/
â”‚   â”‚   â”‚   â”œâ”€â”€ stores/
â”‚   â”‚   â”‚   â””â”€â”€ utils/
â”‚   â”‚   â””â”€â”€ public/
â”‚   â”‚
â”‚   â”œâ”€â”€ video/                         # Remotion compositions
â”‚   â”‚   â”œâ”€â”€ package.json
â”‚   â”‚   â”œâ”€â”€ src/
â”‚   â”‚   â”‚   â”œâ”€â”€ Root.tsx
â”‚   â”‚   â”‚   â”œâ”€â”€ components/            # Reusable animation components
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ StaticImage.tsx
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ KenBurnsImage.tsx
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ AnimatedText.tsx
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ FadeTransition.tsx
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ GrainOverlay.tsx
â”‚   â”‚   â”‚   â”‚   â””â”€â”€ index.ts           # Component registry
â”‚   â”‚   â”‚   â”œâ”€â”€ templates/             # Template compositions
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ PhotoDump.tsx
â”‚   â”‚   â”‚   â”‚   â”œâ”€â”€ QuoteCard.tsx
â”‚   â”‚   â”‚   â”‚   â””â”€â”€ index.ts
â”‚   â”‚   â”‚   â””â”€â”€ utils/
â”‚   â”‚   â””â”€â”€ remotion.config.ts
â”‚   â”‚
â”‚   â””â”€â”€ shared/                        # Shared types & utilities
â”‚       â”œâ”€â”€ types/
â”‚       â”‚   â”œâ”€â”€ template.ts
â”‚       â”‚   â”œâ”€â”€ project.ts
â”‚       â”‚   â””â”€â”€ render.ts
â”‚       â””â”€â”€ validation/
â”‚           â””â”€â”€ template-validator.ts
â”‚
â”œâ”€â”€ tests/
â”‚   â”œâ”€â”€ unit/
â”‚   â”œâ”€â”€ integration/
â”‚   â””â”€â”€ e2e/
â”‚
â”œâ”€â”€ scripts/
â”‚   â”œâ”€â”€ seed-templates.ts              # Seed DB with initial templates
â”‚   â”œâ”€â”€ fetch-videos.ts                # yt-dlp wrapper for URL intake
â”‚   â””â”€â”€ analyze-video.ts              # Template extraction pipeline
â”‚
â”œâ”€â”€ docker-compose.yml                 # Local dev: Postgres, Redis
â”œâ”€â”€ .github/
â”‚   â””â”€â”€ workflows/
â”‚       â”œâ”€â”€ test.yml                   # Run tests on push
â”‚       â””â”€â”€ lint.yml                   # Lint on push
â””â”€â”€ .env.example
```

## 1.4 CLAUDE.md â€” The Master Agent Instruction File

This file is automatically read by Claude Code at the start of every session. It's the most important file in the repo.

```markdown
# CLAUDE.md â€” ReelForge Agent Instructions

## Project Overview
ReelForge is a web-based tool for creating Instagram Reels and TikTok videos
from trend-based templates. Creators select a template, fill content slots
(images, text), and the system renders a video.

## Tech Stack
- Backend: Node.js + Express + TypeScript
- Frontend: React + Vite + TypeScript + Tailwind CSS
- Video: Remotion (React-based video rendering)
- Database: PostgreSQL (via Prisma ORM)
- Queue: Redis + BullMQ
- Storage: S3-compatible (Cloudflare R2 for production, local MinIO for dev)
- AI: OpenAI API (GPT-4o for text, DALL-E 3 for images)

## Development Commands
- `cd src/backend && npm run dev` â€” start backend (port 3001)
- `cd src/frontend && npm run dev` â€” start frontend (port 5173)
- `cd src/video && npx remotion studio` â€” Remotion Studio (port 3000)
- `docker compose up -d` â€” start Postgres + Redis
- `cd src/backend && npx prisma migrate dev` â€” run DB migrations
- `cd src/backend && npm test` â€” run backend tests
- `cd src/frontend && npm test` â€” run frontend tests
- `cd tests && npm run e2e` â€” run end-to-end tests

## Architecture Rules
1. Templates are JSON documents stored in the `templates` table (JSONB column).
2. Templates reference components by ID from the component registry (`src/video/src/components/`).
3. Video rendering uses Remotion â€” every template maps to a Remotion composition.
4. The backend never renders video directly. It queues render jobs via BullMQ.
5. All AI calls go through a unified AI service (`src/backend/src/services/ai.service.ts`).
6. File uploads go to S3-compatible storage via a storage service abstraction.

## Spec-Driven Development
- ALWAYS read the relevant spec file in `/specs` before starting work on a task.
- Spec files define the expected API contracts, data shapes, and behavior.
- If a spec is unclear or missing, create a draft spec before writing code.
- When you finish a task, update the spec if your implementation diverged.

## Code Conventions
- Use TypeScript strict mode everywhere.
- Use Zod for runtime validation of API inputs and template schemas.
- Use Prisma for all database access (no raw SQL except migrations).
- React components use functional style with hooks. No class components.
- Use `async/await`, never raw Promises with `.then()`.
- Error handling: all API routes wrapped in try/catch, return consistent error format.
- Naming: camelCase for variables/functions, PascalCase for components/types, kebab-case for files.

## Testing Conventions
- Unit tests: colocated in `__tests__` folders or in `/tests/unit`.
- Integration tests: in `/tests/integration`, test API routes with supertest.
- E2e tests: in `/tests/e2e`, use Playwright.
- Every API endpoint must have at least one integration test.
- Every Remotion component must have a visual snapshot test.

## Git Workflow
- Branch naming: `{role}/{task-id}-{short-description}` (e.g., `dev/P1-T03-template-api`)
- Commit messages: `[{task-id}] description` (e.g., `[P1-T03] add template CRUD endpoints`)
- One task = one branch = one PR.
```

## 1.5 AGENTS.md â€” Role Definitions

```markdown
# AGENTS.md â€” Agent Role Definitions

## Planner Agent
**Trigger:** Human assigns a planning task.
**Reads:** Architecture docs, existing specs, codebase structure.
**Writes:** Spec files in /specs, task breakdowns, schema definitions.
**Rules:**
- Always define clear input/output contracts (API request/response shapes).
- Include example JSON payloads in API specs.
- Define error cases, not just happy paths.
- Break large features into tasks of 1-3 hour scope for developer agents.
- Each task must have explicit acceptance criteria.

## Developer Agent
**Trigger:** Human assigns a development task with a spec file reference.
**Reads:** Spec files, existing code, CLAUDE.md for conventions.
**Writes:** Source code, database migrations, configuration.
**Rules:**
- Read the full spec before writing any code.
- Follow code conventions in CLAUDE.md exactly.
- Write code that passes the tester agent's acceptance criteria.
- If you encounter ambiguity in the spec, add a TODO comment and note it.
- Run existing tests after your changes to ensure nothing breaks.
- Keep PRs focused â€” one task per PR.

## Tester Agent
**Trigger:** Human assigns a testing task after developer completes implementation.
**Reads:** Spec files, implementation code, test plans.
**Writes:** Test files, bug reports, test coverage reports.
**Rules:**
- Test against the spec, not the implementation.
- Cover happy path, edge cases, and error cases.
- For API tests: validate status codes, response shapes, and error messages.
- For component tests: test with valid props, missing props, and edge-case data.
- If you find a bug, create a file in /specs/bugs/{task-id}-bug-{n}.md.
- Include reproduction steps in bug reports.
```

## 1.6 Agentic Workflow â€” How a Task Flows Through Agents

```
Step 1: YOU create a GitHub Issue from the task list below
        Include: task ID, description, spec file reference, acceptance criteria

Step 2: PLANNER agent session (if spec doesn't exist yet)
        â†’ Claude Code: "Read the task in issue #X. Read /specs/overview.md for context.
           Create the spec file at /specs/{area}/{feature}.spec.md"
        â†’ Planner writes spec, commits to branch `plan/{task-id}`, opens PR
        â†’ YOU review and merge spec PR

Step 3: DEVELOPER agent session
        â†’ Claude Code: "Read the spec at /specs/{area}/{feature}.spec.md.
           Implement the feature. Run tests. Commit to branch `dev/{task-id}`."
        â†’ Developer writes code, commits, opens PR
        â†’ GitHub Actions runs linting + existing tests automatically

Step 4: TESTER agent session
        â†’ Claude Code: "Read the spec at /specs/{area}/{feature}.spec.md.
           Read the implementation in the dev/{task-id} branch.
           Write tests in /tests/{unit|integration|e2e}/.
           Run all tests. Report results."
        â†’ Tester writes tests, commits to same branch or a `test/{task-id}` branch
        â†’ If tests fail â†’ file bug report â†’ back to developer
        â†’ If tests pass â†’ PR ready for human review

Step 5: YOU review the PR (code + tests), merge to main
```

### Practical Session Workflow with Claude Code

```bash
# Start a planner session
claude-code --session "planner"
> Read issue #12. Create the API spec for template CRUD.
> Reference /specs/overview.md and /specs/schemas/template-schema.json.
> Output to /specs/api/templates.spec.md.

# Start a developer session  
claude-code --session "developer"
> Read /specs/api/templates.spec.md. 
> Implement the template API routes in src/backend/src/routes/templates.ts
> and the service in src/backend/src/services/template.service.ts.
> Run `npm test` when done.

# Start a tester session
claude-code --session "tester"  
> Read /specs/api/templates.spec.md.
> Read the implementation in src/backend/src/routes/templates.ts.
> Write integration tests in tests/integration/templates.test.ts.
> Run all tests and report results.
```

## 1.7 Setting Up the Local Development Environment

### Prerequisites

```bash
# System requirements
node >= 20
npm >= 10
docker & docker compose
python >= 3.11 (for video analysis tools)
ffmpeg (for video processing)
yt-dlp (for URL-based video fetching)

# Install global tools
npm install -g typescript remotion
pip install yt-dlp pyscenedetect paddleocr librosa
```

### Initial Setup Script

```bash
#!/bin/bash
# setup.sh â€” run once to initialize the project

# 1. Clone and enter repo
git clone https://github.com/your-user/reelforge.git
cd reelforge

# 2. Start infrastructure
docker compose up -d  # Postgres + Redis + MinIO (local S3)

# 3. Backend setup
cd src/backend
cp .env.example .env  # Fill in your API keys
npm install
npx prisma migrate dev --name init
npx prisma db seed    # Seed initial templates
cd ../..

# 4. Frontend setup
cd src/frontend
npm install
cd ../..

# 5. Video engine setup
cd src/video
npm install
cd ../..

# 6. Test infrastructure
cd tests
npm install
cd ..

echo "âœ… Ready. Run 'docker compose up -d' then start each service."
```

### docker-compose.yml

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: reelforge
      POSTGRES_USER: reelforge
      POSTGRES_PASSWORD: reelforge_dev
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"   # S3 API
      - "9001:9001"   # Console
    volumes:
      - miniodata:/data

volumes:
  pgdata:
  miniodata:
```

---

# PART 2: Detailed Development Plan

Every task below is scoped for a single agent session (1-3 hours). Tasks include the agent role, input specs, output expectations, and acceptance criteria.

---

## PHASE 0: Foundation & Infrastructure (Week 1)

**Goal:** Repo scaffolding, dev environment, CI/CD, database schema â€” the skeleton.

### P0-T01: Repository Scaffolding

| Field | Value |
|---|---|
| Agent | Developer |
| Time estimate | 1 hour |
| Dependencies | None |
| Description | Initialize the monorepo with the folder structure defined in Â§1.3. Set up package.json files for backend, frontend, video, and tests. Configure TypeScript in all packages. Add CLAUDE.md and AGENTS.md. |
| Input | Repository structure from Â§1.3 above |
| Output | Working repo with all directories, package.json files, tsconfig.json files, .gitignore, .env.example |
| Acceptance criteria | `npm install` succeeds in all packages. TypeScript compiles with no errors. Repo has correct structure. |

### P0-T02: Docker Compose & Local Infrastructure

| Field | Value |
|---|---|
| Agent | Developer |
| Time estimate | 30 min |
| Dependencies | P0-T01 |
| Description | Create docker-compose.yml with Postgres 16, Redis 7, MinIO. Add setup.sh script. Verify all services start. |
| Input | docker-compose.yml spec from Â§1.7 |
| Output | `docker compose up -d` starts all three services. MinIO console accessible at :9001. |
| Acceptance criteria | `docker compose up -d` succeeds. Can connect to Postgres on 5432, Redis on 6379, MinIO on 9000. |

### P0-T03: Database Schema & Prisma Setup

| Field | Value |
|---|---|
| Agent | Planner â†’ Developer |
| Time estimate | 2 hours |
| Dependencies | P0-T02 |
| Description | Define the Prisma schema based on the data model (users, templates, projects, renders, collected_videos, music_tracks, voiceover_clips, publish_log, ai_assets). Create initial migration. Write seed script for 3 placeholder templates. |
| Input | Data model from architecture doc Â§9 + collected_videos from integration doc |
| Output | `schema.prisma` file, initial migration, `seed.ts` that inserts test data |
| Spec file | `/specs/schemas/database.spec.md` (planner creates first) |
| Acceptance criteria | `npx prisma migrate dev` runs cleanly. `npx prisma db seed` inserts test data. `npx prisma studio` shows all tables with correct columns. |

### P0-T04: Backend Boilerplate (Express + TypeScript)

| Field | Value |
|---|---|
| Agent | Developer |
| Time estimate | 1.5 hours |
| Dependencies | P0-T03 |
| Description | Set up Express server with TypeScript. Configure middleware (CORS, JSON parsing, error handling). Set up Prisma client singleton. Add health check endpoint. Configure environment variables (dotenv). |
| Input | Tech stack decisions from architecture doc |
| Output | `npm run dev` starts server on port 3001. `GET /health` returns 200. Prisma client connects to DB. |
| Acceptance criteria | Server starts without errors. Health endpoint responds. DB connection verified via Prisma. |

### P0-T05: Frontend Boilerplate (React + Vite + Tailwind)

| Field | Value |
|---|---|
| Agent | Developer |
| Time estimate | 1 hour |
| Dependencies | P0-T01 |
| Description | Initialize React app with Vite. Add TypeScript, Tailwind CSS, React Router. Create basic layout with navbar placeholder and main content area. Add API client utility (fetch wrapper). |
| Input | Standard Vite + React + Tailwind setup |
| Output | `npm run dev` starts frontend on port 5173. Shows a basic page with "ReelForge" header. |
| Acceptance criteria | Frontend loads in browser. Tailwind classes work. No console errors. |

### P0-T06: Remotion Project Setup

| Field | Value |
|---|---|
| Agent | Developer |
| Time estimate | 1 hour |
| Dependencies | P0-T01 |
| Description | Initialize Remotion project. Create Root.tsx with a placeholder composition. Verify Remotion Studio runs. Create the component registry pattern (index.ts that exports all components). |
| Input | Remotion docs, component registry pattern from architecture doc |
| Output | `npx remotion studio` opens Remotion Studio. Placeholder composition renders a 15-second 1080x1920 video with a colored background and "Hello ReelForge" text. |
| Acceptance criteria | Studio runs. Composition renders. Can preview in browser. |

### P0-T07: CI/CD Pipeline (GitHub Actions)

| Field | Value |
|---|---|
| Agent | Developer |
| Time estimate | 1 hour |
| Dependencies | P0-T04, P0-T05, P0-T06 |
| Description | Set up GitHub Actions workflows: lint (ESLint), type check (tsc), test (Jest/Vitest), on push to any branch. Add basic test stubs that pass. |
| Input | Standard GitHub Actions patterns |
| Output | Push to any branch triggers CI. All checks pass (even if tests are stubs). |
| Acceptance criteria | CI runs on push. Green checks on the initial commit. |

### P0-T08: Shared Types Package

| Field | Value |
|---|---|
| Agent | Planner â†’ Developer |
| Time estimate | 1.5 hours |
| Dependencies | P0-T03 |
| Description | Define TypeScript types and Zod validation schemas for: Template, Scene, ContentSlot, SlotFill, Project, Render, RenderConfig. These types are imported by both backend and frontend. |
| Spec file | `/specs/schemas/template-schema.json` and `/specs/schemas/database.spec.md` |
| Output | `/src/shared/types/` with all type definitions. `/src/shared/validation/` with Zod schemas. |
| Acceptance criteria | Types compile. Zod schemas validate the example template JSON from architecture doc. Invalid data is rejected with clear errors. |

---

## PHASE 1: MVP â€” Template Gallery + Editor + Export (Weeks 2-5)

**Goal:** You can browse templates, fill slots with uploaded images and text, preview, and export MP4.

### P1-T01: Spec â€” Template CRUD API

| Field | Value |
|---|---|
| Agent | Planner |
| Time estimate | 1 hour |
| Dependencies | P0-T08 |
| Description | Write the full API spec for template endpoints: list (with filters), get by ID, create, update. Define request/response shapes, query params, pagination, error codes. |
| Output | `/specs/api/templates.spec.md` |

### P1-T02: Implement Template CRUD API

| Field | Value |
|---|---|
| Agent | Developer |
| Time estimate | 2 hours |
| Dependencies | P1-T01, P0-T04 |
| Description | Implement template routes: `GET /api/templates` (list with category/tag filters, pagination), `GET /api/templates/:id` (full schema), `POST /api/templates` (create), `PATCH /api/templates/:id` (update). |
| Spec file | `/specs/api/templates.spec.md` |
| Output | All endpoints working, tested manually with curl/Postman. |
| Acceptance criteria | All endpoints return correct status codes and shapes per spec. Filters work. Pagination works. Invalid input returns 400 with Zod errors. |

### P1-T03: Test â€” Template CRUD API

| Field | Value |
|---|---|
| Agent | Tester |
| Time estimate | 1.5 hours |
| Dependencies | P1-T02 |
| Description | Write integration tests for all template endpoints. Test happy paths, filters, pagination, invalid input, 404 for missing templates. |
| Output | `/tests/integration/templates.test.ts` |
| Acceptance criteria | All tests pass. Coverage includes happy path + at least 3 error cases per endpoint. |

### P1-T04: Seed 5-8 Real Templates

| Field | Value |
|---|---|
| Agent | Planner â†’ Developer |
| Time estimate | 3 hours |
| Dependencies | P1-T02, P0-T06 |
| Description | Design 5-8 template JSON schemas for real Instagram trends (photo dump, quote card, before/after, day in my life, product showcase, listicle, etc.). Each template should have 4-7 scenes with image + text slots. Create the seed data and the corresponding Remotion compositions. |
| Output | Template JSON files in `/specs/templates/`, seed script updated, Remotion compositions for each template. |
| Acceptance criteria | Each template renders correctly in Remotion Studio with placeholder content. Templates cover different scene counts, durations, and text styles. |

### P1-T05: Spec â€” Media Upload API

| Field | Value |
|---|---|
| Agent | Planner |
| Time estimate | 45 min |
| Dependencies | P0-T08 |
| Description | Spec the media upload endpoint: accept image files (jpg, png, webp), validate size/dimensions, store in S3 (MinIO locally), return URL. Include presigned URL approach for direct-to-S3 uploads. |
| Output | `/specs/api/media.spec.md` |

### P1-T06: Implement Media Upload

| Field | Value |
|---|---|
| Agent | Developer |
| Time estimate | 2 hours |
| Dependencies | P1-T05 |
| Description | Implement storage service abstraction (S3/MinIO). Implement `POST /api/media/upload` (multipart form data) and `GET /api/media/presigned-url` (for direct client upload). Add image validation (file type, max size 10MB, min resolution). |
| Spec file | `/specs/api/media.spec.md` |
| Output | Can upload images via API, they appear in MinIO, URL is returned. |
| Acceptance criteria | Upload works. Invalid files are rejected. Presigned URLs work for direct upload. Files persist in MinIO. |

### P1-T07: Spec â€” Project CRUD + Slot Fill API

| Field | Value |
|---|---|
| Agent | Planner |
| Time estimate | 1 hour |
| Dependencies | P0-T08 |
| Description | Spec the project endpoints: create project from template, update slot fills, get project with resolved asset URLs. Define the slot fill data structure (maps slot_id â†’ fill data). |
| Output | `/specs/api/projects.spec.md` |

### P1-T08: Implement Project CRUD + Slot Fill API

| Field | Value |
|---|---|
| Agent | Developer |
| Time estimate | 2 hours |
| Dependencies | P1-T07, P1-T06 |
| Description | Implement: `POST /api/projects` (create from template ID), `GET /api/projects/:id` (with slot fills and asset URLs), `PATCH /api/projects/:id` (update slot fills, music, settings). Validate that slot fills match the template's slot definitions (correct types, required slots filled). |
| Spec file | `/specs/api/projects.spec.md` |
| Output | Full project lifecycle works via API. |
| Acceptance criteria | Can create project, fill slots, retrieve with resolved data. Validation rejects wrong slot types. |

### P1-T09: Remotion Component Library (V1 â€” 6 Components)

| Field | Value |
|---|---|
| Agent | Developer |
| Time estimate | 3 hours |
| Dependencies | P0-T06 |
| Description | Build the first 6 Remotion components: `StaticImage` (full-bleed image with optional fit mode), `KenBurnsImage` (slow zoom in/out), `FadeInText` (text fades in with configurable delay), `TypewriterText` (character-by-character reveal), `FadeTransition` (cross-fade between scenes), `GrainOverlay` (film grain effect). Each component must accept standardized props defined in shared types. |
| Spec file | `/specs/schemas/component-registry.md` (planner creates) |
| Output | 6 components in `/src/video/src/components/`, each previewable in Remotion Studio. |
| Acceptance criteria | Each component renders correctly in Studio. Props are typed. Components handle edge cases (missing image, empty text, zero duration). |

### P1-T10: Template Renderer (JSON â†’ Remotion Composition)

| Field | Value |
|---|---|
| Agent | Developer |
| Time estimate | 3 hours |
| Dependencies | P1-T09, P1-T04 |
| Description | Build the "Template Interpreter" â€” a Remotion composition that reads a template JSON + slot fills and dynamically renders the correct components in sequence. This is the core rendering engine. It maps `component` IDs in the template JSON to actual React components, passes slot fill data as props, and sequences scenes with transitions. |
| Input | Template JSON schema, component registry |
| Output | `TemplateRenderer.tsx` that takes `{ template, slotFills, musicUrl }` as props and renders a complete video. |
| Acceptance criteria | Feed it a template JSON + dummy slot fills â†’ renders correct video in Studio. Works for all 5-8 seed templates. Scenes play in order with correct durations and transitions. |

### P1-T11: Test â€” Remotion Components + Renderer

| Field | Value |
|---|---|
| Agent | Tester |
| Time estimate | 2 hours |
| Dependencies | P1-T09, P1-T10 |
| Description | Write tests for each Remotion component (renders without crashing, handles edge case props) and the TemplateRenderer (correctly maps template JSON to component sequence). Use Remotion's testing utilities. |
| Output | Component tests + renderer tests. |
| Acceptance criteria | All tests pass. Each component tested with valid + edge case props. |

### P1-T12: Spec â€” Render Pipeline API

| Field | Value |
|---|---|
| Agent | Planner |
| Time estimate | 1 hour |
| Dependencies | P1-T10 |
| Description | Spec the render pipeline: `POST /api/projects/:id/render` triggers a render job. Job is queued in BullMQ. Worker picks it up, invokes Remotion render (CLI or Lambda), stores output in S3, updates render status. `GET /api/renders/:id/status` for polling. Define job payload, status transitions, error handling. |
| Output | `/specs/features/video-rendering.spec.md` |

### P1-T13: Implement Render Pipeline (Local Remotion CLI)

| Field | Value |
|---|---|
| Agent | Developer |
| Time estimate | 3 hours |
| Dependencies | P1-T12, P1-T10, P1-T08 |
| Description | Implement BullMQ job queue for renders. Implement render worker that: validates project has all required slots filled, calls Remotion CLI to render MP4, uploads to MinIO, updates render record status. Implement `POST /api/projects/:id/render` and `GET /api/renders/:id/status`. For V1, use local Remotion CLI rendering (not Lambda). |
| Spec file | `/specs/features/video-rendering.spec.md` |
| Output | Can trigger render via API, job runs, MP4 appears in MinIO. |
| Acceptance criteria | End-to-end: create project â†’ fill slots â†’ trigger render â†’ poll status â†’ download MP4. Render produces valid 1080x1920 H.264 video. Error cases handled (missing slots, render failure). |

### P1-T14: Implement Render Download Endpoint

| Field | Value |
|---|---|
| Agent | Developer |
| Time estimate | 30 min |
| Dependencies | P1-T13 |
| Description | Implement `GET /api/renders/:id/download` that returns a presigned S3 URL or streams the MP4 file. |
| Output | Clicking the URL downloads the rendered MP4. |
| Acceptance criteria | URL works. Returns 404 if render not found or not completed. |

### P1-T15: Frontend â€” Template Gallery Page

| Field | Value |
|---|---|
| Agent | Developer |
| Time estimate | 3 hours |
| Dependencies | P1-T02, P0-T05 |
| Description | Build the template gallery page: grid of template cards, each showing thumbnail (static image for now), name, category badge, duration. Add category filter tabs. Clicking a card navigates to the editor. Fetch from `GET /api/templates`. |
| Output | `/templates` page that shows all templates in a responsive grid. |
| Acceptance criteria | Templates load from API. Filters work. Cards show correct info. Click navigates to `/editor/:templateId`. Responsive on mobile. |

### P1-T16: Frontend â€” Editor Page (Slot Filler)

| Field | Value |
|---|---|
| Agent | Developer |
| Time estimate | 4 hours |
| Dependencies | P1-T08, P1-T06, P1-T15 |
| Description | Build the editor page: left panel shows scene list with slots, center has preview area (placeholder for now â€” just show filled images in sequence), right panel shows slot editor for selected slot (image upload dropzone, text input). Creating a project happens automatically when user enters the editor. Slot fills auto-save via PATCH API. |
| Output | Functional editor where you can select scenes, upload images to slots, type text, and see fills reflected in the UI. |
| Acceptance criteria | Can fill all slots for a template. Uploads work (images appear). Text input works. Data persists (refresh page â†’ fills are still there). |

### P1-T17: Frontend â€” Remotion Preview Player

| Field | Value |
|---|---|
| Agent | Developer |
| Time estimate | 3 hours |
| Dependencies | P1-T16, P1-T10 |
| Description | Integrate Remotion Player into the editor page center panel. Feed it the TemplateRenderer with current slot fills. Preview updates in real-time as user changes slots. Use Remotion's `@remotion/player` package for in-browser playback. Render at half resolution (540x960) for performance. |
| Output | Live video preview in the editor that updates as user fills slots. |
| Acceptance criteria | Preview shows correct video with filled slots. Updates within 1 second of slot change. Play/pause/scrub controls work. |

### P1-T18: Frontend â€” Export / Download Flow

| Field | Value |
|---|---|
| Agent | Developer |
| Time estimate | 2 hours |
| Dependencies | P1-T13, P1-T17 |
| Description | Add "Generate Video" button to editor. Clicking it calls the render API, shows a progress indicator (poll render status), and when complete, shows a download button. Handle error states (render failed, timeout). |
| Output | End-to-end flow: fill slots â†’ click generate â†’ wait â†’ download MP4. |
| Acceptance criteria | Full happy path works. Loading state shown during render. Error states handled gracefully. Downloaded MP4 plays correctly. |

### P1-T19: Test â€” End-to-End MVP Flow

| Field | Value |
|---|---|
| Agent | Tester |
| Time estimate | 2 hours |
| Dependencies | P1-T18 |
| Description | Write Playwright E2E test that: loads template gallery, picks a template, fills all slots (upload image, type text), clicks generate, waits for render, downloads MP4, verifies the file exists and is a valid video. |
| Output | `/tests/e2e/mvp-flow.spec.ts` |
| Acceptance criteria | E2E test passes. Covers happy path completely. |

---

## PHASE 1.5: Video Intake Pipeline (Week 4-5, parallel)

**Goal:** You can paste reel URLs and the system fetches + stores them for template creation.

### P1.5-T01: Spec â€” Video Intake API

| Field | Value |
|---|---|
| Agent | Planner |
| Time estimate | 45 min |
| Dependencies | P0-T03 |
| Description | Spec the video intake endpoints: `POST /api/intake/fetch` (accepts array of URLs, queues fetch jobs), `GET /api/intake/collections` (list user's collected videos, filter by tag), `PATCH /api/intake/videos/:id` (update tag/metadata). Define the fetch job flow. |
| Output | `/specs/features/url-intake.spec.md` |

### P1.5-T02: Implement yt-dlp Video Fetcher Service

| Field | Value |
|---|---|
| Agent | Developer |
| Time estimate | 2 hours |
| Dependencies | P1.5-T01 |
| Description | Build a service that wraps yt-dlp as a subprocess. Accepts a URL, downloads the video + metadata (title, caption, duration, thumbnail), stores video in S3, metadata in DB. Handle errors (private video, deleted, rate limited). Add 3-second delay between fetches to avoid rate limiting. |
| Output | `src/backend/src/services/video-fetcher.service.ts` |
| Acceptance criteria | Given an Instagram reel URL, downloads the video, extracts metadata, stores both. Handles errors gracefully. |

### P1.5-T03: Implement Intake API + Job Queue

| Field | Value |
|---|---|
| Agent | Developer |
| Time estimate | 2 hours |
| Dependencies | P1.5-T02 |
| Description | Implement `POST /api/intake/fetch` that accepts up to 20 URLs, validates them (Instagram/TikTok URL patterns), creates `collected_videos` records with status "fetching", and queues fetch jobs. Implement BullMQ worker that processes fetches sequentially with delays. Implement `GET /api/intake/collections` and `PATCH /api/intake/videos/:id`. |
| Output | Paste 15 URLs â†’ all videos fetched and stored within ~60 seconds. |
| Acceptance criteria | Batch fetch works. Status tracking works (fetching â†’ ready â†’ failed). Collection listing with tag filter works. |

### P1.5-T04: Frontend â€” Collection Workspace

| Field | Value |
|---|---|
| Agent | Developer |
| Time estimate | 3 hours |
| Dependencies | P1.5-T03 |
| Description | Build the collection workspace page: URL paste input (textarea), fetch button with progress, grid of collected videos (thumbnail + duration + status), tagging interface (assign collection tags), video player (click to preview). Show fetch status in real-time (poll or use server-sent events). |
| Output | `/collect` page where you can paste URLs, watch them get fetched, organize into tagged collections. |
| Acceptance criteria | Full flow works: paste URLs â†’ fetch â†’ see progress â†’ view results â†’ tag them. |

### P1.5-T05: Test â€” Intake Pipeline

| Field | Value |
|---|---|
| Agent | Tester |
| Time estimate | 1.5 hours |
| Dependencies | P1.5-T03 |
| Description | Integration tests for intake API: valid URLs fetch successfully, invalid URLs return errors, status transitions work, collection filtering works. Mock yt-dlp subprocess for test reliability. |
| Output | `/tests/integration/intake.test.ts` |
| Acceptance criteria | Tests pass. Covers valid URLs, invalid URLs, batch limits, status polling. |

---

## PHASE 2: AI Layer + Music (Weeks 6-9)

### P2-T01: Spec â€” AI Service Architecture

| Field | Value |
|---|---|
| Agent | Planner |
| Time estimate | 1.5 hours |
| Dependencies | P1-T18 |
| Description | Design the unified AI service: interface definition, prompt templates for each use case (text suggestions, image prompt enhancement, caption generation, hashtag generation), model selection strategy (GPT-4o-mini for simple tasks, GPT-4o for complex), rate limiting, cost tracking, caching. Define prompt templates as versioned files. |
| Output | `/specs/features/ai-service.spec.md`, `/specs/prompts/` directory structure |

### P2-T02: Implement AI Service (Text Suggestions)

| Field | Value |
|---|---|
| Agent | Developer |
| Time estimate | 2.5 hours |
| Dependencies | P2-T01 |
| Description | Implement the core AI service with OpenAI SDK. Build the text suggestion feature: given a template + optional user niche, generate suggested text for each text slot, plus caption and hashtags. Use structured output (JSON mode). Implement prompt template loading from files. Add cost tracking (log tokens used per call). |
| Output | `src/backend/src/services/ai.service.ts`, prompt template files |
| Acceptance criteria | Call the service with a template ID â†’ returns JSON with per-slot text suggestions + caption + hashtags. Responses are relevant and varied. Cost is logged. |

### P2-T03: Implement AI Image Generation

| Field | Value |
|---|---|
| Agent | Developer |
| Time estimate | 2 hours |
| Dependencies | P2-T02 |
| Description | Add image generation to the AI service. When a user provides a text prompt for an image slot: enhance the prompt (add composition, style, aspect ratio cues), call DALL-E 3 (1024x1792 for 9:16), download the result, store in S3, return URL. Add content safety check. Log cost. |
| Output | Image generation endpoint in AI service. |
| Acceptance criteria | Text prompt â†’ generates relevant 9:16 image â†’ stored in S3 â†’ URL returned. Enhanced prompt is better than raw user input. Cost logged. |

### P2-T04: AI Suggestion API Endpoints

| Field | Value |
|---|---|
| Agent | Developer |
| Time estimate | 1.5 hours |
| Dependencies | P2-T02, P2-T03 |
| Description | Implement: `POST /api/ai/suggest` (returns text + caption + hashtag suggestions for a template), `POST /api/ai/generate-image` (generates image from prompt + slot context), `POST /api/ai/enhance-prompt` (improves user's image prompt). |
| Output | Three working API endpoints. |
| Acceptance criteria | Endpoints return correct data. Error handling for AI API failures. Rate limiting per user. |

### P2-T05: Frontend â€” AI Suggestion Integration

| Field | Value |
|---|---|
| Agent | Developer |
| Time estimate | 3 hours |
| Dependencies | P2-T04, P1-T16 |
| Description | Add "âœ¨ Suggest" button to each slot in the editor. For text slots: shows 3-5 AI-generated suggestions, click to apply. For image slots: adds "Generate from prompt" tab alongside upload, shows text input + "Generate" button, displays generated image with "Use this" / "Regenerate" options. Add suggested caption + hashtags section below the preview. |
| Output | AI suggestions integrated into the editor UI. |
| Acceptance criteria | Text suggestions appear and can be applied with one click. Image generation works from prompt. Caption/hashtag suggestions shown. Loading states during AI calls. |

### P2-T06: Spec â€” Music Library

| Field | Value |
|---|---|
| Agent | Planner |
| Time estimate | 45 min |
| Dependencies | P0-T03 |
| Description | Spec the music library: data model, API for browsing/filtering (by mood, BPM, genre, energy), recommendation endpoint (given template audio tags, return ranked tracks), audio preview endpoint. |
| Output | `/specs/api/music.spec.md` |

### P2-T07: Implement Music Library API

| Field | Value |
|---|---|
| Agent | Developer |
| Time estimate | 2 hours |
| Dependencies | P2-T06 |
| Description | Implement: `GET /api/music` (browse with mood/BPM/genre filters), `GET /api/music/recommend/:templateId` (match template's audio tags to library tracks, rank by relevance), `GET /api/music/:id/preview` (stream audio preview). Seed DB with 20-30 royalty-free tracks (use free sources like Pixabay Music or similar). |
| Output | Music browsing and recommendation API. |
| Acceptance criteria | Filtering works. Recommendations return relevant tracks for different template types. Audio preview streams correctly. |

### P2-T08: Frontend â€” Music Selector in Editor

| Field | Value |
|---|---|
| Agent | Developer |
| Time estimate | 2 hours |
| Dependencies | P2-T07, P1-T16 |
| Description | Add music selector to the editor bottom bar: "Recommended" tab (auto-matched tracks), "Browse" tab (all tracks with filters), audio preview on hover, "Select" to assign to project. Selected music plays in the Remotion preview. |
| Output | Music selection integrated into editor. |
| Acceptance criteria | Can browse and preview music. Selecting a track updates the project and the preview plays with music. Recommendations shown for the current template. |

### P2-T09: Voiceover Upload Support

| Field | Value |
|---|---|
| Agent | Developer |
| Time estimate | 1.5 hours |
| Dependencies | P1-T06, P1-T16 |
| Description | Add voiceover upload to the editor: upload audio file (mp3, wav, m4a), validate duration (must not exceed template duration), show waveform preview, store in S3, integrate into Remotion preview (plays over music with auto-ducking). |
| Output | Voiceover upload working in editor + preview. |
| Acceptance criteria | Can upload audio. Plays in preview layered with music. Duration validation works. Audio ducking reduces music volume during voiceover segments. |

### P2-T10: Add 20-30 More Templates

| Field | Value |
|---|---|
| Agent | Developer |
| Time estimate | 5 hours (spread over multiple sessions) |
| Dependencies | P1-T04, P1-T09 |
| Description | Expand the template library to 30-35 total across categories: lifestyle, motivational, food, travel, fashion, tech, education, humor. Reuse existing component library. For each template: JSON schema + Remotion composition + sample thumbnail. |
| Output | 30-35 templates in the database. |
| Acceptance criteria | Each template renders correctly. Templates span at least 5 categories. Variety in scene counts (3-8), durations (10-30s), and text styles. |

### P2-T11: Test â€” AI Features + Music

| Field | Value |
|---|---|
| Agent | Tester |
| Time estimate | 2 hours |
| Dependencies | P2-T04, P2-T07 |
| Description | Integration tests for AI endpoints (mock OpenAI API) and music endpoints. Test suggestion quality validation (responses match expected schema). Test music recommendation relevance. Test error handling for AI API failures. |
| Output | `/tests/integration/ai.test.ts`, `/tests/integration/music.test.ts` |
| Acceptance criteria | Tests pass with mocked AI. Error cases covered. |

---

## PHASE 3: Publishing + Direct Post (Weeks 10-12)

### P3-T01: Spec â€” Publishing Pipeline

| Field | Value |
|---|---|
| Agent | Planner |
| Time estimate | 1.5 hours |
| Dependencies | Phase 2 |
| Description | Full spec for publishing: Instagram OAuth flow, Instagram Reels publishing API flow (container â†’ poll â†’ publish), TikTok OAuth + publishing, scheduling (cron-based), publish history logging. Define retry logic, error handling, rate limits. |
| Output | `/specs/features/publishing.spec.md` |

### P3-T02: Instagram OAuth Integration

| Field | Value |
|---|---|
| Agent | Developer |
| Time estimate | 2 hours |
| Dependencies | P3-T01 |
| Description | Implement Instagram OAuth: register callback URL, exchange code for access token, store encrypted token, token refresh logic. Add `GET /api/auth/instagram` (initiate OAuth) and `GET /api/auth/instagram/callback`. |
| Output | User can connect their Instagram account. Token stored securely. |
| Acceptance criteria | OAuth flow works end-to-end. Token stored encrypted. Handles token expiry. |

### P3-T03: Instagram Reel Publishing

| Field | Value |
|---|---|
| Agent | Developer |
| Time estimate | 3 hours |
| Dependencies | P3-T02 |
| Description | Implement: `POST /api/publish/instagram` (accepts render_id, caption, hashtags). Creates media container, polls for upload completion, publishes. Handles errors (video too long, invalid format, API errors). Logs to publish_log table. |
| Output | Can publish a rendered video directly to Instagram as a Reel. |
| Acceptance criteria | Published reel appears on Instagram. Caption and hashtags applied. Error states handled. Publish logged. |

### P3-T04: TikTok OAuth + Publishing

| Field | Value |
|---|---|
| Agent | Developer |
| Time estimate | 3 hours |
| Dependencies | P3-T01 |
| Description | Same as P3-T02 and P3-T03 but for TikTok's Content Posting API v2. |
| Output | Can publish to TikTok. |
| Acceptance criteria | Published video appears on TikTok. Error handling works. |

### P3-T05: Post Scheduling

| Field | Value |
|---|---|
| Agent | Developer |
| Time estimate | 2 hours |
| Dependencies | P3-T03 |
| Description | Implement scheduling: `POST /api/publish/schedule` (accepts render_id, platform, scheduled_at, caption). Stores as pending publish job. BullMQ delayed job or cron worker checks every minute for due jobs and executes the publish flow. |
| Output | Can schedule a reel to be published at a future time. |
| Acceptance criteria | Scheduled post publishes at the correct time (Â± 1 minute). |

### P3-T06: Frontend â€” Publish Flow

| Field | Value |
|---|---|
| Agent | Developer |
| Time estimate | 3 hours |
| Dependencies | P3-T03, P3-T04, P3-T05 |
| Description | Add publish page after render completes: connect Instagram/TikTok buttons (OAuth), editable caption + hashtags (pre-filled from AI suggestions), "Post Now" / "Schedule" options, date/time picker for scheduling, publish history tab. |
| Output | Full publish UI integrated after render. |
| Acceptance criteria | Can connect accounts, publish immediately, or schedule. History shows past publishes with status. |

### P3-T07: Test â€” Publishing Pipeline

| Field | Value |
|---|---|
| Agent | Tester |
| Time estimate | 2 hours |
| Dependencies | P3-T03, P3-T05 |
| Description | Integration tests with mocked platform APIs. Test publish flow, scheduling, error handling, token refresh. |
| Output | `/tests/integration/publishing.test.ts` |
| Acceptance criteria | Tests pass with mocked APIs. Covers: successful publish, API error, token expired, schedule timing. |

---

## PHASE 4: AI Template Extraction (Weeks 13-16)

### P4-T01: Spec â€” Template Extraction Pipeline

| Field | Value |
|---|---|
| Agent | Planner |
| Time estimate | 2 hours |
| Dependencies | Phase 1.5 |
| Description | Detailed spec for the multi-video template extraction pipeline. Define each stage (scene detection, OCR, audio analysis, LLM structuring, cross-video pattern finding), input/output formats for each stage, LLM prompts for template synthesis. |
| Output | `/specs/features/template-extraction.spec.md`, `/specs/prompts/template-extraction.md` |

### P4-T02: Implement Scene Detection Service

| Field | Value |
|---|---|
| Agent | Developer |
| Time estimate | 2 hours |
| Dependencies | P4-T01 |
| Description | Python service (or Node wrapper around PySceneDetect) that takes a video file, detects scene boundaries, extracts keyframes for each scene. Returns JSON array of scenes with timestamps, durations, and keyframe file paths. |
| Output | `scripts/analyze/scene_detector.py` |
| Acceptance criteria | Given a 15-second reel, correctly identifies 4-7 scenes. Keyframes extracted and saved. |

### P4-T03: Implement OCR + Layout Analysis

| Field | Value |
|---|---|
| Agent | Developer |
| Time estimate | 2 hours |
| Dependencies | P4-T02 |
| Description | For each keyframe: run PaddleOCR to detect text (content + bounding boxes), analyze layout zones (where is the media vs. text vs. blank space), estimate text style (approximate font size, color, position category â€” top/center/bottom). |
| Output | `scripts/analyze/visual_analyzer.py` |
| Acceptance criteria | Detects text overlays in sample reels. Position categorization is reasonable. Works on 10+ test keyframes. |

### P4-T04: Implement Audio Analysis

| Field | Value |
|---|---|
| Agent | Developer |
| Time estimate | 2 hours |
| Dependencies | P4-T01 |
| Description | Audio analysis pipeline: separate music vs. speech using Demucs (or simpler energy-based VAD), detect BPM using librosa, classify music mood (use a simple tag classifier or just BPM-based heuristics), transcribe speech segments with Whisper API. |
| Output | `scripts/analyze/audio_analyzer.py` |
| Acceptance criteria | BPM detection within Â±5 of actual. Speech segments identified correctly. Music/speech separation reasonable. |

### P4-T05: Implement LLM Template Synthesizer

| Field | Value |
|---|---|
| Agent | Developer |
| Time estimate | 3 hours |
| Dependencies | P4-T02, P4-T03, P4-T04 |
| Description | The core AI step: takes analysis results from 10-15 videos, feeds them to GPT-4o with a carefully designed prompt, and receives a template JSON. The prompt instructs the LLM to find cross-video patterns (consistent elements â†’ template structure, varying elements â†’ content slots). Implement validation of the LLM output against the template schema. |
| Output | `src/backend/src/services/template-extractor.service.ts` |
| Acceptance criteria | Given analysis of 10+ example reels of the same format, produces a valid template JSON that captures the trend's structure. Tested with 3 different trend types. |

### P4-T06: Orchestrate Full Extraction Pipeline

| Field | Value |
|---|---|
| Agent | Developer |
| Time estimate | 2 hours |
| Dependencies | P4-T05 |
| Description | Wire everything together: `POST /api/templates/extract` takes a collection tag (group of collected videos), runs all analysis steps in sequence, calls the LLM synthesizer, stores the draft template, returns it for review. Use BullMQ for the long-running job. Add status tracking. |
| Output | End-to-end: collection of 15 videos â†’ one draft template. |
| Acceptance criteria | Full pipeline runs. Draft template is usable (renders in Remotion with placeholders). Takes < 5 minutes for 15 videos. |

### P4-T07: Frontend â€” Template Review/Edit UI

| Field | Value |
|---|---|
| Agent | Developer |
| Time estimate | 4 hours |
| Dependencies | P4-T06 |
| Description | Admin page for reviewing AI-extracted templates: view the draft template JSON (formatted), side-by-side comparison with source videos, inline editing of template properties (scene durations, slot types, component selections, text styles), preview with placeholder content, "Publish Template" button. |
| Output | `/admin/templates/review/:id` page. |
| Acceptance criteria | Can view, edit, preview, and publish an extracted template. Changes to JSON are validated in real-time. |

---

## Task Dependency Graph

```
PHASE 0 (Foundation)
P0-T01 â”€â”¬â”€â–º P0-T02 â”€â”€â–º P0-T03 â”€â”€â–º P0-T04 â”€â”€â”
         â”‚                                     â”œâ”€â”€â–º P0-T07
         â”œâ”€â–º P0-T05 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
         â”œâ”€â–º P0-T06 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
         â””â”€â–º P0-T08 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

PHASE 1 (MVP)
P0-T08 â”€â”€â–º P1-T01 â”€â”€â–º P1-T02 â”€â”€â–º P1-T03
P0-T04 â”€â”€â–º P1-T02
P0-T06 â”€â”€â–º P1-T04 (seed templates, also depends on P1-T02)
P0-T08 â”€â”€â–º P1-T05 â”€â”€â–º P1-T06
P0-T08 â”€â”€â–º P1-T07 â”€â”€â–º P1-T08
P0-T06 â”€â”€â–º P1-T09 â”€â”€â–º P1-T10 â”€â”€â–º P1-T11
P1-T10 â”€â”€â–º P1-T12 â”€â”€â–º P1-T13 â”€â”€â–º P1-T14
P1-T02 + P0-T05 â”€â”€â–º P1-T15
P1-T08 + P1-T06 + P1-T15 â”€â”€â–º P1-T16
P1-T16 + P1-T10 â”€â”€â–º P1-T17
P1-T17 + P1-T13 â”€â”€â–º P1-T18 â”€â”€â–º P1-T19

PHASE 1.5 (Intake â€” parallel with Phase 1)
P0-T03 â”€â”€â–º P1.5-T01 â”€â”€â–º P1.5-T02 â”€â”€â–º P1.5-T03 â”€â”€â–º P1.5-T04
                                                 â””â”€â”€â–º P1.5-T05

PHASE 2 (AI + Music)
P1-T18 â”€â”€â–º P2-T01 â”€â”€â–º P2-T02 â”€â”€â–º P2-T03 â”€â”€â–º P2-T04 â”€â”€â–º P2-T05
                                              â””â”€â”€â–º P2-T11
P0-T03 â”€â”€â–º P2-T06 â”€â”€â–º P2-T07 â”€â”€â–º P2-T08
P1-T06 â”€â”€â–º P2-T09
P1-T09 â”€â”€â–º P2-T10

PHASE 3 (Publishing)
Phase 2 â”€â”€â–º P3-T01 â”€â”€â–º P3-T02 â”€â”€â–º P3-T03 â”€â”€â–º P3-T05 â”€â”€â–º P3-T06
                        â””â”€â”€â–º P3-T04 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                                       â””â”€â”€â–º P3-T07

PHASE 4 (Template Extraction)
P1.5 â”€â”€â–º P4-T01 â”€â”€â–º P4-T02 â”€â”€â–º P4-T03
                 â””â”€â”€â–º P4-T04
P4-T02 + P4-T03 + P4-T04 â”€â”€â–º P4-T05 â”€â”€â–º P4-T06 â”€â”€â–º P4-T07
```

---

## Total Effort Estimates

| Phase | Tasks | Planner Hours | Developer Hours | Tester Hours | Total |
|---|---|---|---|---|---|
| Phase 0 | 8 | 2.5 | 8 | 0 | 10.5 |
| Phase 1 | 19 | 3.5 | 28.5 | 5.5 | 37.5 |
| Phase 1.5 | 5 | 0.75 | 7 | 1.5 | 9.25 |
| Phase 2 | 11 | 2.25 | 21 | 2 | 25.25 |
| Phase 3 | 7 | 1.5 | 13 | 2 | 16.5 |
| Phase 4 | 7 | 2 | 15 | 0 | 17 |
| **Total** | **57** | **12.5** | **92.5** | **11** | **116 hours** |

With efficient agentic development (agents working in parallel where dependencies allow), the calendar time compresses significantly. Phase 0 + 1 could realistically be completed in 3-4 weeks of focused work.

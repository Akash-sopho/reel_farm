# ReelForge — Development Plan

## Project
Web tool for creating Instagram Reels and TikTok videos from trend-based templates.
Creators pick a template, fill slots (images, text), add music/voiceover, and export a 9:16 MP4.

**Stack:** Node/Express/TypeScript · React/Vite/Tailwind · Remotion · PostgreSQL/Prisma · Redis/BullMQ · MinIO · OpenAI

---

## Phases

| Phase | Goal | Status |
|---|---|---|
| 0 | Repo scaffolding, Docker, DB, CI/CD, shared types | ✅ DONE |
| 1 | Template gallery, slot-fill editor, Remotion preview, MP4 export | 🔄 IN PROGRESS |
| 1.5 | URL intake pipeline — fetch Instagram/TikTok videos via yt-dlp | ⏳ PENDING |
| 2 | AI text/image suggestions, music library | 📋 PLANNED |
| 3 | Direct publish to Instagram & TikTok, scheduling | 📋 PLANNED |
| 4 | AI template extraction from video collections | 📋 PLANNED |

---

## Phase 1 Dependency Chains

```
P1-T12 (Spec) → P1-T13 (Render Pipeline) → P1-T14 (Download Endpoint) ─┐
                                                                          ├─→ P1-T18 (Export Flow) → P1-T19 (E2E Test)
P1-T15 (Gallery) → P1-T16 (Editor) → P1-T17 (Preview Player) ───────────┘

P1.5-T01 (Spec) → P1.5-T02 (yt-dlp Service) → P1.5-T03 (API + Queue) → P1.5-T04 (Frontend)
                                                                        → P1.5-T05 (Tests)
```

---

## Master Task Registry

### Phase 0 — Foundation

| ID | Title | Role | Depends | Status |
|---|---|---|---|---|
| P0-T01 | Repository Scaffolding | Dev | — | ✅ DONE |
| P0-T02 | Docker Compose & Local Infrastructure | Dev | P0-T01 | ✅ DONE |
| P0-T03 | Database Schema & Prisma Setup | Dev | P0-T02 | ✅ DONE |
| P0-T04 | Backend Boilerplate (Express + TypeScript) | Dev | P0-T03 | ✅ DONE |
| P0-T05 | Frontend Boilerplate (React + Vite + Tailwind) | Dev | P0-T01 | ✅ DONE |
| P0-T06 | Remotion Project Setup | Dev | P0-T01 | ✅ DONE |
| P0-T07 | CI/CD Pipeline (GitHub Actions) | Dev | P0-T04,05,06 | ✅ DONE |
| P0-T08 | Shared Types Package | Dev | P0-T03 | ✅ DONE |

### Phase 1 — MVP

| ID | Title | Role | Depends | Status |
|---|---|---|---|---|
| P1-T01 | Spec — Template CRUD API | Planner | P0-T08 | ✅ DONE |
| P1-T02 | Implement Template CRUD API | Dev | P1-T01, P0-T04 | ✅ DONE |
| P1-T03 | Test — Template CRUD API | Tester | P1-T02 | ✅ DONE |
| P1-T04 | Seed 5–8 Real Templates | Dev | P1-T02, P0-T06 | ✅ DONE |
| P1-T05 | Spec — Media Upload API | Planner | P0-T08 | ✅ DONE |
| P1-T06 | Implement Media Upload | Dev | P1-T05 | ✅ DONE |
| P1-T07 | Spec — Project CRUD + Slot Fill API | Planner | P0-T08 | ✅ DONE |
| P1-T08 | Implement Project CRUD + Slot Fill API | Dev | P1-T07, P1-T06 | ✅ DONE |
| P1-T09 | Remotion Component Library (6 components) | Dev | P0-T06 | ✅ DONE |
| P1-T10 | Template Renderer (JSON → Remotion) | Dev | P1-T09, P1-T04 | ✅ DONE |
| P1-T11 | Test — Remotion Components + Renderer | Tester | P1-T09, P1-T10 | ✅ DONE |
| P1-T12 | Spec — Render Pipeline API | Planner | P1-T10 | ✅ DONE |
| P1-T13 | Implement Render Pipeline | Dev | P1-T12, P1-T10, P1-T08 | ✅ DONE |
| P1-T14 | Render Download Endpoint | Dev | P1-T13 | ✅ DONE |
| P1-T15 | Frontend — Template Gallery Page | Dev | P1-T02, P0-T05 | ✅ DONE |
| P1-T16 | Frontend — Editor Page (Slot Filler) | Dev | P1-T08, P1-T06, P1-T15 | ✅ DONE |
| P1-T17 | Frontend — Remotion Preview Player | Dev | P1-T16, P1-T10 | ✅ DONE |
| P1-T18 | Frontend — Export / Download Flow | Dev | P1-T13, P1-T17 | ⏳ PENDING |
| P1-T19 | Test — End-to-End MVP Flow | Tester | P1-T18 | ⏳ PENDING |

### Phase 1.5 — Video Intake Pipeline

| ID | Title | Role | Depends | Status |
|---|---|---|---|---|
| P1.5-T01 | Spec — Video Intake API | Planner | P0-T03 | ✅ DONE |
| P1.5-T02 | Implement yt-dlp Video Fetcher Service | Dev | P1.5-T01 | ✅ DONE |
| P1.5-T03 | Implement Intake API + Job Queue | Dev | P1.5-T02 | ⏳ PENDING |
| P1.5-T04 | Frontend — Collection Workspace Page | Dev | P1.5-T03 | ⏳ PENDING |
| P1.5-T05 | Test — Intake Pipeline | Tester | P1.5-T03 | ⏳ PENDING |

### Phase 2+ — Planned (IDs reserved)

| Range | Area |
|---|---|
| P2-T01 – P2-T11 | AI suggestions (GPT-4o text, DALL-E images), music library |
| P3-T01 – P3-T07 | Direct publish to Instagram & TikTok, scheduling |
| P4-T01 – P4-T07 | AI template extraction from video collections |

---

## Supervisor Workflow

1. Check Master Task Registry for tasks where all deps are ✅ DONE and status is ⏳ PENDING.
2. Add the next 2–4 unblocked tasks to `TASKS.md` in compact format (see that file for the format).
3. When developer completes a task: they append the Output to `COMPLETED_TASKS.md`, flip the status row here to ✅ DONE, and remove the task from `TASKS.md`.
4. To start a new phase: write full task definitions in `TASKS.md` and update status rows in this table.

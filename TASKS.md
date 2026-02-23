# TASKS.md — ReelForge Developer Queue

> **Workflow:** Pick first PENDING task where all deps are ✅. Mark IN-PROGRESS → implement → mark DONE.
> On completion: append Output to `COMPLETED_TASKS.md` · flip row in `DEVELOPMENT_PLAN.md` to ✅ DONE · remove task from here.
> Full specs in `/specs/`. Overall roadmap + all task statuses in `DEVELOPMENT_PLAN.md`.

---

## Active Queue — immediately startable


### [P1.5-T03] Implement Intake API + BullMQ Worker
**Status:** PENDING | **Role:** Developer | **Depends:** P1.5-T02 ✅
**Spec:** `specs/features/url-intake.spec.md`
**Output:** `src/backend/src/routes/intake.ts` · `src/backend/src/jobs/intake.worker.ts`
**What:** `POST /api/intake/fetch` — Zod validate `{ urls: string[] }` (1–20 items, each matching `/^https?:\/\/(www\.)?(instagram\.com|tiktok\.com)\//`), create one `CollectedVideo` DB record per URL (status `PENDING`), enqueue one BullMQ job per URL to queue `video-intake`, return 202 `{ jobIds, videos }`. `GET /api/intake/collections` — paginated list, optional `?tag=`, `?status=`, `?page=`, `?limit=` (max 100), return `{ videos, total, page, limit }`. `PATCH /api/intake/videos/:id` — validate `{ tags?: string[], notes?: string }`, return 200 with updated record or 404. Worker (`intake.worker.ts`): on job start set status `FETCHING`, call `fetchVideo(url)` from video-fetcher service, on success set status `READY` + save minioKey + metadata, on failure set status `FAILED` + save errorMessage. BullMQ: 3 retries, exponential backoff starting at 5s. Register route in `server.ts` at `/api/intake`.
**Done when:**
- POST with valid Instagram/TikTok URLs returns 202, creates DB records, enqueues jobs
- POST with invalid URL returns 400 `INVALID_URL`; batch > 20 returns 400 `BATCH_TOO_LARGE`
- Worker transitions status PENDING → FETCHING → READY or FAILED
- `npx tsc --noEmit` passes in `src/backend`

---

## Upcoming — blocked (unlocks automatically as above complete)

| ID | Title | Blocked by |
|---|---|---|
| P1.5-T04 | Frontend — Collection Workspace Page (/collect) | P1.5-T03 |
| P1.5-T05 | Test — Intake Pipeline (integration + unit) | P1.5-T03 |

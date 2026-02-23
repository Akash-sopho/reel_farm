# TASKS.md — ReelForge Developer Queue

> **Workflow:** Pick first PENDING task where all deps are ✅. Mark IN-PROGRESS → implement → mark DONE.
> On completion: append Output to `COMPLETED_TASKS.md` · flip row in `DEVELOPMENT_PLAN.md` to ✅ DONE · remove task from here.
> Full specs in `/specs/`. Overall roadmap + all task statuses in `DEVELOPMENT_PLAN.md`.

---

## Active Queue — immediately startable

### [P1.5-T01] Spec — Video Intake API
**Status:** PENDING | **Role:** Planner | **Depends:** P0-T03 ✅
**Output:** `specs/features/url-intake.spec.md` (create)
**What:** Write the video intake spec. Define: `POST /api/intake/fetch` (body: `{urls: string[]}`, 1–20 Instagram/TikTok URLs, creates CollectedVideo records, enqueues BullMQ jobs, returns 202 + jobIds), `GET /api/intake/collections` (paginated, filterable by `?tag=` and `?status=`), `PATCH /api/intake/videos/:id` (update tags/notes). Document CollectedVideo DB model (id, url, status, title, duration, resolution, fps, author, tags[], notes, minio_key, error_message). Job flow: PENDING→FETCHING→READY|FAILED. Error codes: INVALID_URL (400), BATCH_TOO_LARGE (400). 3s rate limit between yt-dlp calls; 3 retries with exponential backoff.
**Done when:**
- Spec file exists covering all 3 endpoints, job flow, DB model
- At least 5 numbered acceptance criteria examples with request/response shapes
- No implementation code written

---

## Upcoming — blocked (unlocks automatically as above complete)

| ID | Title | Blocked by |
|---|---|---|
| P1-T13 | Implement Render Pipeline (Remotion CLI + BullMQ worker) | P1-T12 |
| P1-T14 | Render Download Endpoint | P1-T13 |
| P1-T16 | Frontend — Editor Page (slot filler, 3-panel layout) | P1-T15 |
| P1-T17 | Frontend — Remotion Preview Player (@remotion/player) | P1-T16 |
| P1-T18 | Frontend — Export / Download Flow (render modal) | P1-T13 + P1-T17 |
| P1-T19 | Test — End-to-End MVP Flow (Playwright) | P1-T18 |
| P1.5-T02 | Implement yt-dlp Video Fetcher Service | P1.5-T01 |
| P1.5-T03 | Implement Intake API + BullMQ Worker | P1.5-T02 |
| P1.5-T04 | Frontend — Collection Workspace Page (/collect) | P1.5-T03 |
| P1.5-T05 | Test — Intake Pipeline (integration + unit) | P1.5-T03 |

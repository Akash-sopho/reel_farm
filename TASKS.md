# TASKS.md — ReelForge Developer Queue

> **Workflow:** Pick first PENDING task where all deps are ✅. Mark IN-PROGRESS → implement → mark DONE.
> On completion: append Output to `COMPLETED_TASKS.md` · flip row in `DEVELOPMENT_PLAN.md` to ✅ DONE · remove task from here.
> Full specs in `/specs/`. Overall roadmap + all task statuses in `DEVELOPMENT_PLAN.md`.

---

## Active Queue — immediately startable

### [P1.5-T04] Frontend — Collection Workspace Page
**Status:** PENDING | **Role:** Developer | **Depends:** P1.5-T03 ✅
**Spec:** N/A
**Output:** `src/frontend/src/pages/Collect.tsx` · `src/frontend/src/components/UrlBatchInput.tsx` · `src/frontend/src/components/CollectionGrid.tsx`
**What:** Build `/collect` page with URL input form (1-20 Instagram/TikTok URLs), collected videos grid with real-time status updates, tags editor. UI: Left panel (upload form), center (videos grid), right (tags panel). Real-time status: poll GET /api/intake/collections every 2-3 seconds.
**Done when:**
- URL input form accepts Instagram/TikTok URLs
- Submit button calls POST /api/intake/fetch
- Grid displays collected videos with status badges (PENDING, FETCHING, READY, FAILED)
- Status updates in real-time as videos are processed
- Tags can be edited and saved via PATCH /api/intake/videos/:id
- `npx tsc --noEmit` passes in `src/frontend`

---

### [P1.5-T05] Test — Intake Pipeline
**Status:** PENDING | **Role:** Tester | **Depends:** P1.5-T03 ✅
**Spec:** N/A
**Output:** `tests/integration/intake.test.ts` · `tests/unit/services/intake.service.test.ts`
**What:** Write integration tests for intake API: POST /api/intake/fetch with valid URLs (creates records, enqueues jobs), invalid URLs (returns 400), batch >20 (returns 400). Unit tests for URL validation regex. BullMQ worker tests: verify status transitions (PENDING → FETCHING → READY/FAILED), error handling.
**Done when:**
- POST /api/intake/fetch with valid URLs returns 202
- POST with invalid/unsupported URLs returns 400 INVALID_URL
- POST with >20 URLs returns 400 BATCH_TOO_LARGE
- Integration tests pass with real database
- Worker status transitions verified (PENDING → FETCHING → READY or FAILED)
- Error handling tested (non-retriable errors don't retry)

---

## Upcoming — blocked (unlocks automatically as above complete)

| ID | Title | Blocked by |
|---|---|---|

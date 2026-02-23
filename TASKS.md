# TASKS.md — ReelForge Developer Queue

> **Workflow:** Pick first PENDING task where all deps are ✅. Mark IN-PROGRESS → implement → mark DONE.
> On completion: append Output to `COMPLETED_TASKS.md` · flip row in `DEVELOPMENT_PLAN.md` to ✅ DONE · remove task from here.
> Full specs in `/specs/`. Overall roadmap + all task statuses in `DEVELOPMENT_PLAN.md`.

---

## Active Queue — immediately startable


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

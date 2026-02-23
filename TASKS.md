# TASKS.md — ReelForge Developer Queue

> **Workflow:** Pick first PENDING task where all deps are ✅. Mark IN-PROGRESS → implement → mark DONE.
> On completion: append Output to `COMPLETED_TASKS.md` · flip row in `DEVELOPMENT_PLAN.md` to ✅ DONE · remove task from here.
> Full specs in `/specs/`. Overall roadmap + all task statuses in `DEVELOPMENT_PLAN.md`.

---

## Active Queue — immediately startable

### [P1.5-T02] Implement yt-dlp Video Fetcher Service
**Status:** IN-PROGRESS | **Role:** Developer | **Depends:** P1.5-T01 ✅
**Spec:** `specs/features/url-intake.spec.md`
**Output:** `src/backend/src/services/video-fetcher.service.ts` · Prisma migration `add_collected_videos`
**What:** Implement yt-dlp wrapper at `video-fetcher.service.ts`. Export `fetchVideo(url: string): Promise<FetchResult>`. Use `child_process.spawn` (not exec) to run yt-dlp: first call with `-j` flag to get JSON metadata (title, duration, width, height, fps, uploader), second call to download to `/tmp/{id}/video.mp4`. Stream downloaded file to MinIO via `storage.service.ts` at key `collected-videos/{id}.mp4`. Enforce 3-second minimum delay between calls using a module-level `lastCallTime` variable. Clean up temp dir in try/finally. Classify yt-dlp exit codes into typed errors: `PRIVATE_VIDEO`, `DELETED_VIDEO`, `RATE_LIMITED`, `UNKNOWN_ERROR`. Add `CollectedVideo` model to `src/backend/prisma/schema.prisma` (fields: id, sourceUrl, platform, title, caption, durationSeconds, videoUrl, thumbnailUrl, tags String[], status enum FETCHING/READY/FAILED, errorMessage, createdAt). Run `npx prisma migrate dev --name add_collected_videos`.
**Done when:**
- `fetchVideo(url)` resolves with `{ minioKey, metadata }` for a valid public video URL
- 3-second rate limiting enforced between consecutive calls
- Temp files always cleaned up (even on failure)
- CollectedVideo migration runs cleanly, `npx prisma generate` succeeds
- `npx tsc --noEmit` passes in `src/backend`

---

## Upcoming — blocked (unlocks automatically as above complete)

| ID | Title | Blocked by |
|---|---|---|
| P1-T14 | Render Download Endpoint | P1-T13 |
| P1-T17 | Frontend — Remotion Preview Player (@remotion/player) | P1-T16 |
| P1-T18 | Frontend — Export / Download Flow (render modal) | P1-T13 + P1-T17 |
| P1-T19 | Test — End-to-End MVP Flow (Playwright) | P1-T18 |
| P1.5-T03 | Implement Intake API + BullMQ Worker | P1.5-T02 |
| P1.5-T04 | Frontend — Collection Workspace Page (/collect) | P1.5-T03 |
| P1.5-T05 | Test — Intake Pipeline (integration + unit) | P1.5-T03 |

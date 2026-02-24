# ReelForge POC Testing Guide

## What This Is

A guided test of every feature in ReelForge. You work through the app as a real creator —
picking templates, filling content, adding music, rendering videos, and publishing to social.

Two goals at once:
1. **QA** — confirm every feature works end-to-end in the browser
2. **Training** — you learn how to use the tool by actually using it

---

## How the Helper Works

Each session you start a **Haiku helper agent** (a separate Claude chat). The helper:
1. Reads `HELPER_TASKS.md`
2. Finds the first `PENDING` task whose dependencies are all `DONE`
3. Marks it `IN-PROGRESS`
4. Tells you exactly what to click and type in the browser — step by step
5. Writes a small Playwright CLI script and runs it to verify the feature worked
6. Reports results and marks the task `DONE` (or `BLOCKED` if something is broken)

**Start a helper session with this prompt:**
```
Read CURRENT_HELPER_TASK.md. This is your only task for this session.
Guide me through it step by step — tell me exactly what to click and type.
When I've completed the steps, write and run the Playwright CLI verification
script, read the output, and tell me PASS or FAIL with details.
Then append the result to COMPLETED_HELPER_TASKS.md and tell me to start
a new supervisor session to load the next task.
```

---

## Playwright CLI Verification

Helper scripts use the `scripts/playwright/_helpers.ts` module (already set up).
Scripts run via:
```bash
npx ts-node scripts/playwright/verify-h-t0X.ts
```

- Browser opens in **headed mode** (you can watch it)
- Output written to `scripts/playwright/output/`
- Only extracted data (counts, URLs, text values) lands in context — not raw DOM
- Ad-hoc verify scripts are gitignored automatically

---

## Prerequisites Checklist

Before starting your first helper session, make sure you have:

- [ ] Docker Desktop running
- [ ] Services healthy: `docker compose up -d` (Postgres + Redis + MinIO)
- [ ] Backend running: `cd src/backend && npm run dev` (port 3001)
- [ ] Frontend running: `cd src/frontend && npm run dev` (port 5173)
- [ ] Templates seeded: `cd src/backend && npx prisma db seed`
- [ ] **2–3 sample images** saved on your desktop (JPG/PNG, any size) — needed for H-T05
- [ ] **OpenAI API key** set in `src/backend/.env` — needed for H-T04, H-T06
- [ ] **yt-dlp installed** (`pip install yt-dlp`) — needed for H-T13+
- [ ] **1–2 public Instagram Reel or TikTok URLs** bookmarked — needed for H-T13
- [ ] **Instagram or TikTok developer app** (or willingness to create one) — needed for H-T10+

**Quick health check:**
```bash
docker compose ps
curl http://localhost:3001/api/health
# Open http://localhost:5173 in Chrome
```

---

## Feature Map

| ID | Feature | Status |
|----|---------|--------|
| H-T00 | Start services & health check | PENDING |
| H-T01 | Browse template gallery | PENDING |
| H-T02 | Create a project from a template | PENDING |
| H-T03 | Fill text slots manually | PENDING |
| H-T04 | AI text suggestions | PENDING |
| H-T05 | Upload an image to a slot | PENDING |
| H-T06 | AI image generation (DALL-E 3) | PENDING |
| H-T07 | Browse & add music | PENDING |
| H-T08 | Live video preview (Remotion) | PENDING |
| H-T09 | Render & download MP4 | PENDING |
| H-T10 | Connect social account (OAuth) | PENDING |
| H-T11 | Publish to social (immediate) | PENDING |
| H-T12 | Schedule a post | PENDING |
| H-T13 | Collect videos via URL intake | PENDING |
| H-T14 | Analyze a collected video | PENDING |
| H-T15 | Extract a template from a video | PENDING |
| H-T16 | Review & approve a template draft | PENDING |
| H-T17 | Full end-to-end reel (extracted template) | PENDING |

---

## Troubleshooting Reference

| Problem | Fix |
|---------|-----|
| Templates page is empty | `cd src/backend && npx prisma db seed` |
| Backend won't start | Check `src/backend/.env` exists; run `npx prisma migrate dev` |
| Render job never completes | Check Redis is running (`docker compose ps`); check backend logs for worker errors |
| OAuth redirect fails | Ensure redirect URI in your Instagram/TikTok app matches `http://localhost:3001/api/social/callback/{platform}` |
| yt-dlp fails on URL | Run `yt-dlp --version`; some URLs need `--cookies-from-browser chrome` |
| AI suggestions return error | Check `OPENAI_API_KEY` in `.env` has credits; check rate limit (10 req/min) |
| MinIO upload fails | Run `docker compose ps minio`; check `MINIO_*` vars in `.env` |
| Playwright script errors | Run `npm install` at repo root; confirm `@playwright/test` and `ts-node` installed |

---

## Completion Criteria

All 18 tasks `DONE` = every user-facing feature verified working.
Final deliverable: a rendered MP4 reel created from an AI-extracted template, published to social.

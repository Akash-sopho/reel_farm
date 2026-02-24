# HELPER_TASKS.md — ReelForge POC Helper Task Board

## How This File Is Used

This is the **supervisor's backlog**. Haiku helper agents do NOT read this file directly.

Supervisor workflow:
1. Find the next PENDING task (dependencies all DONE per COMPLETED_HELPER_TASKS.md)
2. Copy that task's full content into CURRENT_HELPER_TASK.md (replacing existing content)
3. Update that task's Status to IN-PROGRESS here

Helper workflow (reads only CURRENT_HELPER_TASK.md):
1. Guide user through User Instructions step by step
2. Write and run the Playwright CLI verification script
3. Report PASS or FAIL
4. Append result to COMPLETED_HELPER_TASKS.md
5. Tell user: "Task done — start a new supervisor session to load the next task"

---

## Task Format Reference

```
### H-TXX — Title
**Status:** PENDING
**Depends on:** H-TXX
**Goal:** One sentence — what we're proving works.

**User Instructions:**
Step-by-step actions for the user to take in the browser.

**Playwright Verification:**
Script name + what to check.

**Expected Result:** What PASS looks like.
**If It Fails:** What to investigate.
```

---

---

### H-T00 — Start Services & Health Check
**Status:** DONE
**Depends on:** —
**Goal:** All four services (Postgres, Redis, MinIO, backend, frontend) are running and reachable.

**User Instructions:**
1. Open a terminal and run: `docker compose up -d`
2. Wait ~10 seconds, then run: `docker compose ps`
   - Confirm you see postgres, redis, and minio all showing `Up` or `running`
3. In a second terminal, run: `cd src/backend && npm run dev`
   - Wait until you see `Server running on port 3001`
4. In a third terminal, run: `cd src/frontend && npm run dev`
   - Wait until you see `Local: http://localhost:5173`
5. Open Chrome and navigate to: `http://localhost:5173`
   - You should see the ReelForge landing page with "Welcome to ReelForge"
6. Tell the helper: "Services are up" and paste the output of `docker compose ps`

**Playwright Verification:**
Script: `scripts/playwright/verify-h-t00.ts`
- Navigate to `http://localhost:5173`
- Check page title or `h1` contains "ReelForge"
- Hit `http://localhost:3001/api/health` and check status 200
- Screenshot the homepage
- Write output: `{ frontendLoaded: true/false, backendHealthy: true/false }`

**Expected Result:** Both frontend and backend respond. Homepage renders without errors.

**If It Fails:**
- Frontend 404: Check `npm run dev` is running in `src/frontend/`
- Backend error: Check `src/backend/.env` exists (copy from `.env.example`)
- Docker services down: Run `docker compose up -d` again; check `docker compose logs postgres`

---

### H-T01 — Browse Template Gallery
**Status:** DONE
**Depends on:** H-T00
**Goal:** Template gallery page loads with seeded templates and category filter tabs work.

**User Instructions:**
1. From the homepage, click the **"Browse Templates"** button (or click **Templates** in the top nav)
2. You should land on `http://localhost:5173/templates`
3. Look at what you see:
   - Are there template cards in the grid? (If empty, tell the helper — we'll seed them)
   - Do you see category filter tabs near the top? (e.g., "All", "lifestyle", "quote")
4. Click one of the non-"All" category tabs — the grid should filter
5. Click the **"All"** tab — all templates should come back
6. Hover over a template card — it should scale up slightly and show a "Use Template" button
7. Tell the helper how many templates you see and what categories appear

**Playwright Verification:**
Script: `scripts/playwright/verify-h-t01.ts`
- Navigate to `http://localhost:5173/templates`
- Count template cards (`[data-testid="template-card"]` or similar card selector)
- Extract all category tab labels
- Click a non-"All" tab, recount cards
- Screenshot gallery
- Write output: `{ totalTemplates, categories, filterWorking: true/false }`

**Expected Result:** ≥1 template card visible. ≥2 category tabs. Category filter changes card count.

**If It Fails:**
- Empty gallery: Run `cd src/backend && npx prisma db seed` then reload
- Category tabs missing: Check browser console for API errors (F12 → Console)
- API error: Run `curl http://localhost:3001/api/templates` and paste response to helper

---

### H-T02 — Create a Project from a Template
**Status:** DONE
**Depends on:** H-T01
**Goal:** Clicking "Use Template" opens the Editor with the correct 3-panel layout.

**User Instructions:**
1. From the Templates page, pick any template and click its **"Use Template"** button
2. The URL should change to something like `http://localhost:5173/editor/abc123`
3. You should see a **3-panel layout**:
   - **Left panel** — a list of scenes (Scene 1, Scene 2, etc.) with small dots showing slot status
   - **Center panel** — a video preview player (9:16 portrait rectangle)
   - **Right panel** — "Content Slots" form with fields to fill in
4. Look at the right panel — note the slot names and types (text fields, image upload buttons)
5. Look at the top bar — you should see:
   - The template name
   - A slot progress indicator like "0/3 slots filled"
   - An **"Add Music"** button
   - A **"Generate Video"** button (likely greyed out)
6. Tell the helper: which template you picked and how many scenes/slots you see

**Playwright Verification:**
Script: `scripts/playwright/verify-h-t02.ts`
- Navigate to `http://localhost:5173/templates`
- Click the first "Use Template" button
- Wait for navigation to `/editor/`
- Check: left panel exists, center panel has Remotion player, right panel has slot inputs
- Read the slot count from the header
- Screenshot the editor
- Write output: `{ onEditorPage: true/false, sceneCount, slotCount, projectId }`

**Expected Result:** URL is `/editor/:id`, all 3 panels visible, slot count shown in header.

**If It Fails:**
- Page stays on templates: Check browser console for a POST `/api/projects` error
- Editor loads but panels are missing: Check for React render errors in console (F12)
- Backend error on project create: Check backend terminal for the error message

---

### H-T03 — Fill Text Slots Manually
**Status:** IN-PROGRESS
**Depends on:** H-T02
**Goal:** Typing text into a slot saves automatically and the slot progress counter increments.

**User Instructions:**
1. In the Editor, look at the **right panel** for a text slot (it looks like a text input or textarea with a label like "Headline", "Caption", "Quote", etc.)
2. Click into the first text field and type something — make it yours! For example:
   - For a quote template: type an inspiring quote
   - For a lifestyle template: type a short caption like "Living my best life ✨"
3. Watch the **slot progress counter** in the top bar — it should update (e.g., "1/3 slots filled")
4. If there are multiple text slots, fill them all in
5. Click on a different **scene** in the left panel — the right panel should update to show that scene's slots
6. Fill in those slots too
7. Tell the helper: what you typed and whether the counter updated

**Playwright Verification:**
Script: `scripts/playwright/verify-h-t03.ts`
- Navigate to the current project's editor URL
- Read the current slot fill state via `GET /api/projects/:id`
- Check that at least one `slotFill` has a non-empty value
- Screenshot the editor with filled slots
- Write output: `{ filledSlots, totalSlots, slotFills: [...] }`

**Expected Result:** API returns project with ≥1 slotFill entry. Counter in header shows filled count.

**If It Fails:**
- Counter doesn't update: Slots save with a 500ms debounce — wait a moment and try again
- PATCH request failing: Open browser DevTools → Network tab → look for failed PATCH calls
- Text disappears on refresh: Check backend logs for PATCH `/api/projects/:id` errors

---

### H-T04 — AI Text Suggestions
**Status:** PENDING
**Depends on:** H-T03
**Goal:** The "✨ Suggest" button returns 3 AI-generated text options you can pick from.

**User Instructions:**
1. In the Editor right panel, find a **text slot** that has a **"✨ Suggest"** button next to it
   (it's a small purple button — if you don't see it, look for the sparkles icon ✨)
2. Click the **"✨ Suggest"** button
3. Wait 2–5 seconds — a small popover/dropdown should appear with **3 suggestion options**
4. Read them! These are generated by GPT-4o based on your template and slot context
5. Click on one of the suggestions — it should fill the text slot automatically
6. Try the Suggest button on a different slot if one is available
7. Tell the helper: what suggestions you got and whether clicking one filled the slot

**Playwright Verification:**
Script: `scripts/playwright/verify-h-t04.ts`
- Navigate to the editor
- Click the suggest button for the first text slot
- Wait for the popover to appear
- Extract suggestion text options
- Click the first suggestion
- Read the slot input value after click
- Write output: `{ suggestionsReturned: count, suggestionText: [...], slotFilledAfterClick: true/false }`

**Expected Result:** Popover shows 3 suggestions. Clicking one fills the text input.

**If It Fails:**
- Button doesn't appear: The template might not have text slots with suggestion support — switch to a "Quote Card" template
- Error popover: Check `OPENAI_API_KEY` in `src/backend/.env`; check backend logs for AI service errors
- Rate limit (429 error shown): Wait 1 minute and try again
- Suggestions are generic/wrong: This is expected on first use — GPT-4o improves with filled context

---

### H-T05 — Upload an Image to a Slot
**Status:** PENDING
**Depends on:** H-T03
**Goal:** Uploading an image file fills an image slot with a MinIO URL and the preview updates.

**User Instructions:**
1. In the Editor, find a scene that has an **image slot** (right panel will show an "Upload Image" button)
   - If current template has no image slots, go back to Templates and pick "Photo Dump" template
2. Click the **"Upload Image"** button (or the image slot area)
3. A file picker dialog will open — navigate to your desktop and select one of your sample images
4. Wait a few seconds — the button should change state while uploading
5. Once complete, the image slot should show a **thumbnail or URL** of your uploaded image
6. Look at the **center panel preview** — the image should now appear in the video preview
7. Tell the helper: what happened and whether the preview updated

**Playwright Verification:**
Script: `scripts/playwright/verify-h-t05.ts`
- Fetch the project via `GET /api/projects/:id`
- Check that an image slotFill has a value that looks like a URL (starts with `http`)
- Screenshot the editor after upload
- Write output: `{ imageSlotFilled: true/false, imageUrl: "..." }`

**Expected Result:** Image slotFill value is a MinIO/storage URL. Preview reflects the image.

**If It Fails:**
- Upload button does nothing: Check browser console for errors; check MinIO is running (`docker compose ps minio`)
- Upload starts but fails: Check backend logs for storage service errors; verify MinIO credentials in `.env`
- Preview doesn't update: The Remotion player may need a moment to re-render — wait 2 seconds

---

### H-T06 — AI Image Generation (DALL-E 3)
**Status:** PENDING
**Depends on:** H-T03
**Goal:** The "✨ Generate Image" button creates a DALL-E 3 image and fills the slot.

**User Instructions:**
1. Find an **image slot** in the Editor right panel
2. Look for a **"✨ Generate Image"** button (purple, near the image slot)
3. Click it — a modal will open with a **prompt input field**
4. Type a descriptive prompt, for example:
   - `"A vibrant sunset over a city skyline, cinematic lighting, vertical format"`
   - `"A minimalist aesthetic flat lay with coffee, plants, and a notebook"`
5. Wait 10–20 seconds — DALL-E 3 generates the image (this can be slow)
6. A preview of the generated image should appear in the modal
7. Click **"Select"** to use the image — it fills the slot and the modal closes
8. Tell the helper: your prompt and what the generated image looked like

**Playwright Verification:**
Script: `scripts/playwright/verify-h-t06.ts`
- Fetch the project via `GET /api/projects/:id`
- Check an image slotFill has a URL from AI generation (stored in MinIO)
- Check AIAsset table was created (via `GET /api/projects/:id` checking for AI-generated asset)
- Write output: `{ aiImageGenerated: true/false, imageUrl: "..." }`

**Expected Result:** Image slot filled with a DALL-E generated image URL.

**If It Fails:**
- Button doesn't appear: Check if the template has image slots with AI generation enabled
- Modal opens but generation fails: Check `OPENAI_API_KEY`; check backend logs for DALL-E errors
- Rate limit: 5 image generations per minute — wait and retry
- Generated image not saved: Check MinIO; check backend storage service logs

---

### H-T07 — Browse & Add Music
**Status:** PENDING
**Depends on:** H-T02
**Goal:** Music picker shows tracks with working filters, previewing audio works, and selecting a track attaches it to the project.

**User Instructions:**
1. In the Editor top bar, click the **"Add Music"** button
2. A music picker modal should open from the bottom of the screen
3. You should see a **list of music tracks** with titles, artists, mood/genre badges, BPM, and duration
4. Try the **Mood filter** dropdown — pick "energetic" or "happy" — the list should filter
5. Find a track you like and click its **▶ preview button** — you should hear a short audio preview
6. Click the same button again to stop (⏸)
7. Try a different mood to see different tracks
8. Click **"Select"** on a track you like
9. The modal closes. The **"Add Music"** button in the top bar should now show the track name
10. Tell the helper: which track you picked and whether the preview played

**Playwright Verification:**
Script: `scripts/playwright/verify-h-t07.ts`
- Navigate to the editor
- Click "Add Music" button
- Wait for music modal to appear
- Count visible tracks
- Apply mood filter, recount
- Click Select on first track, modal should close
- Check "Add Music" button text changed to show track name
- Write output: `{ totalTracks, moodFilterWorks: true/false, trackSelected: "title - artist" }`

**Expected Result:** ≥5 tracks visible. Mood filter reduces list. Selected track name shows in header.

**If It Fails:**
- Modal empty: Run `cd src/backend && npx prisma db seed` (music tracks are seeded with templates)
- Preview doesn't play: Check browser audio permissions; check `GET /api/music/:id/preview` returns a URL
- Filter not working: Check browser console for API errors on `/api/music?mood=X`

---

### H-T08 — Live Video Preview (Remotion)
**Status:** PENDING
**Depends on:** H-T03
**Goal:** The Remotion player in the center panel shows an animated preview that plays correctly.

**User Instructions:**
1. Make sure you have at least 1 slot filled from H-T03 (text or image)
2. Look at the **center panel** — you should see a 9:16 portrait video player
3. Click the **▶ Play button** at the bottom of the player
4. Watch the animation — it should show your filled content animating on screen
   (text fading in, images with Ken Burns effect, transitions between scenes, etc.)
5. Let it play for the full duration
6. Try **clicking a different scene** in the left panel — the preview should jump to that scene
7. Scrub the playback bar left and right — the preview should update in real time
8. Tell the helper: what the animation looked like and whether your content appeared

**Playwright Verification:**
Script: `scripts/playwright/verify-h-t08.ts`
- Navigate to the editor
- Check the Remotion player is present (look for the player container or iframe)
- Check no error state is shown (no "render error" message visible)
- Screenshot the player at a mid-point frame
- Write output: `{ playerPresent: true/false, errorState: false, screenshotTaken: true }`

**Expected Result:** Player renders without error. Filled content is visible in the preview.

**If It Fails:**
- Black/blank preview: Check browser console for Remotion errors; ensure slots have valid values
- Player shows error overlay: May be a missing image URL — check slot fills are valid storage URLs
- Player not visible: Check frontend is running; check `VideoPreview.tsx` component renders in editor

---

### H-T09 — Render & Download MP4
**Status:** PENDING
**Depends on:** H-T08
**Goal:** Clicking "Generate Video" triggers a render job that produces a downloadable MP4 file.

**User Instructions:**
1. Fill in **all required slots** (the "Generate Video" button is disabled until all are filled)
   - The slot progress in the top bar should show "X/X slots filled" with all slots done
2. Click the **"Generate Video"** button
3. A modal opens — it should say **"Queued for rendering"** initially
4. Watch the progress bar — status will change:
   - "Queued for rendering" → "Rendering video..." → "Render complete!"
   - This typically takes **30 seconds to 5 minutes** depending on video length
5. When complete, a **"Download MP4"** button becomes available — click it
6. The video file should download to your computer
7. Open the downloaded file — watch your reel! 🎬
8. Tell the helper: how long it took and whether the video played correctly

**Playwright Verification:**
Script: `scripts/playwright/verify-h-t09.ts`
- Hit `GET /api/renders/:renderId/status` (get renderId from project)
- Poll until status = `DONE` (up to 5 minutes)
- Once done, hit `GET /api/renders/:renderId/download` — check it returns a presigned URL
- Write output: `{ renderStatus: "DONE", fileSize, downloadUrlGenerated: true/false, durationMs }`

**Expected Result:** Render status reaches DONE. Download URL is accessible.

**If It Fails:**
- Render stays PENDING forever: Check Redis is running; check backend worker logs for errors
- Render fails with error: Check backend logs for the specific Remotion error; check `src/backend/src/jobs/render.worker.ts`
- Download URL fails: Check MinIO is running and the rendered file was uploaded
- Video file is corrupted: Check Remotion is installed (`cd src/video && npm install`)

---

### H-T10 — Connect a Social Account (OAuth)
**Status:** PENDING
**Depends on:** H-T09
**Goal:** OAuth flow successfully connects an Instagram or TikTok account and stores it in the database.

**Before you start — OAuth app setup:**
If you haven't set up an OAuth app yet, the helper will walk you through it:
- **Instagram**: Create a Meta Developer App at developers.facebook.com
  - Add "Instagram Basic Display" product
  - Set redirect URI to: `http://localhost:3001/api/social/callback/instagram`
  - Add your Instagram account as a test user
  - Copy App ID and App Secret to `src/backend/.env` as `INSTAGRAM_APP_ID` and `INSTAGRAM_APP_SECRET`
- **TikTok**: Create a TikTok Developer App at developers.tiktok.com
  - Set redirect URI to: `http://localhost:3001/api/social/callback/tiktok`
  - Copy Client Key and Client Secret to `.env` as `TIKTOK_CLIENT_KEY` and `TIKTOK_CLIENT_SECRET`
- Restart the backend after adding env vars

**User Instructions:**
1. From a completed render in the Export Modal, click **"Share to Social"**
   (Or re-open an existing render from the editor and click Generate Video → Share to Social)
2. The Share Modal opens — you'll see tabs: "Publish Now" and "Schedule"
3. Select a **platform** (Instagram or TikTok button)
4. If not connected, you'll see **"+ Connect Instagram Account"** (or TikTok)
5. Click the connect button — your browser opens an OAuth authorization page
6. Log in to Instagram/TikTok and **authorize** the ReelForge app
7. You should be redirected back to `http://localhost:5173/auth/callback/success`
8. The page shows a success message and redirects back automatically
9. Return to the editor and click Share to Social again — you should now see **"✓ Connected @yourusername"**
10. Tell the helper: which platform and whether the account shows as connected

**Playwright Verification:**
Script: `scripts/playwright/verify-h-t10.ts`
- Hit `GET /api/social/accounts`
- Check response contains ≥1 account with `status: "active"`
- Check account has `platform`, `username`, and `id` fields
- Write output: `{ connectedAccounts: [{ platform, username, status }] }`

**Expected Result:** At least one social account appears with status "active".

**If It Fails:**
- OAuth page doesn't load: Check `INSTAGRAM_APP_ID`/`TIKTOK_CLIENT_KEY` in `.env`
- Callback fails (error page): Check redirect URI in your developer app matches exactly
- Success page but no account saved: Check backend logs for `social/callback` handler errors
- Token encryption error: Check `TOKEN_ENCRYPTION_KEY` is set in `.env` (32-char string)

---

### H-T11 — Publish to Social (Immediate)
**Status:** PENDING
**Depends on:** H-T10
**Goal:** Clicking "Publish Now" queues and completes a publish job, creating a live post.

**User Instructions:**
1. Open the Share Modal (from the Export Modal → "Share to Social")
2. Select your connected platform (Instagram or TikTok)
3. You should see **"✓ Connected @yourusername"** — confirm this
4. In the **"Publish Now"** tab:
   - Write a **caption** for your reel (try something fun — this is a real post!)
   - Add some **hashtags** (comma-separated, e.g., `reelforge, creator, ai`)
5. Click **"Publish Now"**
6. Watch the status in the modal:
   - "Submitting..." → "Uploading video..." → "Published!"
7. When published, the modal shows a success state
8. Check your actual Instagram/TikTok profile — your reel should appear! 🎉
9. Tell the helper: what caption you used and whether the post appeared on social

**Playwright Verification:**
Script: `scripts/playwright/verify-h-t11.ts`
- Hit `GET /api/projects/:projectId/publishes`
- Find the most recent publish log
- Poll `GET /api/publishes/:publishLogId` until status = `PUBLISHED` (up to 5 minutes)
- Write output: `{ publishStatus: "PUBLISHED", platform, externalId, publishedAt }`

**Expected Result:** PublishLog status reaches PUBLISHED. ExternalId (post ID from platform) is set.

**If It Fails:**
- Publish stays UPLOADING: Check publish worker in backend logs; check platform API errors
- Platform returns UNAUTHORIZED: OAuth token may have expired — reconnect the account (H-T10)
- Platform returns INVALID_VIDEO: Check render quality; Instagram requires H.264 MP4
- Publish worker not running: Check Redis and backend are running; restart backend

---

### H-T12 — Schedule a Post
**Status:** PENDING
**Depends on:** H-T10
**Goal:** Scheduling a post creates a delayed BullMQ job with a future publishedAt timestamp.

**User Instructions:**
1. Open the Share Modal again (same flow as H-T11)
2. This time, click the **"Schedule"** tab (next to "Publish Now")
3. You'll see a **date and time picker** — pick a time about **10 minutes from now**
4. Add a caption and hashtags
5. Click **"Schedule Post"**
6. The modal should confirm: "Scheduled for [date/time]"
7. (We won't wait for the post to actually publish — 10 minutes is fine to verify the job was queued)
8. Tell the helper: what time you scheduled it for

**Playwright Verification:**
Script: `scripts/playwright/verify-h-t12.ts`
- Hit `GET /api/projects/:projectId/publishes`
- Find the most recent publish log
- Check it has `scheduledAt` set to a future timestamp
- Check status is `PENDING` (not yet published)
- Write output: `{ scheduledAt, status: "PENDING", platform }`

**Expected Result:** PublishLog has `scheduledAt` in the future and status = PENDING.

**If It Fails:**
- Schedule button doesn't appear: Check the Schedule tab is visible in ShareModal
- POST `/api/projects/:id/schedule` fails: Check backend logs for scheduling errors
- Job not in queue: Check Redis with `redis-cli LLEN bull:video-publishes:delayed`

---

### H-T13 — Collect Videos via URL Intake
**Status:** PENDING
**Depends on:** H-T00
**Goal:** Submitting public social video URLs triggers yt-dlp downloads and videos appear in the collection grid.

**User Instructions:**
1. Click **"Collect"** in the top navigation bar
2. You land on `http://localhost:5173/collect`
3. In the **left panel**, you'll see a URL input area
4. Paste **1–2 public Instagram Reel or TikTok URLs** (one per line), for example:
   ```
   https://www.instagram.com/reel/XXXXXXXXX/
   https://www.tiktok.com/@username/video/XXXXXXXXX
   ```
   (Use URLs of public reels you've bookmarked)
5. Click **"Submit URLs"**
6. Watch the **center grid** — your videos should appear almost immediately with a **"Pending"** status badge
7. The status will cycle: `PENDING` → `FETCHING` → `READY` (or `FAILED`)
   This may take 30 seconds to 3 minutes depending on video size
8. The grid auto-refreshes every 2.5 seconds — watch the status badge update
9. Tell the helper: the URLs you used and what status they reached

**Playwright Verification:**
Script: `scripts/playwright/verify-h-t13.ts`
- Hit `GET /api/intake/collections`
- Check ≥1 CollectedVideo entry exists
- Check at least one has status `READY` or `FETCHING` (not stuck at PENDING)
- Write output: `{ totalVideos, statuses: [...], platforms: [...] }`

**Expected Result:** At least one video reaches status READY or FETCHING within a few minutes.

**If It Fails:**
- Status stays PENDING: Check Redis and intake worker are running; check backend logs for `video-intake` queue
- Status goes FAILED: Check yt-dlp is installed (`yt-dlp --version`); try a different public URL
- Private video error: Use a different URL — only public videos work without cookies
- Worker not processing: Restart backend; check BullMQ worker starts in `src/backend/src/jobs/`

---

### H-T14 — Analyze a Collected Video
**Status:** PENDING
**Depends on:** H-T13
**Goal:** Triggering analysis on a READY video runs GPT-4o Vision + OCR and stores scene analysis data.

**User Instructions:**
1. On the Collect page, find a video with status **"READY"** in the grid
2. Click on the video card to select it (a blue outline should appear)
3. Look at the video card — you should see an **"Analyze"** button
4. Click **"Analyze"**
5. The button changes to "Analyzing..." — this calls GPT-4o Vision to analyze the video frames
6. This may take **1–5 minutes** — the grid refreshes automatically every 2.5 seconds
7. When done, the card should show **"Analyzed"** status and the Analyze button becomes an **"Extract"** button
8. Look at the right panel — it may show analysis data (scene types, detected text)
9. Tell the helper: what the analysis status shows

**Playwright Verification:**
Script: `scripts/playwright/verify-h-t14.ts`
- Hit `GET /api/intake/videos/:id/analysis` for the analyzed video
- Check `analysisStatus` is `completed`
- Check `analysisResult` is not null (contains scenes array)
- Write output: `{ analysisStatus, sceneCount, detectedTextSamples: [...] }`

**Expected Result:** Analysis result has scene data with detected text and color info.

**If It Fails:**
- Analysis stuck at "Analyzing...": Check `analysis.worker.ts` is running; check backend logs for GPT errors
- GPT Vision error: Check `OPENAI_API_KEY` has GPT-4o Vision access
- OCR returns nothing: Normal for videos without text — the template extraction can still work
- Timeout: Analysis has a 5-minute timeout; very long videos may fail — use a short reel (< 60 seconds)

---

### H-T15 — Extract a Template from a Video
**Status:** PENDING
**Depends on:** H-T14
**Goal:** The extraction job generates a TemplateSchema JSON from the video analysis and creates a draft template.

**User Instructions:**
1. On the Collect page, find your **Analyzed** video
2. Click the **"Extract"** button on the video card
3. A confirmation or action triggers — the button may change to "Extracting..."
4. This calls GPT-4o to generate a full TemplateSchema from the video's scenes
5. This typically takes **1–3 minutes**
6. When done, click **"View Drafts"** button (top right of the Collect page header)
7. You land on `http://localhost:5173/templates/drafts`
8. You should see your extracted template as a draft card with:
   - Template name (AI-generated)
   - Quality score (percentage)
   - Scene and slot counts
   - Any issues/warnings detected
9. Tell the helper: what the draft looks like — name, quality score, any issues

**Playwright Verification:**
Script: `scripts/playwright/verify-h-t15.ts`
- Hit `GET /api/templates/drafts`
- Check ≥1 draft template with `extractionStatus: "COMPLETED"`
- Read quality score, scene count, slot count
- Write output: `{ draftCount, draft: { name, qualityScore, sceneCount, slotCount, issues: [...] } }`

**Expected Result:** ≥1 completed draft template with a quality score > 0.

**If It Fails:**
- No drafts appear: Check extraction worker logs; ensure video was fully analyzed first (H-T14)
- Draft status is FAILED: Check backend logs for `template-extraction` queue errors; check GPT-4o has access
- Quality score is 0: The generated schema may have validation errors — check logs for AJV validation failures

---

### H-T16 — Review & Approve a Template Draft
**Status:** PENDING
**Depends on:** H-T15
**Goal:** Approving a draft template publishes it to the live template gallery.

**User Instructions:**
1. On the **Template Drafts** page (`/templates/drafts`), find your extracted draft
2. Review the draft card:
   - **Quality score**: Green (≥80%), Yellow (60–79%), Red (<60%) — any score is fine for POC
   - **Issues list**: Shows detected problems (these are informational, won't block publish)
   - **Scene/slot counts**: Tells you how many scenes and fillable slots the extracted template has
3. Click the **"Publish"** button on the draft card
4. The card should disappear from the Drafts page (or show "Published" state)
5. Navigate to the **Templates** page (`/templates`)
6. Your newly published template should now appear in the gallery!
7. Tell the helper: the template name and quality score

**Playwright Verification:**
Script: `scripts/playwright/verify-h-t16.ts`
- Hit `GET /api/templates` (published only)
- Check the newly published template appears in the list (match by name or id)
- Write output: `{ templatePublished: true/false, templateName, isPublished: true }`

**Expected Result:** Template appears in the main gallery with `isPublished: true`.

**If It Fails:**
- Publish button is disabled: Template must have `extractionStatus: "COMPLETED"` — check if extraction finished
- Template doesn't appear in gallery: Check PATCH `/api/templates/:id/publish` response in DevTools Network tab
- No Publish button visible: Check the draft status filter — set it to "COMPLETED"

---

### H-T17 — Full End-to-End Reel (from Extracted Template)
**Status:** PENDING
**Depends on:** H-T16
**Goal:** Create a complete reel using the AI-extracted template — proving the full loop works from collection to published reel.

**User Instructions:**
This is the full creation loop using your own AI-extracted template. You've earned it! 🎬

1. Go to the **Templates** page and find the template you extracted and published in H-T16
2. Click **"Use Template"** — the Editor opens
3. **Fill all slots** — use your own content:
   - Text slots: write real copy for the reel
   - Image slots: upload images from your desktop or use AI generation (✨ Generate Image)
   - Use AI text suggestions (✨ Suggest) for any text slots you want help with
4. Click **"Add Music"** — pick a track that fits the mood
5. Watch the **live preview** — your content should animate with the extracted template's style
6. When all slots are filled (X/X in header), click **"Generate Video"**
7. Wait for the render to complete (watch the progress bar)
8. Click **"Download MP4"** — watch your reel! 🎉
9. **BONUS**: Click "Share to Social" and publish it to your connected Instagram/TikTok
10. Tell the helper: the full experience — what the reel looks like, how the template performed

**Playwright Verification:**
Script: `scripts/playwright/verify-h-t17.ts`
- Verify render status = DONE for the new project
- Verify all slots were filled
- Verify download URL is accessible
- If published: verify PublishLog status = PUBLISHED
- Screenshot the export modal showing completion
- Write output: `{ allSlotsFilled: true, renderStatus: "DONE", downloadAccessible: true, published: true/false }`

**Expected Result:** A complete MP4 reel generated from an AI-extracted template. Full loop proven.

**If It Fails:**
- Any step: refer back to the specific helper task (H-T03 through H-T09) for that step's troubleshooting
- Template has no slots: The extraction quality was low — go back to H-T15 and try with a different video
- Preview looks wrong: The extracted template schema may have issues — review the schema in `/api/templates/:id`

---

## Summary Table

| ID | Feature | Status | Depends on |
|----|---------|--------|-----------|
| H-T00 | Start services & health check | DONE | — |
| H-T01 | Browse template gallery | DONE | H-T00 |
| H-T02 | Create a project from a template | DONE | H-T01 |
| H-T03 | Fill text slots manually | IN-PROGRESS | H-T02 |
| H-T04 | AI text suggestions | PENDING | H-T03 |
| H-T05 | Upload an image to a slot | PENDING | H-T03 |
| H-T06 | AI image generation (DALL-E 3) | PENDING | H-T03 |
| H-T07 | Browse & add music | PENDING | H-T02 |
| H-T08 | Live video preview (Remotion) | PENDING | H-T03 |
| H-T09 | Render & download MP4 | PENDING | H-T08 |
| H-T10 | Connect social account (OAuth) | PENDING | H-T09 |
| H-T11 | Publish to social (immediate) | PENDING | H-T10 |
| H-T12 | Schedule a post | PENDING | H-T10 |
| H-T13 | Collect videos via URL intake | PENDING | H-T00 |
| H-T14 | Analyze a collected video | PENDING | H-T13 |
| H-T15 | Extract a template from a video | PENDING | H-T14 |
| H-T16 | Review & approve a template draft | PENDING | H-T15 |
| H-T17 | Full end-to-end reel (extracted template) | PENDING | H-T16 |

# Current Helper Task

**Supervisor instructions:** When this task is DONE, append it to COMPLETED_HELPER_TASKS.md,
then tell the user to start a new supervisor session to load the next task.

---

### H-T03 — Fill Text Slots Manually
**Status:** IN-PROGRESS
**Depends on:** H-T02 ✅
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

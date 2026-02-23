# TASKS.md — ReelForge Developer Queue

> **Workflow:** Pick first PENDING task where all deps are ✅. Mark IN-PROGRESS → implement → mark DONE.
> On completion: append Output to `COMPLETED_TASKS.md` · flip row in `DEVELOPMENT_PLAN.md` to ✅ DONE · remove task from here.
> Full specs in `/specs/`. Overall roadmap + all task statuses in `DEVELOPMENT_PLAN.md`.

---

## Active Queue — immediately startable

(No tasks in immediate queue - see Upcoming section for blocked tasks)

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

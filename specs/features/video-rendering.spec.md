# Video Rendering Pipeline Specification

## Overview

This document specifies the REST API and job queue infrastructure for rendering projects into MP4 videos using Remotion. The rendering pipeline converts a ready project (template + filled slots) into a 9:16 MP4 file stored in MinIO/S3.

---

## Core Concepts

### Render Lifecycle

```
Project in "ready" status
  ↓ (POST /api/projects/:id/render)
Render created with status PENDING
  ↓ (BullMQ worker picks up job)
Render status: PROCESSING (Remotion CLI running)
  ↓ (CLI completes successfully)
Render status: DONE
  minio_key: renders/{renderId}.mp4
  output_url: presigned URL
  ↓
GET /api/renders/:id/download returns presigned URL
  ↓ (User downloads MP4)

OR (if error occurs):
Render status: FAILED
  error_message: "Remotion CLI exited with code 1: ..."
  ↓
GET /api/renders/:id/status returns error details
```

### Render Model

```typescript
interface Render {
  id: string;                    // UUID, generated on creation
  projectId: string;             // foreign key to projects
  userId: string;                // foreign key to users (denormalized for access control)
  status: 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED';

  // Job metadata
  jobId?: string;                // BullMQ job ID (set when enqueued)

  // File storage
  minio_key?: string;            // format: renders/{renderId}.mp4 (set when DONE)
  output_url?: string;           // presigned MinIO/S3 URL (set when DONE)
  file_size_bytes?: number;      // set when DONE

  // Timing
  started_at?: string;           // ISO 8601, when PROCESSING began
  completed_at?: string;         // ISO 8601, when DONE or FAILED

  // Error tracking
  error_message?: string;        // populated if FAILED
  error_code?: string;           // e.g., "REMOTION_CLI_FAILED", "PROJECT_NOT_FOUND"

  // Auditing
  created_at: string;            // ISO 8601
  updated_at: string;            // ISO 8601
}
```

---

## Endpoints

### 1. POST /api/projects/:id/render — Initiate Render

**Purpose:** Trigger MP4 rendering for a project. Returns immediately with a render ID for polling.

**Request:**
```
POST /api/projects/:id/render
Content-Type: application/json

{}
```

**Request validation:**
- `projectId` must be a valid UUID
- Project must exist and belong to authenticated user
- Project status must be exactly `"ready"` (all required slots filled)

**Response (202 Accepted):**
```json
{
  "id": "render-uuid-1",
  "projectId": "proj-abc123",
  "userId": "user-xyz",
  "status": "PENDING",
  "jobId": "bullmq-job-id-12345",
  "created_at": "2026-02-23T10:00:00Z",
  "updated_at": "2026-02-23T10:00:00Z"
}
```

**Status codes:**
- **202 Accepted** — Render job enqueued successfully
- **400 Bad Request** — Invalid projectId or request format
- **404 Not Found** — Project not found
- **409 Conflict** — Project not in ready status OR already rendering
- **401 Unauthorized** — User not authenticated or not project owner

**Error response (409 - project not ready):**
```json
{
  "error": "Project must be in 'ready' status to render",
  "code": "PROJECT_NOT_READY",
  "details": {
    "projectId": "proj-abc123",
    "status": "draft",
    "filledSlots": 3,
    "requiredSlots": 5
  }
}
```

**Error response (409 - already rendering):**
```json
{
  "error": "Project already has an active render in progress",
  "code": "ALREADY_RENDERING",
  "details": {
    "projectId": "proj-abc123",
    "activeRenderId": "render-xyz-789",
    "activeRenderStatus": "PROCESSING"
  }
}
```

**Error response (404 - project not found):**
```json
{
  "error": "Project not found",
  "code": "NOT_FOUND",
  "details": {
    "projectId": "proj-abc123"
  }
}
```

---

### 2. GET /api/renders/:id/status — Poll Render Status

**Purpose:** Poll the status of an ongoing or completed render. Supports long-polling or interval-based polling from frontend.

**Request:**
```
GET /api/renders/:id/status
```

**Response (200 OK) — Status PENDING:**
```json
{
  "id": "render-uuid-1",
  "projectId": "proj-abc123",
  "userId": "user-xyz",
  "status": "PENDING",
  "jobId": "bullmq-job-id-12345",
  "created_at": "2026-02-23T10:00:00Z",
  "updated_at": "2026-02-23T10:00:01Z"
}
```

**Response (200 OK) — Status PROCESSING:**
```json
{
  "id": "render-uuid-1",
  "projectId": "proj-abc123",
  "userId": "user-xyz",
  "status": "PROCESSING",
  "jobId": "bullmq-job-id-12345",
  "started_at": "2026-02-23T10:00:05Z",
  "created_at": "2026-02-23T10:00:00Z",
  "updated_at": "2026-02-23T10:00:05Z"
}
```

**Response (200 OK) — Status DONE:**
```json
{
  "id": "render-uuid-1",
  "projectId": "proj-abc123",
  "userId": "user-xyz",
  "status": "DONE",
  "jobId": "bullmq-job-id-12345",
  "minio_key": "renders/render-uuid-1.mp4",
  "output_url": "https://s3-presigned-url.example.com/renders/render-uuid-1.mp4?expires=3600",
  "file_size_bytes": 125432890,
  "started_at": "2026-02-23T10:00:05Z",
  "completed_at": "2026-02-23T10:02:30Z",
  "created_at": "2026-02-23T10:00:00Z",
  "updated_at": "2026-02-23T10:02:30Z"
}
```

**Response (200 OK) — Status FAILED:**
```json
{
  "id": "render-uuid-1",
  "projectId": "proj-abc123",
  "userId": "user-xyz",
  "status": "FAILED",
  "jobId": "bullmq-job-id-12345",
  "error_message": "Remotion CLI exited with code 1: /tmp/render-uuid-1/props.json not found",
  "error_code": "REMOTION_CLI_FAILED",
  "started_at": "2026-02-23T10:00:05Z",
  "completed_at": "2026-02-23T10:00:45Z",
  "created_at": "2026-02-23T10:00:00Z",
  "updated_at": "2026-02-23T10:00:45Z"
}
```

**Status codes:**
- **200 OK** — Render found, status returned
- **404 Not Found** — Render ID does not exist or belongs to different user
- **401 Unauthorized** — User not authenticated

**Error response (404):**
```json
{
  "error": "Render not found",
  "code": "NOT_FOUND",
  "details": {
    "renderId": "render-xyz-999"
  }
}
```

---

### 3. GET /api/renders/:id/download — Download Completed Render

**Purpose:** Retrieve a presigned URL for downloading the MP4. Only available if render status is DONE.

**Request:**
```
GET /api/renders/:id/download
```

**Response (200 OK):**
```json
{
  "id": "render-uuid-1",
  "projectId": "proj-abc123",
  "minio_key": "renders/render-uuid-1.mp4",
  "download_url": "https://s3-presigned-url.example.com/renders/render-uuid-1.mp4?expires=3600",
  "expires_at": "2026-02-23T11:00:00Z",
  "file_size_bytes": 125432890,
  "status": "DONE"
}
```

**Status codes:**
- **200 OK** — Presigned URL generated
- **400 Bad Request** — Render not in DONE status
- **404 Not Found** — Render not found or belongs to different user
- **401 Unauthorized** — User not authenticated

**Error response (400 - not done):**
```json
{
  "error": "Render is not complete. Current status: PROCESSING",
  "code": "RENDER_NOT_READY",
  "details": {
    "renderId": "render-uuid-1",
    "status": "PROCESSING"
  }
}
```

**Error response (400 - failed):**
```json
{
  "error": "Render failed. Cannot download.",
  "code": "RENDER_FAILED",
  "details": {
    "renderId": "render-uuid-1",
    "status": "FAILED",
    "error_message": "Remotion CLI exited with code 1: ..."
  }
}
```

---

## Job Queue — BullMQ Worker

### Job Type: `render`

**Queue name:** `video-renders`

**Job payload:**
```typescript
interface RenderJobPayload {
  renderId: string;              // Render record ID
  projectId: string;             // Project ID
  userId: string;                // User ID (for logging)
  templateId: string;            // Template ID
  slotFills: SlotFill[];        // Filled content
  durationSeconds: number;       // From template
  fps: number;                   // From template (default 30)
}
```

### Worker Lifecycle

```
1. Worker dequeues job from "video-renders" queue
   ↓
2. Update Render record: status → PROCESSING, started_at → now
   ↓
3. Load template schema + composition from registry
   ↓
4. Build props object from slotFills:
   {
     "duration": 15,
     "fps": 30,
     "slots": {
       "photo-1": "https://minio/.../photo1.jpg",
       "photo-2": "https://minio/.../photo2.jpg",
       ...
     }
   }
   ↓
5. Write props to temp file: /tmp/{renderId}/props.json
   ↓
6. Run Remotion CLI command (see Remotion CLI Invocation below)
   ↓
7. If success:
   - Update Render record: status → DONE, output_url, minio_key, completed_at
   - Update Project record: status → "done"
   ↓
8. If failure (non-zero exit code or exception):
   - Update Render record: status → FAILED, error_message, error_code, completed_at
   - Leave Project status as "ready" (can retry)
```

### Retry Strategy

- **Max retries:** 3
- **Backoff type:** Exponential
- **Initial delay:** 5 seconds
- **Backoff multiplier:** 2
- **Max delay:** 60 seconds

Example: 1st retry after 5s, 2nd retry after 10s, 3rd retry after 20s.

### Error Handling

**Catch these exceptions and mark render FAILED:**
- Remotion CLI exit code non-zero
- File I/O errors (props.json write failed, output file not found)
- Template or component not found in registry
- Invalid props (slot fill does not exist)

**Error codes:**
- `REMOTION_CLI_FAILED` — CLI exited with non-zero code
- `INVALID_PROPS` — Props validation failed
- `TEMPLATE_NOT_FOUND` — Template not found in registry
- `FILE_SYSTEM_ERROR` — Temp directory or file I/O failed
- `STORAGE_ERROR` — MinIO upload failed

---

## Remotion CLI Invocation

### Command Format

```bash
npx remotion render \
  --props /tmp/{renderId}/props.json \
  --output /tmp/{renderId}/output.mp4 \
  --timeout 600 \
  --disable-logging \
  src/video/src/Root.tsx \
  {templateId}
```

### Props File Format

**File location:** `/tmp/{renderId}/props.json`

**File contents (JSON):**
```json
{
  "duration": 15,
  "fps": 30,
  "slots": {
    "photo-1": "https://minio.local/reelforge/uploads/user-xyz/photo1.jpg",
    "photo-2": "https://minio.local/reelforge/uploads/user-xyz/photo2.jpg",
    "headline": "My Awesome Video"
  }
}
```

### Temp Directory Structure

```
/tmp/{renderId}/
  ├── props.json          (created by worker, contains serialized props)
  └── output.mp4          (created by Remotion CLI)
```

After successful render:
- Move `output.mp4` to MinIO: `renders/{renderId}.mp4`
- Clean up `/tmp/{renderId}/` directory

### Remotion CLI Exit Codes

| Code | Meaning | Action |
|------|---------|--------|
| 0 | Success | Mark render DONE, upload to MinIO |
| 1 | Render error (bad props, component error) | Mark render FAILED, do NOT retry |
| 2 | CLI error (invalid args, missing input file) | Mark render FAILED, do NOT retry |
| other | Unknown error | Mark render FAILED, retry up to 3 times |

### Output Constraints

- **Video format:** H.264 MP4 (`.mp4`)
- **Resolution:** 1080x1920 (9:16 vertical)
- **Framerate:** 30 FPS (or as specified in template)
- **Codec:** H.264 video, AAC audio
- **Max file size:** 500 MB (reject if exceeded)

---

## MinIO/S3 Storage

### Storage Key Format

Renders stored at:
```
renders/{renderId}.mp4
```

Example: `renders/550e8400-e29b-41d4-a716-446655440000.mp4`

### Access Control

- **Dev:** MinIO local endpoint, anonymous access (auth via project ownership)
- **Prod:** S3 (Cloudflare R2), presigned URLs with 1-hour expiration
- **User access:** Only via presigned URL; project ownership verified in `GET /api/renders/:id/download`

### Presigned URL Details

- **Expiration:** 1 hour (3600 seconds)
- **Method:** GET only
- **Regeneration:** Each call to `GET /api/renders/:id/download` generates a new URL

---

## Data Types

### Render (Response)

```typescript
interface RenderResponse {
  id: string;
  projectId: string;
  userId: string;
  status: 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED';
  jobId?: string;
  minio_key?: string;
  output_url?: string;
  file_size_bytes?: number;
  started_at?: string;          // ISO 8601
  completed_at?: string;        // ISO 8601
  error_message?: string;
  error_code?: string;
  created_at: string;           // ISO 8601
  updated_at: string;           // ISO 8601
}
```

### Download Response

```typescript
interface DownloadResponse {
  id: string;
  projectId: string;
  minio_key: string;
  download_url: string;         // presigned URL
  expires_at: string;           // ISO 8601
  file_size_bytes: number;
  status: 'DONE';
}
```

---

## Status Codes Summary

| Code | Meaning | Endpoint |
|------|---------|----------|
| 200 | OK | GET status, GET download |
| 202 | Accepted | POST render |
| 400 | Bad Request | POST (invalid project), GET download (not done) |
| 401 | Unauthorized | All (missing/invalid auth) |
| 404 | Not Found | POST (project), GET status, GET download |
| 409 | Conflict | POST (not ready, already rendering) |
| 500 | Server Error | Any (unexpected error) |

---

## Error Format

All errors follow the standard format:

```json
{
  "error": "Human-readable message",
  "code": "MACHINE_CODE",
  "details": {
    "field": "additional context"
  }
}
```

---

## Example Workflows

### Workflow 1: Render a Project from Start to Download

```bash
# 1. Verify project is ready
curl http://localhost:3001/api/projects/proj-abc123 \
  -H "Authorization: Bearer token"
# → 200 with status: "ready", filledSlots: 5, requiredSlots: 5

# 2. Initiate render (returns 202 Accepted immediately)
curl -X POST http://localhost:3001/api/projects/proj-abc123/render \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{}'
# → 202 Accepted
# {
#   "id": "render-uuid-1",
#   "projectId": "proj-abc123",
#   "status": "PENDING",
#   "jobId": "job-xyz",
#   "created_at": "2026-02-23T10:00:00Z"
# }

# 3. Poll status every 2 seconds
curl http://localhost:3001/api/renders/render-uuid-1/status \
  -H "Authorization: Bearer token"
# → First response: status: PROCESSING
# → Second response: status: DONE, output_url: "https://...", file_size_bytes: 125432890

# 4. Download MP4
curl http://localhost:3001/api/renders/render-uuid-1/download \
  -H "Authorization: Bearer token"
# → 200 with download_url (presigned MinIO/S3 URL)

# 5. User follows download_url to get the MP4
curl "https://s3-presigned-url.../renders/render-uuid-1.mp4?expires=3600" \
  -o "my-video.mp4"
```

### Workflow 2: Handle Render Failure

```bash
# 1. Render fails due to missing slot fill
curl http://localhost:3001/api/renders/render-uuid-2/status \
  -H "Authorization: Bearer token"
# → 200 with status: FAILED, error_code: INVALID_PROPS, error_message: "..."

# 2. User goes back to editor, fills missing slot
curl -X PATCH http://localhost:3001/api/projects/proj-def456 \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{"slotFills": [...]}'
# → Project status changes back to "ready"

# 3. Retry render
curl -X POST http://localhost:3001/api/projects/proj-def456/render \
  -H "Authorization: Bearer token" \
  -d '{}'
# → 202 Accepted with new render ID
```

### Workflow 3: Handle Already Rendering

```bash
# User clicks render twice quickly
curl -X POST http://localhost:3001/api/projects/proj-ghi789/render \
  -H "Authorization: Bearer token" \
  -d '{}'
# → 202 Accepted with render-uuid-1

curl -X POST http://localhost:3001/api/projects/proj-ghi789/render \
  -H "Authorization: Bearer token" \
  -d '{}'
# → 409 Conflict
# {
#   "error": "Project already has an active render in progress",
#   "code": "ALREADY_RENDERING",
#   "details": {
#     "projectId": "proj-ghi789",
#     "activeRenderId": "render-uuid-1",
#     "activeRenderStatus": "PROCESSING"
#   }
# }
```

---

## Implementation Notes

### 1. Project Status Lifecycle

- When `POST /api/projects/:id/render` succeeds:
  - Create Render record with status PENDING
  - Enqueue BullMQ job
  - Do NOT yet update Project.status (it stays "ready")
  - Return 202 Accepted

- When BullMQ worker completes successfully:
  - Update Render.status → DONE
  - Update Project.status → "done"
  - Generate presigned URL for output.mp4

- When BullMQ worker fails:
  - Update Render.status → FAILED
  - Leave Project.status as "ready" (user can fix and retry)

### 2. Preventing Duplicate Renders

Before enqueuing a new render job:
1. Check for active renders on the project: `SELECT * FROM renders WHERE projectId = ? AND status IN ('PENDING', 'PROCESSING')`
2. If any exist, return 409 Conflict
3. Otherwise, create new Render record and enqueue

### 3. Presigned URL Generation

For dev (MinIO):
```typescript
const presignedUrl = await minioClient.presignedGetObject(
  'reelforge',
  `renders/${renderId}.mp4`,
  3600  // expires in 1 hour
);
```

For prod (S3/R2):
```typescript
const presignedUrl = await s3Client.getSignedUrl('GetObject', {
  Bucket: 'reelforge-renders',
  Key: `renders/${renderId}.mp4`,
  Expires: 3600
});
```

### 4. Temp File Cleanup

Always clean up `/tmp/{renderId}/` after render completes (success or failure):
```typescript
await fs.rm(`/tmp/${renderId}`, { recursive: true, force: true });
```

### 5. Component Registry Lookup

The TemplateRenderer (P1-T10) has already been implemented. When executing the Remotion CLI:
- Pass template ID as the composition name argument
- Remotion Root.tsx loads composition from the registry by ID
- Props are serialized as JSON and passed via `--props` file

### 6. Logging and Monitoring

For each render:
- Log worker start: `[RENDER] Starting render {renderId} for project {projectId}`
- Log CLI invocation: `[RENDER] Invoking Remotion CLI: npx remotion render ...`
- Log CLI output: capture stdout/stderr for debugging
- Log completion: `[RENDER] Render {renderId} completed with status {status} in {duration}ms`
- Log errors: Include full error stack trace and Remotion CLI output

### 7. Timeout Handling

- Remotion CLI timeout: 600 seconds (10 minutes)
- If CLI process times out, mark render FAILED with error_code `RENDER_TIMEOUT`
- Kill the CLI process and clean up temp files

---

## Acceptance Criteria

1. ✅ `POST /api/projects/:id/render` endpoint created
   - Validates project exists and is "ready"
   - Prevents duplicate renders (409 if already rendering)
   - Returns 202 Accepted with render ID and jobId
   - Enqueues BullMQ job

2. ✅ `GET /api/renders/:id/status` endpoint created
   - Returns render status with all fields (depends on status)
   - Returns 404 if render not found or belongs to different user
   - Supports polling from frontend

3. ✅ `GET /api/renders/:id/download` endpoint created
   - Returns presigned URL only if status is DONE
   - Returns 400 if status is not DONE
   - Presigned URL valid for 1 hour

4. ✅ BullMQ worker implemented (`src/backend/src/jobs/render.job.ts`)
   - Dequeues "render" job type from "video-renders" queue
   - Executes Remotion CLI with correct props and output paths
   - Updates Render record with status, output_url, timestamps
   - Implements retry logic (3 retries, exponential backoff)
   - Cleans up temp files on completion

5. ✅ Remotion CLI invocation fully specified
   - Exact command with all flags documented
   - Props file format (JSON, slot names and URLs)
   - Output path and file naming conventions
   - Exit code handling and error classification

6. ✅ All error cases enumerated
   - Project not found (404)
   - Project not ready (409)
   - Already rendering (409)
   - Render not found (404)
   - Render not done (400)
   - All with proper error codes and details

---

## Related Tasks

- **P1-T10** ✅ — Template Renderer (JSON → Remotion composition)
- **P1-T13** — Will implement this spec
- **P1-T14** — Build on this spec's render model
- **P1-T18** — Frontend will poll these endpoints

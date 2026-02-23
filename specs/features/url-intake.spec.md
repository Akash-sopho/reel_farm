# Video Intake API Specification

## Overview

This document specifies the REST API and job queue infrastructure for fetching Instagram and TikTok videos via yt-dlp for trend analysis. The intake pipeline collects videos from provided URLs, downloads them to MinIO/S3, extracts metadata, and makes them available for trend analysis and template extraction.

---

## Core Concepts

### Video Collection Lifecycle

```
User submits URL
  ↓ (POST /api/intake/fetch)
CollectedVideo created with status FETCHING
  ↓ (BullMQ worker picks up job)
yt-dlp fetches video, extracts metadata
  ↓ (success)
CollectedVideo status: READY
  videoUrl: MinIO path
  thumbnailUrl: extracted thumbnail
  durationSeconds, title, platform
  ↓
GET /api/intake/collections returns video in list
  ↓ (user can tag, view, analyze)

OR (if yt-dlp fails):
CollectedVideo status: FAILED
  errorMessage: yt-dlp error details
  ↓
GET /api/intake/collections returns with error_message
  ↓
User can retry or discard
```

### CollectedVideo Model

```typescript
interface CollectedVideo {
  id: string;                    // UUID, generated on creation
  userId?: string;               // foreign key to users (nullable, for org-wide collections)
  sourceUrl: string;             // original Instagram/TikTok URL
  platform: 'instagram' | 'tiktok';  // detected from URL or API response

  // Metadata (populated by yt-dlp worker)
  title?: string;                // video title/caption from source
  caption?: string;              // full caption text
  durationSeconds?: number;      // video duration in seconds

  // Storage
  videoUrl: string;              // URL to downloaded video file (MinIO path)
  thumbnailUrl?: string;         // URL to extracted thumbnail

  // Categorization
  tags: string[];                // auto-extracted or manually added tags

  // Status tracking
  status: 'FETCHING' | 'READY' | 'FAILED';
  errorMessage?: string;         // populated if status is FAILED

  // Auditing
  createdAt: string;             // ISO 8601
}
```

---

## Endpoints

### 1. POST /api/intake/fetch — Submit URLs for Collection

**Purpose:** Submit one or more Instagram/TikTok URLs to be fetched and stored.

**Request:**
```typescript
POST /api/intake/fetch
Content-Type: application/json

{
  "urls": [
    "https://www.instagram.com/reel/ABC123def456/",
    "https://www.tiktok.com/@user/video/123456789",
    "https://www.instagram.com/reel/XYZ789abc123/"
  ]
}
```

**Request validation:**
- `urls` array required
- Array length: 1–20 items (400 if exceeded)
- Each URL must be a valid Instagram or TikTok URL
  - Instagram patterns: `instagram.com/reel/{id}/`, `instagram.com/p/{id}/`
  - TikTok patterns: `tiktok.com/@{user}/video/{id}`, `vm.tiktok.com/{id}`
- 400 error if URL is invalid or not a supported platform

**Response (202 Accepted):**
```json
{
  "jobIds": [
    "bullmq-job-id-001",
    "bullmq-job-id-002",
    "bullmq-job-id-003"
  ],
  "collectedVideoIds": [
    "cv-uuid-001",
    "cv-uuid-002",
    "cv-uuid-003"
  ],
  "message": "Videos queued for collection"
}
```

**Status codes:**
- **202 Accepted** — URLs queued successfully
- **400 Bad Request** — Invalid URLs or batch too large
- **401 Unauthorized** — User not authenticated

**Error response (400 - invalid URL):**
```json
{
  "error": "Invalid or unsupported URL",
  "code": "INVALID_URL",
  "details": {
    "urls[1]": "URL must be from Instagram or TikTok"
  }
}
```

**Error response (400 - batch too large):**
```json
{
  "error": "Batch size too large",
  "code": "BATCH_TOO_LARGE",
  "details": {
    "count": 25,
    "max": 20
  }
}
```

---

### 2. GET /api/intake/collections — List Collected Videos

**Purpose:** Retrieve paginated list of collected videos with filtering options.

**Request:**
```
GET /api/intake/collections?page=1&limit=20&status=READY&tag=trending
```

**Query parameters:**
| Param | Type | Default | Max | Notes |
|-------|------|---------|-----|-------|
| `page` | int | 1 | — | 1-indexed |
| `limit` | int | 20 | 100 | items per page |
| `status` | string | — | — | filter by status: 'FETCHING', 'READY', 'FAILED' |
| `tag` | string | — | — | filter by tag (exact match, repeatable: `?tag=trending&tag=funny`) |
| `platform` | string | — | — | filter by platform: 'instagram', 'tiktok' |
| `sortBy` | string | 'createdAt' | — | sort field: 'createdAt', 'durationSeconds', 'title' |
| `sortOrder` | string | 'DESC' | — | 'ASC' or 'DESC' |

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "cv-uuid-001",
      "userId": "user-xyz",
      "sourceUrl": "https://www.instagram.com/reel/ABC123def456/",
      "platform": "instagram",
      "title": "Epic dance challenge",
      "caption": "Can you do better? #dance #challenge #trending",
      "durationSeconds": 15,
      "videoUrl": "https://minio.local/reelforge/collected-videos/cv-uuid-001.mp4",
      "thumbnailUrl": "https://minio.local/reelforge/collected-videos/cv-uuid-001-thumb.jpg",
      "tags": ["trending", "dance", "challenge"],
      "status": "READY",
      "createdAt": "2026-02-23T10:00:00Z"
    },
    {
      "id": "cv-uuid-002",
      "userId": "user-xyz",
      "sourceUrl": "https://www.tiktok.com/@user/video/123456789",
      "platform": "tiktok",
      "title": "Quick tutorial",
      "caption": "Learn this in 15 seconds",
      "durationSeconds": 12,
      "videoUrl": "https://minio.local/reelforge/collected-videos/cv-uuid-002.mp4",
      "thumbnailUrl": "https://minio.local/reelforge/collected-videos/cv-uuid-002-thumb.jpg",
      "tags": ["tutorial", "quick"],
      "status": "READY",
      "createdAt": "2026-02-23T10:05:00Z"
    },
    {
      "id": "cv-uuid-003",
      "userId": "user-xyz",
      "sourceUrl": "https://www.instagram.com/reel/XYZ789abc123/",
      "platform": "instagram",
      "title": null,
      "caption": null,
      "durationSeconds": null,
      "videoUrl": null,
      "thumbnailUrl": null,
      "tags": [],
      "status": "FETCHING",
      "errorMessage": null,
      "createdAt": "2026-02-23T10:10:00Z"
    }
  ],
  "total": 47,
  "page": 1,
  "limit": 20,
  "pages": 3
}
```

**Pagination behavior:**
- If `page > pages`, return empty `data: []` (not an error)
- If `limit > 100`, clamp to 100
- If `limit < 1`, return 400 error
- If `page < 1`, return 400 error

**Status codes:**
- **200 OK** — Success
- **400 Bad Request** — Invalid query params
- **401 Unauthorized** — User not authenticated

**Error response (400):**
```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "limit": "limit must be between 1 and 100"
  }
}
```

---

### 3. PATCH /api/intake/videos/:id — Update Collected Video

**Purpose:** Update tags or metadata on a collected video (e.g., add manual tags for organization).

**Request:**
```typescript
PATCH /api/intake/videos/:id
Content-Type: application/json

{
  "tags": ["favorite", "inspiration", "aesthetic"],
  "caption": "Custom note about this video"
}
```

**Request schema:**
```typescript
interface UpdateCollectedVideoRequest {
  tags?: string[];    // replace entire tags array
  caption?: string;   // user-provided custom caption (separate from source caption)
}
```

**Validation rules:**
- `tags` array (if provided): each tag max 30 characters, max 20 tags total
- `caption` (if provided): max 500 characters
- At least one field must be provided

**Response (200 OK):**
```json
{
  "id": "cv-uuid-001",
  "userId": "user-xyz",
  "sourceUrl": "https://www.instagram.com/reel/ABC123def456/",
  "platform": "instagram",
  "title": "Epic dance challenge",
  "caption": "Custom note about this video",
  "durationSeconds": 15,
  "videoUrl": "https://minio.local/reelforge/collected-videos/cv-uuid-001.mp4",
  "thumbnailUrl": "https://minio.local/reelforge/collected-videos/cv-uuid-001-thumb.jpg",
  "tags": ["favorite", "inspiration", "aesthetic"],
  "status": "READY",
  "createdAt": "2026-02-23T10:00:00Z",
  "updatedAt": "2026-02-23T11:30:00Z"
}
```

**Status codes:**
- **200 OK** — Updated successfully
- **400 Bad Request** — Validation error
- **404 Not Found** — Video not found
- **401 Unauthorized** — User not authenticated or not video owner

**Error response (400 - too many tags):**
```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "tags": "Maximum 20 tags allowed"
  }
}
```

**Error response (404):**
```json
{
  "error": "Collected video not found",
  "code": "NOT_FOUND",
  "details": {
    "videoId": "cv-xyz-999"
  }
}
```

---

## Job Queue — BullMQ Worker

### Job Type: `collect-video`

**Queue name:** `video-collection`

**Job payload:**
```typescript
interface CollectVideoJobPayload {
  collectedVideoId: string;      // CollectedVideo record ID
  sourceUrl: string;             // Original Instagram/TikTok URL
  platform: 'instagram' | 'tiktok';
  userId?: string;               // User who submitted (for access control)
}
```

### Worker Lifecycle

```
1. Worker dequeues job from "video-collection" queue
   ↓
2. Update CollectedVideo record: status → FETCHING
   ↓
3. Invoke yt-dlp to download video from sourceUrl
   Command: yt-dlp --quiet --no-warnings \
     -o /tmp/{collectedVideoId}/video.mp4 \
     -w \
     {sourceUrl}
   ↓
4. Extract metadata (title, duration, thumbnail)
   Command: yt-dlp --quiet --no-warnings \
     -j {sourceUrl}
   Extract: title, duration (in seconds), uploader
   ↓
5. If success:
   - Upload video to MinIO: collected-videos/{collectedVideoId}.mp4
   - Extract and upload thumbnail (first frame): collected-videos/{collectedVideoId}-thumb.jpg
   - Update CollectedVideo: status → READY, videoUrl, thumbnailUrl, durationSeconds, title
   - Auto-extract tags from title/caption (simple keyword extraction)
   ↓
6. If failure (yt-dlp error, upload error, etc.):
   - Update CollectedVideo: status → FAILED, errorMessage
   - Log error details for debugging
```

### Retry Strategy

- **Max retries:** 3
- **Backoff type:** Exponential
- **Initial delay:** 3 seconds
- **Backoff multiplier:** 2
- **Max delay:** 60 seconds

Example: 1st retry after 3s, 2nd retry after 6s, 3rd retry after 12s.

**Do NOT retry on these errors:**
- Invalid URL format (already validated on submission)
- Private video (access denied)
- Deleted/removed video (404 from yt-dlp)

**DO retry on these errors:**
- Network timeout
- yt-dlp temporary failures
- MinIO connection errors

### Error Handling

**Catch these exceptions and mark video FAILED:**
- yt-dlp non-zero exit code (for transient errors, check code before retrying)
- File I/O errors (temp directory creation, file write)
- MinIO upload errors
- Video already exists (should not happen with UUID keys)

**Error codes:**
- `YTDLP_FAILED` — yt-dlp exited with error
- `YTDLP_PRIVATE` — Video is private/inaccessible
- `YTDLP_NOT_FOUND` — Video deleted or removed
- `FILE_SYSTEM_ERROR` — Temp directory or file I/O failed
- `STORAGE_ERROR` — MinIO upload failed
- `METADATA_EXTRACTION_FAILED` — Could not extract metadata

---

## yt-dlp Invocation Details

### Download Command

```bash
yt-dlp --quiet --no-warnings \
  -o /tmp/{collectedVideoId}/video.mp4 \
  -w \
  {sourceUrl}
```

**Flags:**
- `--quiet` — suppress verbose output
- `--no-warnings` — suppress warnings
- `-o` — output file path (template)
- `-w` — overwrite without asking
- `--socket-timeout 30` — 30-second socket timeout (add if network issues)

### Metadata Extraction Command

```bash
yt-dlp --quiet --no-warnings \
  -j \
  {sourceUrl}
```

**Output format (JSON):**
```json
{
  "id": "video-id",
  "title": "Video Title",
  "uploader": "Creator Name",
  "duration": 15,
  "upload_date": "20260223",
  "description": "Full caption text",
  "webpage_url": "https://..."
}
```

**Fields extracted by worker:**
- `title` → CollectedVideo.title
- `duration` → CollectedVideo.durationSeconds
- `uploader` → used for platform attribution
- `description` → CollectedVideo.caption

### Temp Directory Structure

```
/tmp/{collectedVideoId}/
  ├── video.mp4           (created by yt-dlp, moved to MinIO)
  └── metadata.json       (created by worker, temp storage)
```

After successful upload:
- Move `video.mp4` to MinIO: `collected-videos/{collectedVideoId}.mp4`
- Extract first frame as thumbnail and upload to MinIO: `collected-videos/{collectedVideoId}-thumb.jpg`
- Clean up `/tmp/{collectedVideoId}/` directory

### Exit Codes

| Code | Meaning | Action |
|------|---------|--------|
| 0 | Success | Upload to MinIO, mark READY |
| 1 | Generic error | Retry up to 3 times |
| 2 | Network error | Retry up to 3 times |
| 101 | Private video | Mark FAILED, do NOT retry (error_code: YTDLP_PRIVATE) |
| 102 | Not found | Mark FAILED, do NOT retry (error_code: YTDLP_NOT_FOUND) |
| other | Unknown | Retry up to 3 times |

---

## MinIO/S3 Storage

### Storage Keys

Videos stored at:
```
collected-videos/{collectedVideoId}.mp4
collected-videos/{collectedVideoId}-thumb.jpg
```

Example:
```
collected-videos/550e8400-e29b-41d4-a716-446655440000.mp4
collected-videos/550e8400-e29b-41d4-a716-446655440000-thumb.jpg
```

### File Constraints

- **Video format:** MP4 (.mp4)
- **Video codec:** H.264
- **Audio codec:** AAC
- **Max file size:** 500 MB (reject if exceeded)
- **Thumbnail format:** JPEG (.jpg)
- **Thumbnail size:** max 1280x720

### Access Control

- **Dev:** MinIO local endpoint, anonymous access (auth via user ownership)
- **Prod:** S3 (Cloudflare R2), no presigned URLs needed for internal storage
- **User access:** Videos available via `GET /api/intake/collections` response (direct MinIO/S3 URLs for authenticated users)

---

## Data Types

### CollectedVideo (Response)

```typescript
interface CollectedVideoResponse {
  id: string;
  userId?: string;
  sourceUrl: string;
  platform: 'instagram' | 'tiktok';
  title?: string;
  caption?: string;
  durationSeconds?: number;
  videoUrl?: string;
  thumbnailUrl?: string;
  tags: string[];
  status: 'FETCHING' | 'READY' | 'FAILED';
  errorMessage?: string;
  createdAt: string;           // ISO 8601
  updatedAt?: string;          // ISO 8601 (on updates)
}
```

### Paginated Response

```typescript
interface PaginatedCollectedVideoResponse {
  data: CollectedVideoResponse[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}
```

### Job Payload

```typescript
interface CollectVideoJobPayload {
  collectedVideoId: string;
  sourceUrl: string;
  platform: 'instagram' | 'tiktok';
  userId?: string;
}
```

---

## Status Codes Summary

| Code | Meaning | Endpoint |
|------|---------|----------|
| 200 | OK | PATCH, GET list |
| 202 | Accepted | POST fetch |
| 400 | Bad Request | Invalid URLs, batch size, params |
| 401 | Unauthorized | All (missing/invalid auth) |
| 404 | Not Found | PATCH (video not found) |
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

## Rate Limiting & Performance

### Collection Rate Limits

- **3-second minimum interval** between yt-dlp invocations (to avoid overwhelming Instagram/TikTok servers)
- **Maximum concurrent jobs:** 5 workers processing videos simultaneously
- **Job timeout:** 120 seconds per video (if yt-dlp doesn't finish, kill job and mark FAILED)

### Queue Configuration

```typescript
interface QueueSettings {
  maxConcurrency: 5;           // max 5 videos downloading simultaneously
  rate: {
    maxCount: 1,               // 1 job...
    intervalMs: 3000           // ...every 3 seconds
  };
  timeout: 120000;             // 120-second timeout per job
}
```

---

## Example Workflows

### Workflow 1: Collect and View Videos

```bash
# 1. Submit three URLs for collection
curl -X POST http://localhost:3001/api/intake/fetch \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{
    "urls": [
      "https://www.instagram.com/reel/ABC123def456/",
      "https://www.tiktok.com/@user/video/123456789",
      "https://www.instagram.com/reel/XYZ789abc123/"
    ]
  }'
# → 202 Accepted
# {
#   "jobIds": ["job-1", "job-2", "job-3"],
#   "collectedVideoIds": ["cv-1", "cv-2", "cv-3"],
#   "message": "Videos queued for collection"
# }

# 2. Poll collection status every 2 seconds
curl http://localhost:3001/api/intake/collections \
  -H "Authorization: Bearer token"
# → 200 with initial FETCHING status
# After yt-dlp completes:
# → 200 with READY status, videoUrl, thumbnailUrl, durationSeconds

# 3. Add tags to a collected video
curl -X PATCH http://localhost:3001/api/intake/videos/cv-1 \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{
    "tags": ["favorite", "inspiration", "aesthetic"]
  }'
# → 200 with updated tags

# 4. Filter by tags
curl http://localhost:3001/api/intake/collections?tag=favorite&tag=inspiration \
  -H "Authorization: Bearer token"
# → 200 with filtered list
```

### Workflow 2: Handle Collection Failure

```bash
# 1. Submit URL that later fails
curl -X POST http://localhost:3001/api/intake/fetch \
  -H "Authorization: Bearer token" \
  -d '{"urls": ["https://www.instagram.com/reel/DELETED123/"]}'
# → 202 Accepted

# 2. Poll status and see FAILED after retries exhausted
curl http://localhost:3001/api/intake/collections?status=FAILED \
  -H "Authorization: Bearer token"
# → 200 with status: FAILED, errorMessage: "Video not found (404 from yt-dlp)"

# 3. Retry collection with correct URL
curl -X POST http://localhost:3001/api/intake/fetch \
  -H "Authorization: Bearer token" \
  -d '{"urls": ["https://www.instagram.com/reel/CORRECTID/"]}'
# → 202 Accepted with new collectedVideoId
```

### Workflow 3: Filter and Organize

```bash
# Filter by platform and status
curl "http://localhost:3001/api/intake/collections?platform=instagram&status=READY&sortBy=durationSeconds&sortOrder=ASC" \
  -H "Authorization: Bearer token"
# → 200 with Instagram videos sorted by duration (shortest first)

# Filter by multiple tags
curl "http://localhost:3001/api/intake/collections?tag=trending&tag=dance&limit=50" \
  -H "Authorization: Bearer token"
# → 200 with videos tagged both "trending" and "dance"
```

---

## Implementation Notes

### 1. Platform Detection

Detect platform from URL before submission:
```typescript
function detectPlatform(url: string): 'instagram' | 'tiktok' | null {
  if (url.includes('instagram.com')) return 'instagram';
  if (url.includes('tiktok.com')) return 'tiktok';
  if (url.includes('vm.tiktok.com')) return 'tiktok';
  if (url.includes('vt.tiktok.com')) return 'tiktok';
  return null;
}
```

### 2. yt-dlp Installation

yt-dlp must be installed in the backend container:
```dockerfile
RUN apt-get update && apt-get install -y yt-dlp && rm -rf /var/lib/apt/lists/*
```

Or via Python pip:
```dockerfile
RUN pip install yt-dlp
```

### 3. Temp Directory Cleanup

Always clean up `/tmp/{collectedVideoId}/` after processing:
```typescript
await fs.rm(`/tmp/${collectedVideoId}`, { recursive: true, force: true });
```

### 4. Thumbnail Extraction

Extract first frame of video as thumbnail using FFmpeg or similar:
```bash
ffmpeg -i /tmp/{collectedVideoId}/video.mp4 \
  -ss 00:00:00 -vframes 1 \
  -scale 1280:720 \
  /tmp/{collectedVideoId}-thumb.jpg
```

Or use yt-dlp's built-in thumbnail extraction:
```bash
yt-dlp --quiet --no-warnings \
  --write-thumbnail \
  -o /tmp/{collectedVideoId}/video.mp4 \
  {sourceUrl}
```

### 5. Auto-Tag Extraction

Simple keyword extraction from title and caption:
```typescript
function extractTags(title: string, caption: string): string[] {
  const text = (title + ' ' + caption).toLowerCase();
  const keywords = text.match(/#\w+/g) || [];  // hashtags
  const commonWords = ['trending', 'viral', 'challenge', 'tutorial', 'dance', 'funny', 'music'];
  const extracted = keywords.map(k => k.slice(1));
  return [...new Set(extracted)].slice(0, 10);  // max 10 tags
}
```

### 6. URL Validation

Validate URLs on submission:
```typescript
const validPatterns = [
  /^https:\/\/(www\.)?instagram\.com\/reel\/[\w-]+\//,
  /^https:\/\/(www\.)?instagram\.com\/p\/[\w-]+\//,
  /^https:\/\/(www\.)?tiktok\.com\/@[\w.-]+\/video\/\d+/,
  /^https:\/\/(vm|vt)\.tiktok\.com\/[\w]+/,
];

function isValidUrl(url: string): boolean {
  return validPatterns.some(pattern => pattern.test(url));
}
```

### 7. Logging and Monitoring

For each collection job:
- Log worker start: `[COLLECT] Starting collection {collectedVideoId} from {platform}`
- Log yt-dlp start: `[COLLECT] Invoking yt-dlp for {sourceUrl}`
- Log metadata: `[COLLECT] Extracted metadata: title="{title}", duration={duration}s`
- Log completion: `[COLLECT] Collection {collectedVideoId} completed with status {status} in {duration}ms`
- Log errors: Include full yt-dlp stderr output

### 8. Handling Rate Limits

If Instagram/TikTok rate-limits yt-dlp:
- Catch HTTP 429 response
- Wait exponentially longer between requests (already handled by backoff strategy)
- Log warning if max retries exhausted

---

## Acceptance Criteria

1. ✅ `POST /api/intake/fetch` endpoint created
   - Validates 1–20 URLs in batch
   - Detects platform (Instagram/TikTok)
   - Creates CollectedVideo records
   - Enqueues BullMQ jobs
   - Returns 202 Accepted with jobIds and collectedVideoIds

2. ✅ `GET /api/intake/collections` endpoint created
   - Returns paginated list of CollectedVideo
   - Supports filtering by status, platform, tag, sort options
   - Handles pagination correctly (1-indexed pages, limit clamping)
   - Returns different fields depending on status (FETCHING vs. READY)

3. ✅ `PATCH /api/intake/videos/:id` endpoint created
   - Updates tags or caption on collected video
   - Returns 200 with updated record
   - Returns 404 if video not found

4. ✅ BullMQ worker implemented (`src/backend/src/jobs/collect-video.job.ts`)
   - Dequeues "collect-video" job type from "video-collection" queue
   - Executes yt-dlp to download video and extract metadata
   - Uploads video and thumbnail to MinIO with correct keys
   - Updates CollectedVideo with videoUrl, thumbnailUrl, status, durationSeconds
   - Implements retry logic (3 retries, exponential backoff 3s→6s→12s)
   - Marks FAILED with error_code if retries exhausted
   - Auto-extracts tags from metadata
   - Cleans up temp files on completion

5. ✅ yt-dlp invocation fully specified
   - Exact download command with flags
   - Exact metadata extraction command
   - Exit codes documented (0=success, 1/2=retry, 101/102=no-retry)
   - Temp file handling and cleanup
   - MinIO storage key format: `collected-videos/{collectedVideoId}.mp4`

6. ✅ All error cases enumerated
   - Invalid URLs (400)
   - Batch too large (400)
   - Video not found (404)
   - Validation errors (400)
   - All with proper error codes and details

7. ✅ Rate limiting specified
   - 3-second minimum interval between yt-dlp calls
   - Maximum 5 concurrent jobs
   - 120-second timeout per video

---

## Related Tasks

- **P0-T03** ✅ — Database schema with CollectedVideo model
- **P1.5-T02** — Will implement yt-dlp fetcher service (using this spec)
- **P1.5-T03** — Will implement intake API + BullMQ worker (using this spec)
- **P1.5-T04** — Frontend will consume these endpoints
- **P1.5-T05** — Integration tests for intake pipeline (using this spec)

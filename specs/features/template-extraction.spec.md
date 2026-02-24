# Template Extraction Pipeline — Specification

## Overview

ReelForge's **Template Extraction Pipeline** enables AI-powered creation of new video templates from collected Instagram Reels and TikTok videos. The pipeline consists of two sequential stages:

1. **Video Analysis** — extract keyframes, detect scenes, identify text overlays, analyze visual composition
2. **Template Extraction** — convert structured analysis into a draft TemplateSchema (scenes, slots, components)

A supervisor can review and publish extracted templates to the public gallery, or discard low-quality drafts.

---

## Workflow

```
[Collected Video]
    ↓
[User triggers Analysis] → POST /api/intake/videos/:id/analyze (enqueues BullMQ job)
    ↓
[Analysis Worker] → ffmpeg keyframes + GPT-4o Vision → VideoAnalysis JSON
    ↓
[User checks result] → GET /api/intake/videos/:id/analysis
    ↓
[User triggers Extraction] → POST /api/templates/extract → enqueues extraction job
    ↓
[Extraction Worker] → GPT-4o + VideoAnalysis → draft TemplateSchema
    ↓
[Draft saved] → GET /api/templates/drafts (list unpublished templates)
    ↓
[Supervisor reviews & publishes] → PATCH /api/templates/:id/publish
    ↓
[Template live] → available in gallery
```

---

## Part 1: Video Analysis Pipeline

### Endpoint: POST /api/intake/videos/:id/analyze

**Purpose:** Enqueue a BullMQ job to analyze a collected video by extracting keyframes and running vision detection.

**Request:**
```json
{
  "videoId": "clx1a2b3c4d5e6f7g8h9i0j1k"
}
```

**Response (202 Accepted):**
```json
{
  "videoId": "clx1a2b3c4d5e6f7g8h9i0j1k",
  "status": "ANALYZING",
  "startedAt": "2026-02-24T10:30:00Z"
}
```

**Behavior:**
- Validate that the video exists and `downloadStatus === 'COMPLETED'`
- Set `analysisStatus` to `ANALYZING` and clear any previous `analysisResult`
- Enqueue a BullMQ job named `video-analysis` with `{ videoId }`
- Return 202 with job tracking info

**Error Codes:**
- `VIDEO_NOT_FOUND` (404) — video ID doesn't exist
- `VIDEO_NOT_READY` (400) — video hasn't finished downloading yet
- `ANALYSIS_ALREADY_IN_PROGRESS` (409) — another analysis job is already running for this video

---

### Endpoint: GET /api/intake/videos/:id/analysis

**Purpose:** Retrieve the latest analysis result and status for a video.

**Response (200 OK):**
```json
{
  "videoId": "clx1a2b3c4d5e6f7g8h9i0j1k",
  "status": "ANALYZED",
  "completedAt": "2026-02-24T10:32:15Z",
  "analysis": {
    "sceneCount": 3,
    "durationSeconds": 15,
    "fps": 30,
    "scenes": [
      {
        "frameNumber": 0,
        "timestamp": 0,
        "durationEstimate": 5,
        "frameUrl": "s3://bucket/videos/abc123/frame-0000.jpg",
        "backgroundType": "image",
        "dominantColors": ["#FF6B6B", "#FFE66D", "#95E1D3"],
        "detectedText": [
          {
            "text": "Summer Vibes",
            "position": { "x": 0.1, "y": 0.2 },
            "fontSize": "large",
            "color": "#FFFFFF",
            "confidence": 0.95
          }
        ],
        "animationCues": ["fade_in", "text_slide"]
      },
      {
        "frameNumber": 150,
        "timestamp": 5,
        "durationEstimate": 5,
        "frameUrl": "s3://bucket/videos/abc123/frame-0150.jpg",
        "backgroundType": "video",
        "dominantColors": ["#1A1A1A", "#CCCCCC"],
        "detectedText": [],
        "animationCues": []
      },
      {
        "frameNumber": 300,
        "timestamp": 10,
        "durationEstimate": 5,
        "frameUrl": "s3://bucket/videos/abc123/frame-0300.jpg",
        "backgroundType": "solid",
        "dominantColors": ["#000000"],
        "detectedText": [
          {
            "text": "Follow for more!",
            "position": { "x": 0.3, "y": 0.8 },
            "fontSize": "medium",
            "color": "#FFFFFF",
            "confidence": 0.88
          }
        ],
        "animationCues": ["fade_out"]
      }
    ]
  }
}
```

**Status values:**
- `UNANALYZED` — no analysis has been attempted yet
- `ANALYZING` — job is in progress
- `ANALYZED` — analysis completed successfully, `analysis` field is populated
- `FAILED` — analysis encountered an error, `errorMessage` field populated

**Responses:**
- 200 OK — analysis exists (any status)
- 404 — video not found
- 202 Accepted — analysis still processing (also valid, include `status: "ANALYZING"`)

---

## Part 2: Template Extraction Pipeline

### Endpoint: POST /api/templates/extract

**Purpose:** Convert a completed video analysis into a draft TemplateSchema.

**Request:**
```json
{
  "collectedVideoId": "clx1a2b3c4d5e6f7g8h9i0j1k",
  "name": "Summer Photos Carousel",
  "category": "carousel",
  "description": "Trending photo slideshow template extracted from viral Reel"
}
```

**Response (202 Accepted):**
```json
{
  "templateId": "clx9z8y7x6w5v4u3t2s1r0q",
  "status": "EXTRACTING",
  "startedAt": "2026-02-24T10:35:00Z"
}
```

**Behavior:**
- Validate that the video exists and `analysisStatus === 'ANALYZED'`
- Create a new `Template` with `isPublished: false`, `extractedFromVideoId`, and metadata above
- Set `extractionStatus: 'EXTRACTING'`
- Enqueue a BullMQ job `template-extraction` with `{ templateId, videoAnalysis }`
- Return 202

**Error Codes:**
- `VIDEO_NOT_FOUND` (404)
- `ANALYSIS_NOT_READY` (400) — video hasn't been analyzed or analysis failed
- `EXTRACTION_ALREADY_IN_PROGRESS` (409) — extraction job already running for this template

---

### Endpoint: GET /api/templates/drafts

**Purpose:** List all unpublished (extracted) templates awaiting supervisor review.

**Query Parameters:**
- `status` (optional) — filter by extraction status: `EXTRACTING`, `COMPLETED`, `FAILED`
- `sortBy` (optional, default `createdAt`) — `createdAt`, `name`, `sceneCount`
- `order` (optional, default `desc`) — `asc`, `desc`
- `limit` (optional, default 50) — pagination limit
- `offset` (optional, default 0) — pagination offset

**Response (200 OK):**
```json
{
  "drafts": [
    {
      "id": "clx9z8y7x6w5v4u3t2s1r0q",
      "name": "Summer Photos Carousel",
      "category": "carousel",
      "description": "Trending photo slideshow template extracted from viral Reel",
      "isPublished": false,
      "extractionStatus": "COMPLETED",
      "extractedFromVideoId": "clx1a2b3c4d5e6f7g8h9i0j1k",
      "sceneCount": 3,
      "slotCount": 6,
      "createdAt": "2026-02-24T10:36:45Z",
      "completedAt": "2026-02-24T10:37:12Z",
      "quality": {
        "score": 0.87,
        "issues": [
          "Scene 2 has no detected text overlay",
          "Recommend 4-5 photos instead of 3"
        ]
      }
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

---

### Endpoint: PATCH /api/templates/:id/publish

**Purpose:** Supervisor reviews a draft and either publishes it to the gallery or marks it as rejected.

**Request:**
```json
{
  "action": "publish",
  "revisions": {
    "name": "Summer Photos Carousel v2",
    "slotNames": {
      "photo_1": "Photo 1 (Required)",
      "photo_2": "Photo 2 (Optional)"
    }
  }
}
```

OR

```json
{
  "action": "reject",
  "reason": "Quality score too low, OCR detected watermarks"
}
```

**Response (200 OK):**
```json
{
  "id": "clx9z8y7x6w5v4u3t2s1r0q",
  "name": "Summer Photos Carousel v2",
  "isPublished": true,
  "publishedAt": "2026-02-24T10:40:00Z"
}
```

**Behavior on `publish`:**
- Validate user is admin or supervisor role
- Merge `revisions` into the template if provided
- Set `isPublished: true`, `publishedAt: now()`
- Return 200

**Behavior on `reject`:**
- Set `isPublished: false`, `rejectionReason: reason`
- Set `extractionStatus: 'REJECTED'`
- Return 200

**Error Codes:**
- `TEMPLATE_NOT_FOUND` (404)
- `NOT_A_DRAFT` (400) — template is already published
- `UNAUTHORIZED` (403) — user is not an admin/supervisor

---

## Part 8: Batch Extraction + Auto-Seeding

### Endpoint: POST /api/templates/batch-extract

**Purpose:** Extract templates from multiple collected videos in parallel, with automatic publishing of high-quality templates.

**Request:**
```json
{
  "collectedVideoIds": [
    "clx1a2b3c4d5e6f7g8h9i0j1k",
    "clx2a2b3c4d5e6f7g8h9i0j2k",
    "clx3a2b3c4d5e6f7g8h9i0j3k"
  ],
  "autoSeedThreshold": 0.75,
  "templateDefaults": {
    "category": "trending",
    "tags": ["auto-extracted", "viral"]
  }
}
```

**Request Fields:**
- `collectedVideoIds` (required) — array of 1–100 video IDs; all must have `analysisStatus === 'ANALYZED'`
- `autoSeedThreshold` (optional, default 0.75) — quality score threshold (0–1) above which templates are auto-published
- `templateDefaults` (optional) — default category and tags to apply to all extracted templates

**Response (202 Accepted):**
```json
{
  "batchId": "batch_clx4a2b3c4d5e6f7g8h9i0j4k",
  "totalCount": 3,
  "pendingCount": 3,
  "completedCount": 0,
  "failedCount": 0,
  "templates": [
    {
      "templateId": "clx5a2b3c4d5e6f7g8h9i0j5k",
      "collectedVideoId": "clx1a2b3c4d5e6f7g8h9i0j1k",
      "jobId": "job_id_1",
      "status": "EXTRACTING",
      "startedAt": "2026-02-24T10:50:00Z"
    },
    {
      "templateId": "clx6a2b3c4d5e6f7g8h9i0j6k",
      "collectedVideoId": "clx2a2b3c4d5e6f7g8h9i0j2k",
      "jobId": "job_id_2",
      "status": "EXTRACTING",
      "startedAt": "2026-02-24T10:50:00Z"
    },
    {
      "templateId": "clx7a2b3c4d5e6f7g8h9i0j7k",
      "collectedVideoId": "clx3a2b3c4d5e6f7g8h9i0j3k",
      "jobId": "job_id_3",
      "status": "EXTRACTING",
      "startedAt": "2026-02-24T10:50:00Z"
    }
  ],
  "message": "Batch extraction enqueued for 3 videos"
}
```

**Behavior:**
1. Validate that all video IDs exist and have `analysisStatus === 'ANALYZED'`
2. For each video:
   - Create a new Template record with status `extracting`, seed with `templateDefaults` if provided
   - Enqueue a `template-extraction` BullMQ job
3. Do NOT wait for any jobs to complete; return immediately with 202
4. **Auto-seeding:** In the extraction worker, after successfully extracting a template:
   - If quality score ≥ `autoSeedThreshold`, automatically set `isPublished: true` and `publishedAt: now()`
   - If quality score < threshold, leave as draft for manual review
5. Return 202 with array of template tracking objects

**Error Codes:**
- `INVALID_BATCH_SIZE` (400) — 0 or >100 video IDs
- `VIDEO_NOT_FOUND` (404) — one or more video IDs don't exist
- `VIDEO_NOT_ANALYZED` (400) — one or more videos have `analysisStatus !== 'ANALYZED'`

**Auto-Seeding Behavior:**
- Default threshold: 0.75 (75% quality)
- High-quality templates (≥ 0.75) → auto-published, available in gallery immediately
- Medium-quality templates (0.6–0.74) → published as drafts for supervisor review
- Low-quality templates (< 0.6) → marked as rejected with quality issue details

---

## Part 3: Database Schema Changes

### Updated `CollectedVideo` Table

Add three new columns:

```prisma
model CollectedVideo {
  id                String    @id @default(cuid())
  url               String
  downloadStatus    String    @default("PENDING") // PENDING | DOWNLOADING | COMPLETED | FAILED
  downloadedPath    String?
  metadata          Json?

  // NEW FIELDS:
  analysisStatus    String    @default("UNANALYZED") // UNANALYZED | ANALYZING | ANALYZED | FAILED
  analysisResult    Json?                             // VideoAnalysis JSON (null until ANALYZED)
  analysisError     String?

  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  userId            String
  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### Updated `Template` Table

Add extraction-related fields:

```prisma
model Template {
  id                String    @id @default(cuid())
  name              String
  category          String
  description       String?
  schema            Json      // TemplateSchema (scenes, slots, components)
  isPublished       Boolean   @default(false)

  // NEW FIELDS:
  extractedFromVideoId    String?
  extractionStatus        String? // EXTRACTING | COMPLETED | FAILED | REJECTED (null for manually created)
  extractionError         String?
  extractionQuality       Json?   // { score: 0-1, issues: [] }
  rejectionReason         String?
  publishedAt             DateTime?

  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  userId            String
  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

---

## Part 4: VideoAnalysis JSON Shape

Complete specification of the `analysisResult` JSON structure stored in `CollectedVideo.analysisResult`:

```typescript
interface VideoAnalysis {
  // Metadata
  videoId: string;
  durationSeconds: number;
  fps: number;
  resolution: {
    width: number;
    height: number;
  };
  sceneCount: number;
  analysisStartedAt: string; // ISO 8601
  analysisCompletedAt: string;
  ffmpegVersion: string;
  gpt4oModel: string;

  // Per-scene analysis
  scenes: VideoScene[];
}

interface VideoScene {
  // Frame extraction metadata
  sceneIndex: number;           // 0-indexed scene number
  frameNumber: number;          // absolute frame number in video
  timestamp: number;            // seconds in video
  durationEstimate: number;     // estimated duration of this scene (seconds)
  frameUrl: string;             // S3/MinIO URL to extracted JPEG

  // Visual composition
  backgroundType: "image" | "video" | "solid" | "gradient" | "unknown";
  dominantColors: string[];     // hex codes, e.g. ["#FF6B6B", "#FFE66D"]
  brightness: number;           // 0-100, rough estimate
  contrast: number;             // 0-100, rough estimate

  // Text detection (via GPT-4o Vision OCR)
  detectedText: DetectedTextOverlay[];

  // Animation cues (heuristics from GPT-4o analysis)
  animationCues: string[];       // e.g. ["fade_in", "text_slide", "pan_left"]

  // Confidence scores
  confidenceScore: number;       // 0-1, overall scene analysis confidence
}

interface DetectedTextOverlay {
  text: string;
  position: {
    x: number;                   // 0-1, normalized X coordinate (left to right)
    y: number;                   // 0-1, normalized Y coordinate (top to bottom)
  };
  fontSize: "small" | "medium" | "large" | "extra_large";
  fontWeight: "normal" | "bold" | "extra_bold";
  color: string;                 // hex code, e.g. "#FFFFFF"
  backgroundColor?: string;      // hex code if text has a background
  alignment: "left" | "center" | "right";
  confidence: number;            // 0-1, OCR confidence
}
```

---

## Part 5: ffmpeg Keyframe Extraction

### Command

The video analysis worker uses `ffmpeg` to extract keyframes at scene boundaries:

```bash
ffmpeg \
  -i "<input_video_path>" \
  -vf "fps=1,select='eq(pict_type,I)'" \
  -vsync 0 \
  "<output_dir>/frame-%04d.jpg"
```

**Explanation:**
- `-i <input_video_path>` — input video file
- `-vf "fps=1,select='eq(pict_type,I)'"` — extract 1 frame per second, prioritizing keyframes (I-frames)
- `-vsync 0` — output one image per selected frame
- `<output_dir>/frame-%04d.jpg` — output pattern (frame-0000.jpg, frame-0001.jpg, etc.)

**Post-processing in Node.js:**
1. Parse output frame directory
2. Limit to ~10–20 frames maximum (for 15-60 second videos)
3. For each frame: generate thumbnail JPEG (~300px width) and upload to MinIO/S3
4. Record the URL and timestamp

---

## Part 6: GPT-4o Vision Analysis Prompt

### System Prompt

```
You are an expert video template designer and visual content analyzer.
Your task is to analyze a single keyframe from a short-form video and extract
structured information about its visual design, layout, animations, and text content.

Return a JSON object with the following fields:
- backgroundType: one of "image", "video", "solid", "gradient", "unknown"
- dominantColors: array of 3-5 hex color codes found in the image
- brightness: 0-100 scale
- contrast: 0-100 scale
- detectedText: array of text overlays with position, size, color, confidence
- animationCues: array of suspected animation types based on visual clues
- confidenceScore: 0-1 overall confidence in this analysis

Be conservative: if you are uncertain about a field, set confidence to <0.5 or omit it.
```

### User Prompt (per-frame)

```
Analyze this keyframe from a 9:16 short-form video (Instagram Reel or TikTok).
Frame number: {frameNumber}
Timestamp: {timestamp}s
Video duration: {videoDuration}s

Describe:
1. What is the background? (solid color, photo, video clip, etc.)
2. What text overlays do you see? (transcribe exactly, note position and style)
3. What color palette dominates? (3-5 main colors)
4. What animation or transition effects might be applied? (fade, slide, zoom, etc.)
5. Overall visual design quality (1-10)?

Return ONLY a valid JSON object with these fields:
{
  "backgroundType": "...",
  "dominantColors": [...],
  "brightness": ...,
  "contrast": ...,
  "detectedText": [...],
  "animationCues": [...],
  "confidenceScore": ...
}
```

**Implementation Notes:**
- Send each frame as a base64-encoded JPEG in the request
- Retry on failure (max 3 attempts per frame)
- If GPT-4o fails, set `analysisStatus: 'FAILED'` and log the error
- Rate-limit calls to respect OpenAI quota

---

## Part 7: Template Schema Generation

### Extraction Logic (GPT-4o Prompting)

Given a completed `VideoAnalysis` with detected scenes, text, and colors, the extraction worker prompts GPT-4o to:

1. **Identify scene structure** — map detected scenes to Remotion composition structure
2. **Slot definition** — detect where user content (images, text) should go
3. **Component selection** — assign Remotion components (StaticImage, AnimatedText, FadeTransition, etc.)
4. **Timing & layout** — use scene duration estimates and positions to populate animation timings

### GPT-4o Extraction Prompt

```
You are a template designer. I have analyzed a short-form video and extracted scenes with visual information.

Video Analysis:
{full VideoAnalysis JSON}

Based on this analysis, generate a template schema that recreates this video's visual design.

Requirements:
1. Define scenes matching the detected scenes (one per extracted keyframe)
2. For each scene, specify:
   - duration (use durationEstimate)
   - layout (width: 1080, height: 1920 for 9:16)
   - components (use Remotion component registry: StaticImage, KenBurnsImage, AnimatedText, TypewriterText, GrainOverlay, FadeTransition)
3. Create slots for user-provided content:
   - Image slots: one per detected image area
   - Text slots: one per detected text overlay (preserving position and style hints)
4. Use detectedText to populate default slot names and descriptions
5. Use animationCues to suggest animation types
6. Reference components from the component registry by ID
7. Return a valid TemplateSchema JSON

Component Registry:
- StaticImage: display image at fixed position
- KenBurnsImage: display image with subtle zoom/pan
- AnimatedText: render text with fade-in animation
- TypewriterText: render text with typewriter effect
- GrainOverlay: add film grain texture
- FadeTransition: fade between scenes

Return ONLY a valid TemplateSchema JSON object (no markdown, no explanation).
```

---

## Part 8: Error Codes

All extraction-related errors follow the standard error format:

```json
{
  "error": "human readable message",
  "code": "MACHINE_CODE",
  "details": { /* context-specific fields */ }
}
```

| Code | HTTP | Meaning | Example |
|---|---|---|---|
| `VIDEO_NOT_FOUND` | 404 | Collected video ID doesn't exist | `POST /api/intake/videos/invalid-id/analyze` |
| `VIDEO_NOT_READY` | 400 | Video hasn't finished downloading | `POST /api/intake/videos/:id/analyze` (downloadStatus ≠ COMPLETED) |
| `ANALYSIS_ALREADY_IN_PROGRESS` | 409 | Another analysis job is running for this video | duplicate `/analyze` calls within 5s |
| `ANALYSIS_NOT_READY` | 400 | Video analysis hasn't completed | `POST /api/templates/extract` before `analysisStatus === ANALYZED` |
| `FRAME_EXTRACTION_ERROR` | 500 | ffmpeg failed to extract frames | ffmpeg command failed |
| `VIDEO_ANALYSIS_FAILED` | 500 | GPT-4o Vision analysis failed | API error or invalid response |
| `TEMPLATE_NOT_FOUND` | 404 | Template ID doesn't exist | `PATCH /api/templates/invalid-id/publish` |
| `NOT_A_DRAFT` | 400 | Cannot publish a non-draft template | template already published |
| `UNAUTHORIZED` | 403 | User lacks publish permission | non-admin tries to publish |
| `EXTRACTION_ALREADY_IN_PROGRESS` | 409 | Extraction job already running | duplicate `/templates/extract` calls |

---

## Part 9: BullMQ Job Definitions

### Job: `video-analysis`

**Input:**
```typescript
{
  videoId: string;
  collectedVideoId: string;
  downloadedPath: string; // where yt-dlp saved the video
}
```

**Process:**
1. Extract keyframes via ffmpeg
2. Upload frame JPEGs to MinIO/S3
3. For each frame, call GPT-4o Vision with frame data
4. Compile VideoAnalysis JSON
5. Store in `CollectedVideo.analysisResult`
6. Set `analysisStatus: 'ANALYZED'`

**Error handling:**
- On ffmpeg failure: set `analysisStatus: 'FAILED'`, log error
- On GPT-4o failure: retry up to 3 times, then fail with error message
- On S3 upload failure: retry with exponential backoff

---

### Job: `template-extraction`

**Input:**
```typescript
{
  templateId: string;
  videoAnalysis: VideoAnalysis;
}
```

**Process:**
1. Call GPT-4o with full VideoAnalysis and extraction prompt
2. Parse returned TemplateSchema
3. Validate schema against `TemplateSchema` JSON schema
4. Store in `Template.schema`
5. Compute quality score (# of slots with defaults, scene count, etc.)
6. Set `extractionStatus: 'COMPLETED'` and `extractionQuality`

**Error handling:**
- On GPT-4o failure: set `extractionStatus: 'FAILED'`, store error
- On validation failure: set `extractionStatus: 'FAILED'`, include validation errors
- Quality score < 0.5 is flagged as lower confidence draft

---

## Part 10: Quality Scoring (Future Enhancement)

The extraction worker can optionally compute a quality score for extracted templates:

```typescript
interface ExtractionQuality {
  score: number;           // 0-1, overall quality
  issues: string[];        // human-readable flags
  breakdown: {
    sceneCount: number;
    slotCount: number;
    defaultValuesSet: number;  // slots with default content/style
    textDetectionAccuracy: number; // 0-1
    colorAccuracy: number;    // 0-1
  };
}
```

Heuristics:
- Deduct points for scenes with no detected text or very low confidence
- Deduct for videos <3 seconds or >60 seconds (unusual for templates)
- Reward videos with clear scene changes, good color palette, readable text
- Flag if detected colors are monochromatic (low design variety)

---

## Acceptance Criteria

✅ Spec covers **both pipelines** (analysis + extraction) with all endpoints, request/response shapes, error codes
✅ **VideoAnalysis JSON shape** fully specified so implementer knows exactly what to store
✅ **ffmpeg command** for keyframe extraction documented
✅ **GPT-4o Vision prompt format** documented with examples
✅ **TemplateSchema generation approach** described (how analysis maps to scenes/slots/components)
✅ **Database schema** updated with new `CollectedVideo` and `Template` fields
✅ **Error codes** and job definitions included
✅ **Quality scoring** approach outlined for future phases

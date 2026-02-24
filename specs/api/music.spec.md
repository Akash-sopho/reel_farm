# Music Library API Specification

## Overview

This document specifies the Music Library API endpoints for ReelForge. These endpoints provide access to a curated library of royalty-free music tracks that creators can add to their projects.

The API:
- Lists music tracks with filtering by mood, genre, BPM, and tags
- Retrieves individual track metadata
- Provides presigned preview URLs for 30-second clips
- Integrates with the existing project update endpoint (musicUrl field)

Base path: `/api/music`

---

## Core Concepts

### MusicTrack

A **MusicTrack** represents a single music file in the library. It includes:
- **Metadata**: title, artist, genre, mood, BPM, duration
- **Files**: full track (MinIO: `music/{id}.mp3`), 30-second preview (generated on-demand)
- **Tagging**: searchable tags for discovery
- **Status**: active/inactive tracks for library management

### Integration with Projects

Music selection uses the existing `PATCH /api/projects/:id` endpoint:
```json
{
  "musicUrl": "https://minio.local/reelforge/music/track-001.mp3"
}
```

The `musicUrl` field is stored in the Project model and referenced during video rendering.

---

## Data Types

### MusicTrack Model

```typescript
interface MusicTrack {
  id: string;              // UUID
  title: string;           // unique track name
  artist: string;          // artist/composer name
  url: string;             // MinIO key: music/{id}.mp3
  durationSeconds: number; // full track duration
  bpm?: number;            // beats per minute (optional)
  mood: 'happy' | 'sad' | 'energetic' | 'calm' | 'neutral';
  genre: 'pop' | 'hip-hop' | 'ambient' | 'electronic' | 'acoustic' | 'cinematic';
  tags: string[];          // searchable tags (e.g., ['upbeat', 'summer', 'motivational'])
  isActive: boolean;       // track available for use
  createdAt: string;       // ISO 8601
  updatedAt?: string;      // ISO 8601 (optional)
}
```

### Pagination Response

```typescript
interface PaginatedResponse<T> {
  tracks: T[];  // array of MusicTrack or summarized fields
  total: number;
  page: number;
  limit: number;
  pages: number;
}
```

### Error Response

```typescript
interface ErrorResponse {
  error: string;
  code: string;
  details?: Record<string, string>;
}
```

---

## Endpoints

### 1. GET /api/music — List Tracks (Paginated & Filterable)

**Purpose:** Browse the music library with filtering and pagination.

**Request:**

```
GET /api/music?mood=energetic&genre=pop&bpm_min=120&bpm_max=140&tags=summer&page=1&limit=20
```

**Query Parameters:**

| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| `page` | number | 1 | — | Page number (1-indexed) |
| `limit` | number | 20 | 100 | Items per page |
| `mood` | string | — | — | Filter by mood (single: happy, sad, energetic, calm, neutral) |
| `genre` | string | — | — | Filter by genre (single: pop, hip-hop, ambient, electronic, acoustic, cinematic) |
| `bpm_min` | number | — | — | Minimum BPM (inclusive) |
| `bpm_max` | number | — | — | Maximum BPM (inclusive) |
| `tags` | string | — | — | Filter by tags (comma-separated OR logic: matches any tag) |

**Response (200 OK):**

```json
{
  "tracks": [
    {
      "id": "track-001",
      "title": "Summer Vibes",
      "artist": "The Band",
      "durationSeconds": 180,
      "bpm": 128,
      "mood": "happy",
      "genre": "pop",
      "tags": ["upbeat", "summer", "positive"],
      "isActive": true
    },
    {
      "id": "track-002",
      "title": "Electric Dreams",
      "artist": "Synthwave Master",
      "durationSeconds": 240,
      "bpm": 135,
      "mood": "energetic",
      "genre": "electronic",
      "tags": ["upbeat", "electronic", "retro"],
      "isActive": true
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20,
  "pages": 3
}
```

**Response Fields (Summary Format):**

- `id` — track UUID
- `title` — track name
- `artist` — artist/composer name
- `durationSeconds` — full track length
- `bpm` — beats per minute
- `mood` — mood category
- `genre` — genre category
- `tags` — array of searchable tags
- `isActive` — whether track is available

**Status Codes:**

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Invalid query parameters |

**Error Response (400 - Invalid Query):**

```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "page": "page must be >= 1",
    "limit": "limit must be <= 100",
    "mood": "mood must be one of: happy, sad, energetic, calm, neutral",
    "bpm_min": "bpm_min must be >= 0"
  }
}
```

**Behavior:**

- If `page > pages`, return empty `tracks` array (not an error)
- If `limit > 100`, return 400 error
- If `page < 1`, return 400 error
- Tags filter uses **OR logic**: `tags=summer,motivational` returns tracks matching either tag
- Multiple filters use **AND logic**: `mood=happy&genre=pop` returns tracks matching both
- BPM filters are inclusive: `bpm_min=120&bpm_max=140` includes 120 and 140
- Only `isActive: true` tracks returned (inactive tracks hidden from public list)
- Results sorted by creation date (newest first)

---

### 2. GET /api/music/:id — Get Single Track

**Purpose:** Retrieve full metadata for a specific track.

**Request:**

```
GET /api/music/track-001
```

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Track UUID |

**Response (200 OK):**

```json
{
  "id": "track-001",
  "title": "Summer Vibes",
  "artist": "The Band",
  "url": "music/track-001.mp3",
  "durationSeconds": 180,
  "bpm": 128,
  "mood": "happy",
  "genre": "pop",
  "tags": ["upbeat", "summer", "positive"],
  "isActive": true,
  "createdAt": "2026-02-23T10:00:00Z"
}
```

**Response Fields:**

- All MusicTrack model fields included
- `url` — MinIO key (not a presigned URL; use endpoint 3 for preview)
- `createdAt` — ISO 8601 timestamp

**Status Codes:**

| Code | Meaning |
|------|---------|
| 200 | Success |
| 404 | Track not found |

**Error Response (404):**

```json
{
  "error": "Track not found",
  "code": "NOT_FOUND",
  "details": { "trackId": "track-xyz" }
}
```

---

### 3. GET /api/music/:id/preview — Get Preview URL

**Purpose:** Generate a presigned URL for a 30-second preview clip.

**Request:**

```
GET /api/music/track-001/preview
```

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Track UUID |

**Response (200 OK):**

```json
{
  "trackId": "track-001",
  "previewUrl": "https://minio.local/reelforge/music/track-001-preview.mp3?X-Amz-Algorithm=...",
  "durationSeconds": 30,
  "expiresAt": "2026-02-23T11:00:00Z"
}
```

**Response Fields:**

- `trackId` — ID of the track
- `previewUrl` — Presigned MinIO URL (valid for 1 hour)
- `durationSeconds` — Always 30 seconds
- `expiresAt` — ISO 8601 timestamp when URL expires

**Status Codes:**

| Code | Meaning |
|------|---------|
| 200 | Success |
| 404 | Track not found |
| 500 | Preview generation failed |

**Error Response (404):**

```json
{
  "error": "Track not found",
  "code": "NOT_FOUND",
  "details": { "trackId": "track-xyz" }
}
```

**Error Response (500 - Preview Generation):**

```json
{
  "error": "Failed to generate preview",
  "code": "PREVIEW_GENERATION_ERROR",
  "details": { "message": "ffmpeg processing failed" }
}
```

**Behavior:**

- Preview clips are generated on-demand from full track (first 30 seconds)
- Presigned URL generated with 1-hour expiry
- If full track < 30 seconds, return the entire track as preview
- Preview files are NOT cached; each request generates a new presigned URL
- Future optimization: cache previews to `music/{id}-preview.mp3` in MinIO

---

## Validation Rules

### List Query Parameters

1. **page**
   - Optional, default: 1
   - Must be >= 1
   - Type: integer

2. **limit**
   - Optional, default: 20
   - Range: 1–100
   - Type: integer

3. **mood**
   - Optional
   - Allowed values: `happy`, `sad`, `energetic`, `calm`, `neutral`
   - Single value only (not comma-separated)

4. **genre**
   - Optional
   - Allowed values: `pop`, `hip-hop`, `ambient`, `electronic`, `acoustic`, `cinematic`
   - Single value only

5. **bpm_min / bpm_max**
   - Optional
   - Must be >= 0
   - bpm_min <= bpm_max
   - Type: integer

6. **tags**
   - Optional
   - Comma-separated string (e.g., `summer,upbeat,positive`)
   - Matches any tag (OR logic)
   - Max 10 tags per query

---

## Seeding Requirements

The music library must be seeded with **20 tracks** distributed across all moods and genres. Seeding is handled in **P2-T06** (Seed Music Library).

### Seed Distribution

**By Mood (4 tracks per mood × 5 moods = 20 total):**
- Happy: 4 tracks
- Sad: 4 tracks
- Energetic: 4 tracks
- Calm: 4 tracks
- Neutral: 4 tracks

**By Genre (distributed across moods):**
- Pop: 4 tracks
- Hip-hop: 3 tracks
- Ambient: 3 tracks
- Electronic: 3 tracks
- Acoustic: 4 tracks
- Cinematic: 3 tracks

**Sample Seed Data:**

```
Happy + Pop: "Summer Vibes" (120 BPM, tags: upbeat, summer)
Happy + Pop: "Sunshine Days" (115 BPM, tags: upbeat, positive)
Energetic + Electronic: "Electric Dreams" (135 BPM, tags: electronic, retro)
Energetic + Hip-hop: "Beat Drop" (95 BPM, tags: hip-hop, hype)
Calm + Ambient: "Peaceful Waters" (60 BPM, tags: ambient, relaxing)
Calm + Acoustic: "Gentle Breeze" (80 BPM, tags: acoustic, cozy)
Sad + Cinematic: "Lost in Time" (70 BPM, tags: cinematic, emotional)
... (14 more tracks)
```

### Seeding Script Location

Script: `src/backend/prisma/seed.ts` (or separate `scripts/seed-music.ts`)

**What to seed:**
1. Insert 20 MusicTrack records into database
2. Upload MP3 files to MinIO at `music/{trackId}.mp3` (can be placeholder/royalty-free)
3. Mark all tracks as `isActive: true`
4. Distribute evenly across moods and genres

**Notes:**
- Each track should have realistic metadata (duration, BPM, tags)
- Artists can be fictional/placeholder (e.g., "Stock Music Artist")
- Tags should be helpful for discovery (e.g., upbeat, summer, motivational, cinematic)
- All tracks must be actual audio files (can be free royalty-free clips initially)

---

## Implementation Notes

### Database Integration

The `MusicTrack` model is already defined in `src/backend/prisma/schema.prisma`:

```typescript
model MusicTrack {
  id              String   @id @default(cuid())
  title           String   @unique
  artist          String
  url             String   // MinIO key: music/{id}.mp3
  durationSeconds Int
  bpm             Int?     // optional
  mood            String?  // enum: happy | sad | energetic | calm | neutral
  genre           String?  // enum: pop | hip-hop | ambient | electronic | acoustic | cinematic
  tags            String[] @default([])
  isActive        Boolean  @default(true)

  @@index([genre])
  @@index([mood])
  @@index([isActive])
}
```

No schema changes required; implementer uses Prisma queries directly.

### Storage

- **Full tracks:** MinIO key format `music/{trackId}.mp3`
- **Preview clips:** Generated on-demand from full track (first 30s)
- **Presigned URLs:** 1-hour expiry for previews
- **Future optimization:** Cache previews to `music/{trackId}-preview.mp3`

### Filtering Logic

```typescript
// Pseudocode for list query
const query = prisma.musicTrack.findMany({
  where: {
    isActive: true,
    mood: mood ? mood : undefined,
    genre: genre ? genre : undefined,
    bpm: bpm_min || bpm_max ? {
      gte: bpm_min || 0,
      lte: bpm_max || 999
    } : undefined,
    tags: tags ? {
      hasSome: tags.split(',')  // OR logic
    } : undefined
  },
  skip: (page - 1) * limit,
  take: limit,
  orderBy: { createdAt: 'desc' }
});
```

### Preview Generation

For `GET /api/music/:id/preview`:

1. Check if full track exists in MinIO at `music/{id}.mp3`
2. If durationSeconds <= 30, return full track as preview
3. Otherwise, extract first 30 seconds using FFmpeg (library: `fluent-ffmpeg`)
4. Generate presigned URL with 1-hour expiry
5. Return presigned URL to client

**Future optimization:**
- Cache generated previews to MinIO at `music/{id}-preview.mp3`
- Return cached preview if exists
- Clean up old previews periodically

### Error Handling

- **Validation errors** (400): Return field-level details
- **Not found** (404): Return with trackId in details
- **Preview generation errors** (500): Return descriptive message
- All errors follow standard format

---

## Status Codes Summary

| Code | Meaning | When |
|------|---------|------|
| 200 | OK | GET success (list or single) |
| 400 | Bad Request | Invalid query params, validation error |
| 404 | Not Found | Track not found |
| 500 | Server Error | Preview generation failure |

---

## Error Format

All errors follow the standard format:

```json
{
  "error": "Human-readable message",
  "code": "MACHINE_CODE",
  "details": {
    "field": "error message",
    ...
  }
}
```

---

## Example Workflows

### Workflow 1: Browse Music Library

```bash
# List all energetic pop tracks with BPM 120-140
curl "http://localhost:3001/api/music?mood=energetic&genre=pop&bpm_min=120&bpm_max=140"

# Response:
{
  "tracks": [ ... ],
  "total": 5,
  "page": 1,
  "limit": 20,
  "pages": 1
}
```

### Workflow 2: Get Track Details

```bash
curl "http://localhost:3001/api/music/track-001"

# Response:
{
  "id": "track-001",
  "title": "Summer Vibes",
  "artist": "The Band",
  "url": "music/track-001.mp3",
  "durationSeconds": 180,
  "bpm": 128,
  "mood": "happy",
  "genre": "pop",
  "tags": ["upbeat", "summer"],
  "isActive": true,
  "createdAt": "2026-02-23T10:00:00Z"
}
```

### Workflow 3: Get Preview & Add to Project

```bash
# 1. Get preview URL
curl "http://localhost:3001/api/music/track-001/preview"

# Response:
{
  "trackId": "track-001",
  "previewUrl": "https://minio.local/...",
  "durationSeconds": 30,
  "expiresAt": "2026-02-23T11:00:00Z"
}

# 2. Add to project using existing endpoint
curl -X PATCH http://localhost:3001/api/projects/proj-123 \
  -H "Content-Type: application/json" \
  -d '{"musicUrl": "music/track-001.mp3"}'

# Response:
{
  "id": "proj-123",
  ...
  "musicUrl": "music/track-001.mp3",
  ...
}
```

### Workflow 4: Filter by Tags (OR Logic)

```bash
# Find tracks with either "summer" or "motivational" tag
curl "http://localhost:3001/api/music?tags=summer,motivational"

# Response includes tracks matching EITHER tag
{
  "tracks": [
    { "title": "Summer Vibes", "tags": ["upbeat", "summer"] },
    { "title": "Go Get Em", "tags": ["motivational", "upbeat"] },
    ...
  ],
  ...
}
```

---

## Future Enhancements

- **Search by title/artist:** Add `?search=` query parameter
- **Custom sorting:** Add `?sortBy=title|bpm|duration` and `?sortOrder=asc|desc`
- **Favorites:** Save favorite tracks per user
- **Upload custom music:** Allow creators to upload their own tracks (Phase 3+)
- **Licensing info:** Include license type (royalty-free, CC, etc.) in metadata
- **Recommendations:** API to suggest tracks based on template category/mood
- **Preview caching:** Cache generated previews to reduce FFmpeg overhead


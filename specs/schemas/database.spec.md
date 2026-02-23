# Database Schema Specification

## Overview

ReelForge uses PostgreSQL 16 with Prisma ORM. This document defines the data model for the ReelForge platform.

## Tables

### User

Represents a user account in the system.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String (UUID) | PRIMARY KEY | Unique user identifier |
| `email` | String | UNIQUE, NOT NULL | User's email address |
| `name` | String | NOT NULL | User's display name |
| `createdAt` | DateTime | NOT NULL, default: now() | Account creation timestamp |
| `updatedAt` | DateTime | NOT NULL, default: now(), updated on modify | Last update timestamp |

**Indexes:**
- `email` (UNIQUE)

---

### Template

Represents a video template (derived from trending content).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String (UUID) | PRIMARY KEY | Unique template identifier |
| `name` | String | NOT NULL | Template display name (e.g., "Photo Dump Intro") |
| `slug` | String | UNIQUE, NOT NULL | URL-friendly identifier (e.g., "photo-dump-intro") |
| `category` | String | NOT NULL | Template category (e.g., "photo-dump", "quote-card") |
| `tags` | String[] | default: [] | Search/filter tags (e.g., ["trending", "instagram"]) |
| `description` | String | default: "" | Human-readable template description |
| `schema` | JSON | NOT NULL | TemplateSchema document defining scenes, slots, components |
| `thumbnailUrl` | String | nullable | URL to template preview thumbnail |
| `durationSeconds` | Int | NOT NULL | Total video duration in seconds |
| `isPublished` | Boolean | default: false | Whether template is available to users |
| `createdAt` | DateTime | NOT NULL, default: now() | Creation timestamp |
| `updatedAt` | DateTime | NOT NULL, default: now(), updated on modify | Last update timestamp |

**Indexes:**
- `slug` (UNIQUE)
- `category`
- `isPublished`

---

### Project

Represents a user's project — a template with filled-in content slots.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String (UUID) | PRIMARY KEY | Unique project identifier |
| `userId` | String (UUID) | FOREIGN KEY (User.id), NOT NULL | Project owner |
| `templateId` | String (UUID) | FOREIGN KEY (Template.id), NOT NULL | Template used |
| `name` | String | NOT NULL | Project display name |
| `slotFills` | JSON | NOT NULL, default: {} | SlotFill[] array with user-provided content |
| `musicUrl` | String | nullable | URL to selected background music track |
| `settings` | JSON | default: {} | Project-specific settings (e.g., speed, filters) |
| `status` | Enum | NOT NULL, default: 'draft' | Status: 'draft' \| 'ready' \| 'rendering' \| 'done' |
| `createdAt` | DateTime | NOT NULL, default: now() | Creation timestamp |
| `updatedAt` | DateTime | NOT NULL, default: now(), updated on modify | Last update timestamp |

**Indexes:**
- `userId`
- `templateId`
- `status`

**Foreign Keys:**
- `userId` → User.id (CASCADE DELETE)
- `templateId` → Template.id (RESTRICT)

---

### Render

Represents a video render job for a project.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String (UUID) | PRIMARY KEY | Unique render job identifier |
| `projectId` | String (UUID) | FOREIGN KEY (Project.id), NOT NULL | Associated project |
| `status` | Enum | NOT NULL, default: 'PENDING' | Status: 'PENDING' \| 'PROCESSING' \| 'DONE' \| 'FAILED' |
| `outputUrl` | String | nullable | S3/MinIO URL to the rendered MP4 video |
| `errorMessage` | String | nullable | Error details if status is 'FAILED' |
| `startedAt` | DateTime | nullable | Render start timestamp |
| `completedAt` | DateTime | nullable | Render completion timestamp |
| `createdAt` | DateTime | NOT NULL, default: now() | Job creation timestamp |

**Indexes:**
- `projectId`
- `status`

**Foreign Keys:**
- `projectId` → Project.id (CASCADE DELETE)

---

### CollectedVideo

Represents a video collected from Instagram/TikTok for trend analysis.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String (UUID) | PRIMARY KEY | Unique collected video identifier |
| `userId` | String (UUID) | FOREIGN KEY (User.id), nullable | User who collected this video (if applicable) |
| `sourceUrl` | String | NOT NULL | Original Instagram/TikTok URL |
| `platform` | String | NOT NULL | Platform: 'instagram' \| 'tiktok' |
| `title` | String | nullable | Video title/caption from source |
| `caption` | String | nullable | Full caption text |
| `videoUrl` | String | NOT NULL | URL to downloaded video file |
| `thumbnailUrl` | String | nullable | URL to thumbnail image |
| `durationSeconds` | Int | nullable | Video duration in seconds |
| `tags` | String[] | default: [] | Auto-extracted or manual tags (e.g., ["trending", "funny"]) |
| `status` | Enum | NOT NULL, default: 'FETCHING' | Status: 'FETCHING' \| 'READY' \| 'FAILED' |
| `createdAt` | DateTime | NOT NULL, default: now() | Collection timestamp |

**Indexes:**
- `userId`
- `platform`
- `status`

**Foreign Keys:**
- `userId` → User.id (SET NULL on DELETE)

---

### MusicTrack

Represents a music track for use as background music in videos.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String (UUID) | PRIMARY KEY | Unique track identifier |
| `title` | String | NOT NULL | Track title |
| `artist` | String | NOT NULL | Artist name |
| `url` | String | NOT NULL | URL to audio file (S3/MinIO) |
| `durationSeconds` | Int | NOT NULL | Track duration in seconds |
| `bpm` | Int | nullable | Beats per minute (for tempo matching) |
| `mood` | String | nullable | Mood tag (e.g., "energetic", "calm", "upbeat") |
| `genre` | String | nullable | Genre (e.g., "pop", "hip-hop", "lo-fi") |
| `tags` | String[] | default: [] | Searchable tags (e.g., ["trending", "viral"]) |
| `isActive` | Boolean | default: true | Whether track is available for use |

**Indexes:**
- `genre`
- `mood`
- `isActive`

---

### VoiceoverClip

Represents a recorded voiceover for a project.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String (UUID) | PRIMARY KEY | Unique voiceover identifier |
| `projectId` | String (UUID) | FOREIGN KEY (Project.id), NOT NULL | Associated project |
| `url` | String | NOT NULL | URL to audio file (S3/MinIO) |
| `durationSeconds` | Int | NOT NULL | Clip duration in seconds |
| `createdAt` | DateTime | NOT NULL, default: now() | Creation timestamp |

**Indexes:**
- `projectId`

**Foreign Keys:**
- `projectId` → Project.id (CASCADE DELETE)

---

### PublishLog

Represents an attempt to publish a render to Instagram or TikTok.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String (UUID) | PRIMARY KEY | Unique publish log identifier |
| `projectId` | String (UUID) | FOREIGN KEY (Project.id), NOT NULL | Associated project |
| `renderId` | String (UUID) | FOREIGN KEY (Render.id), NOT NULL | Rendered video |
| `platform` | String | NOT NULL | Target platform: 'instagram' \| 'tiktok' |
| `status` | String | NOT NULL, default: 'pending' | Status: 'pending' \| 'published' \| 'failed' \| 'scheduled' |
| `externalId` | String | nullable | External platform-specific post ID (e.g., Instagram post ID) |
| `errorMessage` | String | nullable | Error details if status is 'failed' |
| `scheduledAt` | DateTime | nullable | Scheduled publish time (if status is 'scheduled') |
| `publishedAt` | DateTime | nullable | Actual publish time (if status is 'published') |
| `createdAt` | DateTime | NOT NULL, default: now() | Log creation timestamp |

**Indexes:**
- `projectId`
- `renderId`
- `platform`
- `status`

**Foreign Keys:**
- `projectId` → Project.id (CASCADE DELETE)
- `renderId` → Render.id (CASCADE DELETE)

---

### AIAsset

Represents an AI-generated asset (text or image) for a project slot.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String (UUID) | PRIMARY KEY | Unique AI asset identifier |
| `projectId` | String (UUID) | FOREIGN KEY (Project.id), NOT NULL | Associated project |
| `slotId` | String | NOT NULL | Template slot identifier this asset fills |
| `type` | Enum | NOT NULL | Asset type: 'TEXT' \| 'IMAGE' |
| `prompt` | String | NOT NULL | User prompt sent to AI (GPT-4o or DALL-E 3) |
| `outputUrl` | String | nullable | URL to generated asset (S3/MinIO for images; text stored in JSON) |
| `tokensUsed` | Int | nullable | Tokens consumed by OpenAI API call |
| `cost` | Float | nullable | Estimated cost in USD |
| `createdAt` | DateTime | NOT NULL, default: now() | Generation timestamp |

**Indexes:**
- `projectId`
- `slotId`
- `type`

**Foreign Keys:**
- `projectId` → Project.id (CASCADE DELETE)

---

## Relationships

```
User
  ├── 1:many → Project
  ├── 1:many → CollectedVideo
  └── 1:many → PublishLog (transitively via Project)

Template
  └── 1:many → Project

Project
  ├── many:1 → User
  ├── many:1 → Template
  ├── 1:many → Render
  ├── 1:many → VoiceoverClip
  ├── 1:many → AIAsset
  └── 1:many → PublishLog

Render
  ├── many:1 → Project
  └── 1:many → PublishLog

PublishLog
  ├── many:1 → Project
  └── many:1 → Render

CollectedVideo
  └── many:1 → User (optional)

MusicTrack
  (standalone, referenced by Project.musicUrl string)

VoiceoverClip
  └── many:1 → Project

AIAsset
  └── many:1 → Project
```

## Enums

### ProjectStatus
- `draft` — Project is being edited
- `ready` — Project is ready to render
- `rendering` — Video is currently rendering
- `done` — Render completed successfully

### RenderStatus
- `PENDING` — Waiting to be processed
- `PROCESSING` — Currently rendering
- `DONE` — Render completed successfully
- `FAILED` — Render failed with error

### CollectedVideoStatus
- `FETCHING` — Video is being downloaded
- `READY` — Video available for analysis
- `FAILED` — Download or processing failed

### PublishStatus
- `pending` — Awaiting publication
- `published` — Successfully published to platform
- `failed` — Publication failed
- `scheduled` — Scheduled for future publish

---

## Notes

- All `DateTime` fields use ISO 8601 format with timezone
- All `String` UUIDs use v4 format
- `JSON` columns store complex objects as JSONB in PostgreSQL for queryability
- Soft deletes are not used; CASCADE DELETE is preferred for data consistency
- Default values for timestamps (`createdAt`, `updatedAt`) are handled by Prisma
- Foreign key constraints use RESTRICT or CASCADE as appropriate for data integrity

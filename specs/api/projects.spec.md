# Project CRUD + Slot Fill API Specification

## Overview

This document specifies the REST API endpoints for managing projects (user-created video compositions from templates). Projects are the user's editable copies of templates, where they fill content slots (images, text) and customize settings before rendering.

---

## Core Concepts

### Project Lifecycle

```
DRAFT
  ↓ (all required slots filled)
READY
  ↓ (render starts)
RENDERING (via P1-T13 render pipeline)
  ↓
DONE (render complete)
  ↓
PUBLISHED (via Phase 3)
```

### Slot Filling

A **slot** is a placeholder in a template (e.g., "background photo", "headline text").

A **slot fill** assigns actual content to a slot:
```typescript
interface SlotFill {
  slotId: string;      // matches template.slots[].id
  type: 'image' | 'text' | 'video' | 'audio';  // must match template slot type
  value: string;       // URL for media, text string for text
}
```

**Filled status:**
- **image/video/audio slot**: filled if `value` is a non-empty URL
- **text slot**: filled if `value` is a non-empty string (trimmed, min 1 char)

**Project status transitions:**
- Starts as `DRAFT`
- Becomes `READY` when all required slots are filled
- Reverts to `DRAFT` if a required fill is removed or emptied
- Changes to `RENDERING`/`DONE` by render pipeline (P1-T13)

---

## Endpoints

### 1. POST /api/projects — Create Project

**Purpose:** Create a new project from a template.

**Request:**
```typescript
POST /api/projects
Content-Type: application/json

{
  "templateId": "uuid-of-template",
  "name": "My Video (optional)"
}
```

**Request schema:**
```typescript
interface CreateProjectRequest {
  templateId: string;  // must exist in templates table
  name?: string;       // default: `{Template.name} - {timestamp}`
}
```

**Response (201 Created):**
```json
{
  "id": "proj-abc123",
  "userId": "user-xyz",
  "templateId": "tmpl-photo-dump",
  "name": "My Awesome Video",
  "status": "draft",
  "slotFills": [],
  "musicUrl": null,
  "settings": {},
  "template": {
    "id": "tmpl-photo-dump",
    "name": "Photo Dump",
    "schema": {
      "version": "1.0",
      "slots": [
        { "id": "photo-1", "type": "image", "label": "Photo 1", "required": true, ... },
        { "id": "photo-2", "type": "image", "label": "Photo 2", "required": true, ... },
        ...
      ],
      "scenes": [ ... ]
    },
    "durationSeconds": 15,
    ...
  },
  "filledSlots": 0,
  "requiredSlots": 5,
  "createdAt": "2026-02-23T10:00:00Z",
  "updatedAt": "2026-02-23T10:00:00Z"
}
```

**Status codes:**
- **201 Created** — Project successfully created
- **400 Bad Request** — Invalid request (e.g., templateId missing)
- **404 Not Found** — Template not found
- **401 Unauthorized** — User not authenticated

**Error response:**
```json
{
  "error": "Template not found",
  "code": "TEMPLATE_NOT_FOUND",
  "details": {
    "templateId": "tmpl-xyz"
  }
}
```

---

### 2. GET /api/projects/:id — Get Project

**Purpose:** Retrieve a project with all metadata and slot fill status.

**Request:**
```
GET /api/projects/:id
```

**Response (200 OK):**
```json
{
  "id": "proj-abc123",
  "userId": "user-xyz",
  "templateId": "tmpl-photo-dump",
  "name": "My Awesome Video",
  "status": "ready",
  "slotFills": [
    {
      "slotId": "photo-1",
      "type": "image",
      "value": "https://minio.local/reelforge/uploads/user-xyz/1708596000000-uuid1.jpg"
    },
    {
      "slotId": "photo-2",
      "type": "image",
      "value": "https://minio.local/reelforge/uploads/user-xyz/1708596001000-uuid2.jpg"
    }
  ],
  "musicUrl": "s3://reelforge-music/upbeat-summer.mp3",
  "settings": {
    "customField": "value"
  },
  "template": {
    "id": "tmpl-photo-dump",
    "name": "Photo Dump",
    "slug": "photo-dump",
    "category": "photo-dump",
    "tags": ["trending", "photos"],
    "schema": { ... },
    "durationSeconds": 15,
    ...
  },
  "filledSlots": 5,
  "requiredSlots": 5,
  "createdAt": "2026-02-23T10:00:00Z",
  "updatedAt": "2026-02-23T10:30:00Z"
}
```

**Computed fields:**
- `filledSlots` — count of slots with non-empty values matching their type
- `requiredSlots` — count of slots where `required: true` in template schema
- `status` — automatically `"draft"` if `filledSlots < requiredSlots`, else `"ready"`

**Status codes:**
- **200 OK** — Project found
- **404 Not Found** — Project not found or belongs to different user
- **401 Unauthorized** — User not authenticated

**Error response (404):**
```json
{
  "error": "Project not found",
  "code": "NOT_FOUND",
  "details": { "projectId": "proj-xyz" }
}
```

---

### 3. PATCH /api/projects/:id — Update Project

**Purpose:** Update slot fills, music, name, or settings. Automatically transitions status between draft/ready.

**Request:**
```typescript
PATCH /api/projects/:id
Content-Type: application/json

{
  "slotFills": [
    { "slotId": "photo-1", "type": "image", "value": "https://..." },
    { "slotId": "photo-2", "type": "image", "value": "https://..." }
  ],
  "musicUrl": "s3://reelforge-music/upbeat.mp3",
  "name": "Updated Name",
  "settings": { "custom": "value" }
}
```

**All fields are optional** — only provided fields are updated.

**Validation rules for slotFills:**

1. **Each fill must reference an existing slot:**
   - Error if `slotId` doesn't exist in template schema
   - Error: `"Slot 'unknown-id' does not exist in template"`

2. **Type must match the slot definition:**
   - Error if `type` doesn't match `template.slots[slotId].type`
   - Error: `"Slot 'cover-image' expects type 'image', got 'text'"`

3. **Value validation by type:**
   - **image/video/audio**: must be a non-empty URL (starts with http:// or s3://)
   - **text**: must be a string, at least 1 character after trim
   - Error if invalid: `"Invalid value for slot 'headline': expected non-empty string"`

4. **Slot fills replace entirely:**
   - Sending `slotFills: []` clears all fills
   - Sending `slotFills: [...]` replaces the entire fills array

**Response (200 OK):**
```json
{
  "id": "proj-abc123",
  "userId": "user-xyz",
  "status": "ready",
  "slotFills": [ ... ],
  "musicUrl": "...",
  "settings": { ... },
  "filledSlots": 5,
  "requiredSlots": 5,
  "updatedAt": "2026-02-23T10:35:00Z"
}
```

**Status codes:**
- **200 OK** — Project updated
- **400 Bad Request** — Validation error (see examples below)
- **404 Not Found** — Project not found
- **401 Unauthorized** — User not authenticated

**Error response (400 - slot not found):**
```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "slotFills[0].slotId": "Slot 'unknown-id' does not exist in template"
  }
}
```

**Error response (400 - type mismatch):**
```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "slotFills[1].type": "Slot 'cover-image' expects type 'image', got 'text'"
  }
}
```

**Error response (400 - invalid value):**
```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "slotFills[0].value": "Invalid value for slot 'headline': expected non-empty string"
  }
}
```

---

### 4. GET /api/projects — List User's Projects

**Purpose:** List all projects for the authenticated user with pagination.

**Request:**
```
GET /api/projects?page=1&limit=20
```

**Query parameters:**
| Param | Type | Default | Max | Notes |
|-------|------|---------|-----|-------|
| `page` | int | 1 | — | 1-indexed |
| `limit` | int | 20 | 100 | items per page |
| `status` | string | — | — | filter by status: 'draft', 'ready', 'rendering', 'done' |

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "proj-abc123",
      "userId": "user-xyz",
      "templateId": "tmpl-photo-dump",
      "name": "My Awesome Video",
      "status": "ready",
      "slotFills": [ ... ],
      "musicUrl": null,
      "filledSlots": 5,
      "requiredSlots": 5,
      "createdAt": "2026-02-23T10:00:00Z",
      "updatedAt": "2026-02-23T10:30:00Z"
    },
    {
      "id": "proj-def456",
      "userId": "user-xyz",
      "templateId": "tmpl-quote-card",
      "name": "Motivational Quote",
      "status": "draft",
      "slotFills": [],
      "musicUrl": null,
      "filledSlots": 0,
      "requiredSlots": 2,
      "createdAt": "2026-02-23T09:00:00Z",
      "updatedAt": "2026-02-23T09:00:00Z"
    }
  ],
  "total": 42,
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

## Data Types

### Project

```typescript
interface Project {
  id: string;                          // UUID
  userId: string;                      // foreign key to users
  templateId: string;                  // foreign key to templates
  name: string;
  status: 'draft' | 'ready' | 'rendering' | 'done' | 'published';
  slotFills: SlotFill[];               // array of slot fills
  musicUrl?: string;                   // S3 or local URL to music track
  settings: Record<string, unknown>;   // arbitrary config for future use
  createdAt: string;                   // ISO 8601
  updatedAt: string;                   // ISO 8601
}
```

### SlotFill

```typescript
interface SlotFill {
  slotId: string;
  type: 'image' | 'text' | 'video' | 'audio';
  value: string;  // URL or text content
}
```

### Computed Fields (in responses)

```typescript
interface ProjectResponse extends Project {
  template: Template;           // embedded template with full schema
  filledSlots: number;          // count of filled required slots
  requiredSlots: number;        // count of required slots in template
}
```

---

## Status Codes Summary

| Code | Meaning | When |
|------|---------|------|
| 200 | OK | GET success, PATCH success |
| 201 | Created | POST success |
| 400 | Bad Request | Invalid params, validation error |
| 401 | Unauthorized | Missing/invalid auth token |
| 404 | Not Found | Project/template not found |
| 500 | Server Error | Unexpected error |

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

### Workflow 1: Create and Fill a Project

```bash
# 1. Create project from template
curl -X POST http://localhost:3001/api/projects \
  -H "Content-Type: application/json" \
  -d '{"templateId": "tmpl-photo-dump", "name": "My Photos"}'
# → 201 with projectId: "proj-123"

# 2. Fill first two slots
curl -X PATCH http://localhost:3001/api/projects/proj-123 \
  -H "Content-Type: application/json" \
  -d '{
    "slotFills": [
      {"slotId": "photo-1", "type": "image", "value": "https://minio/photo1.jpg"},
      {"slotId": "photo-2", "type": "image", "value": "https://minio/photo2.jpg"}
    ]
  }'
# → 200 with status: "draft" (not all required slots filled)

# 3. Get project status
curl http://localhost:3001/api/projects/proj-123
# → 200 with filledSlots: 2, requiredSlots: 5, status: "draft"

# 4. Fill remaining slots to reach "ready"
curl -X PATCH http://localhost:3001/api/projects/proj-123 \
  -H "Content-Type: application/json" \
  -d '{
    "slotFills": [
      {"slotId": "photo-1", "type": "image", "value": "https://minio/photo1.jpg"},
      {"slotId": "photo-2", "type": "image", "value": "https://minio/photo2.jpg"},
      {"slotId": "photo-3", "type": "image", "value": "https://minio/photo3.jpg"},
      {"slotId": "photo-4", "type": "image", "value": "https://minio/photo4.jpg"},
      {"slotId": "photo-5", "type": "image", "value": "https://minio/photo5.jpg"}
    ]
  }'
# → 200 with status: "ready" (all required slots filled)
```

### Workflow 2: List and Filter Projects

```bash
# List all draft projects
curl "http://localhost:3001/api/projects?status=draft&page=1&limit=10"
# → 200 with filtered list

# List all ready projects
curl "http://localhost:3001/api/projects?status=ready"
```

---

## Implementation Notes

1. **Authentication:** All endpoints require Bearer token in `Authorization` header. Extract `userId` from token to filter projects.

2. **Slot Fill Validation:** When `slotFills` is provided in PATCH request:
   - Validate each fill against the template schema
   - Reject if slot doesn't exist or type mismatches
   - Calculate new `filledSlots` count
   - Auto-update `status` based on `filledSlots >= requiredSlots`

3. **Status Transitions:**
   - Auto-transition `draft` → `ready` when all required slots filled
   - Auto-transition `ready` → `draft` if a required slot becomes empty
   - Never auto-transition out of `rendering` or `done` (managed by P1-T13)

4. **Template Embedding:**
   - GET /projects/:id always returns full template in response
   - Required by frontend editor (P1-T16) to render slots

5. **Idempotency:**
   - PATCH is idempotent: sending same slotFills twice has same effect as once
   - Safe for frontend debouncing/retry logic

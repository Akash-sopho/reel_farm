# Template CRUD API Specification

## Overview

This document specifies the Template API endpoints for ReelForge. These endpoints handle:
- Listing and filtering published templates
- Retrieving a single template with its full schema
- Creating new templates (admin only)
- Updating template fields

Base path: `/api/templates`

---

## Data Types

### Template Response Object

```typescript
interface TemplateResponse {
  id: string;
  name: string;
  slug: string;
  category: string;
  tags: string[];
  description: string;
  schema: {
    version: "1.0";
    slots: Array<{
      id: string;
      type: "image" | "text" | "video" | "audio";
      label: string;
      required: boolean;
      placeholder?: string;
      constraints?: {
        maxLength?: number;
        minWidth?: number;
        minHeight?: number;
        accept?: string[];
      };
    }>;
    scenes: Array<{
      id: string;
      durationSeconds: number;
      components: Array<{
        componentId: string;
        zIndex: number;
        slotBindings: Record<string, string>;
        props: Record<string, unknown>;
      }>;
    }>;
    transitions?: string[];
    defaultMusic?: string;
    audioTags?: string[];
  };
  thumbnailUrl: string | null;
  durationSeconds: number;
  isPublished: boolean;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}
```

### Pagination Response

```typescript
interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
```

### Error Response

```typescript
interface ErrorResponse {
  error: string;
  code: string;
  details?: Record<string, string | string[]>;
}
```

---

## Endpoints

### 1. List Templates

**Request:**
```
GET /api/templates
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `category` | string | - | Filter by category (exact match) |
| `tags` | string | - | Filter by tags (comma-separated, any tag match) |
| `page` | number | 1 | Page number (starts at 1) |
| `limit` | number | 20 | Items per page (min: 1, max: 100) |
| `published` | boolean | true | Show only published templates |

**Response: 200 OK**

```json
{
  "data": [
    {
      "id": "tmpl_001",
      "name": "Photo Dump",
      "slug": "photo-dump",
      "category": "photo-dump",
      "tags": ["trending", "instagram", "photos"],
      "description": "A fast-paced sequence of photos with transitions",
      "schema": { /* full schema */ },
      "thumbnailUrl": "https://cdn.example.com/photo-dump.png",
      "durationSeconds": 15,
      "isPublished": true,
      "createdAt": "2026-02-23T10:00:00Z",
      "updatedAt": "2026-02-23T10:00:00Z"
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

**Error: 400 Bad Request** (invalid query params)

```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "page": "page must be >= 1",
    "limit": "limit must be <= 100"
  }
}
```

**Behavior:**
- If `page > ceil(total / limit)`, return empty `data` array with correct `total` and `page`
- If `limit` > 100, return 400 error
- If `page` < 1, return 400 error
- `published=false` requires admin auth (future implementation; for now ignore this param)
- Pagination is 1-indexed (page 1 = first 20 results)

---

### 2. Get Single Template

**Request:**
```
GET /api/templates/:id
```

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Template ID (UUID) |

**Response: 200 OK**

```json
{
  "id": "tmpl_001",
  "name": "Photo Dump",
  "slug": "photo-dump",
  "category": "photo-dump",
  "tags": ["trending", "instagram"],
  "description": "A fast-paced sequence of photos",
  "schema": {
    "version": "1.0",
    "slots": [
      {
        "id": "photo-1",
        "type": "image",
        "label": "Photo 1",
        "required": true,
        "constraints": {
          "minWidth": 1080,
          "minHeight": 1920,
          "accept": ["image/jpeg", "image/png"]
        }
      }
    ],
    "scenes": [
      {
        "id": "scene-1",
        "durationSeconds": 5,
        "components": [
          {
            "componentId": "StaticImage",
            "zIndex": 0,
            "slotBindings": { "image": "photo-1" },
            "props": {}
          }
        ]
      }
    ],
    "audioTags": ["upbeat"]
  },
  "thumbnailUrl": "https://cdn.example.com/photo-dump.png",
  "durationSeconds": 15,
  "isPublished": true,
  "createdAt": "2026-02-23T10:00:00Z",
  "updatedAt": "2026-02-23T10:00:00Z"
}
```

**Error: 404 Not Found** (template doesn't exist)

```json
{
  "error": "Template not found",
  "code": "NOT_FOUND",
  "details": {}
}
```

**Error: 400 Bad Request** (invalid ID format)

```json
{
  "error": "Invalid template ID",
  "code": "INVALID_ID",
  "details": {}
}
```

---

### 3. Create Template

**Request:**
```
POST /api/templates
```

**Authentication:** Admin required (headers: `Authorization: Bearer <token>`) — placeholder for now

**Body:**

```typescript
interface CreateTemplateRequest {
  name: string;
  slug: string;
  category: string;
  tags?: string[];
  description?: string;
  schema: TemplateSchema;
  thumbnailUrl?: string;
  isPublished?: boolean; // default: false
}
```

**Request Body Example:**

```json
{
  "name": "Quote Card",
  "slug": "quote-card",
  "category": "quote-card",
  "tags": ["quotes", "motivation"],
  "description": "Animated quote on gradient background",
  "schema": {
    "version": "1.0",
    "slots": [
      {
        "id": "quote-text",
        "type": "text",
        "label": "Quote",
        "required": true,
        "placeholder": "Enter quote",
        "constraints": { "maxLength": 200 }
      }
    ],
    "scenes": [
      {
        "id": "scene-1",
        "durationSeconds": 8,
        "components": [
          {
            "componentId": "AnimatedText",
            "zIndex": 0,
            "slotBindings": { "text": "quote-text" },
            "props": { "fontSize": 48 }
          }
        ]
      }
    ],
    "audioTags": ["calm"]
  },
  "isPublished": true
}
```

**Response: 201 Created**

```json
{
  "id": "tmpl_002",
  "name": "Quote Card",
  "slug": "quote-card",
  "category": "quote-card",
  "tags": ["quotes", "motivation"],
  "description": "Animated quote on gradient background",
  "schema": { /* same as request */ },
  "thumbnailUrl": null,
  "durationSeconds": 8,
  "isPublished": true,
  "createdAt": "2026-02-23T11:00:00Z",
  "updatedAt": "2026-02-23T11:00:00Z"
}
```

**Error: 400 Bad Request** (validation failure)

```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "name": "name is required",
    "schema.version": "schema.version must be '1.0'",
    "schema.slots": "schema.slots must have at least 1 item"
  }
}
```

**Error: 409 Conflict** (slug already exists)

```json
{
  "error": "Template slug already exists",
  "code": "DUPLICATE_SLUG",
  "details": { "slug": "quote-card" }
}
```

**Error: 401 Unauthorized** (no admin token)

```json
{
  "error": "Unauthorized",
  "code": "UNAUTHORIZED",
  "details": {}
}
```

**Validation Rules:**
- `name` — required, non-empty string, max 255 chars
- `slug` — required, must be unique, kebab-case (a-z, 0-9, hyphens only)
- `category` — required, non-empty string
- `tags` — optional array of strings
- `description` — optional string, max 1000 chars
- `schema` — required, must pass TemplateSchema Zod validation (version 1.0, at least 1 slot, at least 1 scene)
- `isPublished` — optional boolean, defaults to false

---

### 4. Update Template

**Request:**
```
PATCH /api/templates/:id
```

**Authentication:** Admin required (headers: `Authorization: Bearer <token>`) — placeholder for now

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Template ID (UUID) |

**Body:** (all fields optional)

```typescript
interface UpdateTemplateRequest {
  name?: string;
  slug?: string;
  category?: string;
  tags?: string[];
  description?: string;
  schema?: TemplateSchema;
  thumbnailUrl?: string;
  isPublished?: boolean;
}
```

**Request Body Example:**

```json
{
  "isPublished": true,
  "tags": ["quotes", "motivation", "trending"]
}
```

**Response: 200 OK** (updated template)

```json
{
  "id": "tmpl_002",
  "name": "Quote Card",
  "slug": "quote-card",
  "category": "quote-card",
  "tags": ["quotes", "motivation", "trending"],
  "description": "Animated quote on gradient background",
  "schema": { /* full schema */ },
  "thumbnailUrl": null,
  "durationSeconds": 8,
  "isPublished": true,
  "createdAt": "2026-02-23T11:00:00Z",
  "updatedAt": "2026-02-23T11:30:00Z"
}
```

**Error: 404 Not Found** (template doesn't exist)

```json
{
  "error": "Template not found",
  "code": "NOT_FOUND",
  "details": {}
}
```

**Error: 400 Bad Request** (validation failure)

```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "slug": "slug must be unique (already exists)"
  }
}
```

**Error: 401 Unauthorized** (no admin token)

```json
{
  "error": "Unauthorized",
  "code": "UNAUTHORIZED",
  "details": {}
}
```

**Behavior:**
- All fields are optional; only provided fields are updated
- Attempting to change `slug` to an existing slug returns 400
- `updatedAt` is automatically set to current timestamp
- Partial updates allowed (e.g., can update only `isPublished` without touching schema)
- If any field fails validation, entire request fails (no partial updates)

---

## Error Codes Reference

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `NOT_FOUND` | 404 | Template doesn't exist |
| `INVALID_ID` | 400 | Invalid template ID format |
| `VALIDATION_ERROR` | 400 | Validation failed on request body or query params |
| `DUPLICATE_SLUG` | 409 | Slug already exists in database |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication token |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected server error |

---

## Implementation Notes

- All endpoints return `Content-Type: application/json`
- All timestamps are ISO 8601 format with UTC timezone
- Template IDs are UUIDs (v4 format)
- Template objects include the full schema (no separate schema fetch needed)
- Slug is used for user-facing URLs (e.g., `/editor/templates/photo-dump`)
- Future: Add admin authentication middleware; for Phase 1, assume POST/PATCH calls are admin-authorized
- Future: Add sorting, search by name, filter by date range
- Future: Soft delete, audit logging

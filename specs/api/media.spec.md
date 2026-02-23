# Media Upload API Specification

## Overview

This document specifies the media upload endpoints for ReelForge. The API supports two upload flows:
1. **Direct upload** — Client sends file directly via multipart form
2. **Presigned URL upload** — Client gets a presigned URL and uploads directly to MinIO/S3

Base path: `/api/media`

---

## Storage Architecture

### Storage Key Convention

All uploaded files are stored in MinIO with the following key structure:

```
uploads/{userId}/{timestamp}-{uuid}.{extension}
```

**Components:**
- `userId` — The authenticated user's ID
- `timestamp` — ISO 8601 timestamp (e.g., `2026-02-23T10:30:00Z`)
- `uuid` — Random UUID v4 (ensures uniqueness even with same timestamp)
- `extension` — File extension derived from MIME type (jpg, png, webp)

**Example:** `uploads/user_123/2026-02-23T10:30:00Z-a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6.jpg`

### URL Format

Public URLs for stored files follow this pattern:

```
https://cdn.reelforge.local/uploads/{userId}/{timestamp}-{uuid}.{extension}
```

In development with MinIO:
```
http://localhost:9000/reelforge/uploads/{userId}/{timestamp}-{uuid}.{extension}
```

MinIO bucket is configured with public read access for the `uploads/` prefix in development.

---

## Endpoints

### 1. Direct Upload

**Request:**
```
POST /api/media/upload
Content-Type: multipart/form-data
```

**Multipart Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | Image file (JPEG, PNG, WebP) |

**Request Example:**
```bash
curl -X POST http://localhost:3001/api/media/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@/path/to/photo.jpg"
```

**Response: 200 OK**

```json
{
  "url": "http://localhost:9000/reelforge/uploads/user_123/2026-02-23T10:30:00Z-a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6.jpg",
  "key": "uploads/user_123/2026-02-23T10:30:00Z-a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6.jpg",
  "width": 1080,
  "height": 1920,
  "size": 245000,
  "mimeType": "image/jpeg"
}
```

**Error: 400 Bad Request** (no file or missing field)

```json
{
  "error": "No file provided",
  "code": "NO_FILE",
  "details": {}
}
```

**Error: 415 Unsupported Media Type** (wrong MIME type)

```json
{
  "error": "Unsupported file type. Accepted: image/jpeg, image/png, image/webp",
  "code": "UNSUPPORTED_MEDIA_TYPE",
  "details": {
    "received": "image/gif",
    "accepted": ["image/jpeg", "image/png", "image/webp"]
  }
}
```

**Error: 413 Payload Too Large** (file exceeds 10MB)

```json
{
  "error": "File size exceeds maximum of 10MB",
  "code": "FILE_TOO_LARGE",
  "details": {
    "fileSize": 15728640,
    "maxSize": 10485760
  }
}
```

**Error: 500 Internal Server Error** (storage error)

```json
{
  "error": "Failed to upload file to storage",
  "code": "STORAGE_ERROR",
  "details": {}
}
```

**Validation Rules:**
- Accepted MIME types: `image/jpeg`, `image/png`, `image/webp`
- Max file size: 10 MB (10,485,760 bytes)
- Image dimensions validation: min 100×100, max 4000×4000 (checked via image processing)
- Filename sanitization: only alphanumeric, hyphens, underscores

---

### 2. Presigned URL Generation

**Request:**
```
GET /api/media/presigned-url
```

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filename` | string | Yes | Original filename (for validation) |
| `contentType` | string | Yes | MIME type (image/jpeg, image/png, or image/webp) |

**Request Example:**
```
GET /api/media/presigned-url?filename=photo.jpg&contentType=image/jpeg
```

**Response: 200 OK**

```json
{
  "uploadUrl": "http://localhost:9000/reelforge?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=minioadmin%2F20260223%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20260223T103000Z&X-Amz-Expires=3600&X-Amz-SignedHeaders=host&X-Amz-Signature=abcd1234...",
  "key": "uploads/user_123/2026-02-23T10:30:00Z-a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6.jpg",
  "expiresIn": 3600
}
```

**Error: 400 Bad Request** (invalid contentType)

```json
{
  "error": "Invalid content type",
  "code": "INVALID_CONTENT_TYPE",
  "details": {
    "received": "image/gif",
    "accepted": ["image/jpeg", "image/png", "image/webp"]
  }
}
```

**Error: 400 Bad Request** (invalid filename)

```json
{
  "error": "Invalid filename",
  "code": "INVALID_FILENAME",
  "details": {}
}
```

**Presigned URL Behavior:**
- Expires in 1 hour (3600 seconds)
- Client can perform a direct PUT or POST to the `uploadUrl`
- Client includes file data as request body
- MinIO validates file size and MIME type on upload
- Presigned URL is single-use (each GET request generates new URL)

---

### 3. Confirm Upload

**Request:**
```
POST /api/media/confirm-upload
```

**Body:**

```typescript
{
  key: string;        // Storage key returned from presigned-url endpoint
}
```

**Request Body Example:**

```json
{
  "key": "uploads/user_123/2026-02-23T10:30:00Z-a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6.jpg"
}
```

**Response: 200 OK**

```json
{
  "url": "http://localhost:9000/reelforge/uploads/user_123/2026-02-23T10:30:00Z-a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6.jpg",
  "key": "uploads/user_123/2026-02-23T10:30:00Z-a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6.jpg",
  "size": 245000,
  "mimeType": "image/jpeg"
}
```

**Error: 404 Not Found** (file not found in storage)

```json
{
  "error": "File not found in storage",
  "code": "NOT_FOUND",
  "details": {
    "key": "uploads/user_123/2026-02-23T10:30:00Z-a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6.jpg"
  }
}
```

---

## Upload Flows

### Flow 1: Direct Upload (Simple)

```
Client                          Backend                         MinIO
  |                               |                              |
  |--- POST /api/media/upload --->|                              |
  |     [multipart file]          |                              |
  |                               |--- validate + upload ------->|
  |                               |<--- file stored -------------|
  |<--- 200 { url, key } ---------|                              |
```

**Best for:** Small files, immediate confirmation needed, simple UX

---

### Flow 2: Presigned URL Upload (Direct-to-S3)

```
Client                          Backend                         MinIO
  |                               |                              |
  |--- GET presigned-url -------->|                              |
  |                               |<--- generate presigned URL --|
  |<--- 200 { uploadUrl, key }----|                              |
  |                               |                              |
  |--- PUT {uploadUrl} + file ----|------- (direct) ------------>|
  |                               |<--- 200 success ------------|
  |                               |                              |
  |--- POST confirm-upload ------>|                              |
  |     { key }                   |--- verify file exists ------>|
  |                               |<--- 200 { url } ------------|
  |<--- 200 { url } -------------|                              |
```

**Best for:** Large files, progress tracking, direct client-to-S3 upload

---

## Authentication & Authorization

Both endpoints require:
- `Authorization: Bearer <token>` header
- Valid user session
- User ID extracted from token and used in storage key

Unauthorized requests (401):
```json
{
  "error": "Unauthorized",
  "code": "UNAUTHORIZED",
  "details": {}
}
```

---

## MIME Type Mappings

| MIME Type | Extension | Description |
|-----------|-----------|-------------|
| `image/jpeg` | `jpg` | JPEG image |
| `image/png` | `png` | PNG image |
| `image/webp` | `webp` | WebP image |

---

## File Size Limits

| Category | Limit | Details |
|----------|-------|---------|
| Max single file | 10 MB | Enforced on both upload and presigned |
| Min dimensions | 100×100 | Width and height both required |
| Max dimensions | 4000×4000 | Prevents extremely large images |

---

## Error Codes Reference

| Code | HTTP | Description |
|------|------|-------------|
| `NO_FILE` | 400 | No file in multipart body |
| `UNSUPPORTED_MEDIA_TYPE` | 415 | Wrong MIME type |
| `FILE_TOO_LARGE` | 413 | Exceeds 10 MB |
| `INVALID_CONTENT_TYPE` | 400 | Invalid contentType param |
| `INVALID_FILENAME` | 400 | Invalid filename param |
| `NOT_FOUND` | 404 | File not found after presigned upload |
| `STORAGE_ERROR` | 500 | Storage system error |
| `UNAUTHORIZED` | 401 | Missing/invalid auth token |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected server error |

---

## Implementation Notes

- All endpoints return `Content-Type: application/json`
- All timestamps are ISO 8601 with UTC timezone
- File extension derived automatically from MIME type
- MinIO bucket name: `reelforge`
- Public URL format depends on environment (dev vs prod)
- Presigned URLs expire after 1 hour
- File size validation occurs at multiple points (request header, actual upload)
- Image dimensions validated via image processing library (e.g., sharp, Pillow)
- Failed presigned uploads do not create empty files in storage
- Cleanup: temporary presigned URL files should be cleaned up after 24 hours if not confirmed

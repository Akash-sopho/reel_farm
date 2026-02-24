# Publishing & Scheduling API Specification

## Overview

This document specifies the Publishing & Scheduling API for ReelForge. This feature allows creators to:
- Connect their Instagram and TikTok accounts via OAuth
- Publish rendered videos directly to connected accounts
- Schedule videos for future publishing
- Track publishing history and status

The API handles:
- OAuth 2.0 authentication with Instagram (Graph API) and TikTok
- Secure storage of access tokens and refresh tokens
- Async video uploads via BullMQ job queue
- Status polling for long-running publish operations
- Automatic token refresh before expiry

Base path: `/api`

---

## Core Concepts

### Social Accounts

A **Social Account** represents a connected Instagram or TikTok account. Each account stores:
- OAuth access and refresh tokens (encrypted at rest)
- Platform user ID and username
- Token expiry information for automatic refresh
- Active/inactive status for soft deletion

### Publish Log

A **Publish Log** tracks each publishing operation. It records:
- Project and render IDs
- Target platform (Instagram or TikTok)
- Publishing status (PENDING → UPLOADING → PUBLISHED | FAILED)
- External video ID from platform (for future reference/deletion)
- Error messages if failed
- Scheduled publish time (null for immediate)
- Actual publish timestamp

### OAuth Flow

1. Frontend calls `GET /api/social/auth/:platform` → receives authorization URL
2. User logs in on platform, grants permissions
3. Platform redirects to `GET /api/social/callback/:platform?code=...&state=...`
4. Backend exchanges code for tokens via platform API
5. Tokens encrypted and stored in SocialAccount
6. Frontend redirected to success/error page

### Publish Flow

**Immediate Publish:**
1. Frontend calls `POST /api/projects/:id/publish` with `{ platform }` (e.g., "instagram")
2. API validates: project exists, render is DONE, connected account exists
3. API returns 202 ACCEPTED with `{ publishLogId }` immediately
4. Job enqueued to BullMQ queue (video-publishes)
5. Worker processes: downloads render MP4, uploads to platform, publishes
6. Frontend polls `GET /api/publishes/:id` for status

**Scheduled Publish:**
1. Frontend calls `POST /api/projects/:id/schedule` with `{ platform, scheduledAt: "2026-03-15T14:30:00Z" }`
2. API validates: project exists, render is DONE, account exists, scheduledAt is future
3. Returns 202 with `{ publishLogId }`
4. Job enqueued with delay: `delay = scheduledAt.getTime() - now.getTime()`
5. Worker processes at scheduled time

### Token Management

- Access tokens stored encrypted in SocialAccount
- Refresh tokens stored encrypted for token renewal
- Before each publish attempt, check if token expired
- If expired and refresh token available, auto-refresh via platform API
- If refresh fails, publish operation fails with TOKEN_EXPIRED error

### Video Validation

- Maximum video duration: 10 minutes (600 seconds)
- Instagram: 15 seconds to 10 minutes
- TikTok: 15 seconds to 10 minutes
- File format: MP4 (H.264 video, AAC audio)
- Minimum resolution: 720x1280 (9:16 aspect ratio)

---

## Data Models

### SocialAccount

```typescript
model SocialAccount {
  id: String @id @default(cuid())
  userId: String                  // Foreign key to User
  platform: "instagram" | "tiktok" // Platform identifier

  // Encrypted token storage (use node:crypto AES-256-GCM)
  encryptedAccessToken: String    // AES-256 encrypted
  encryptedRefreshToken: String?  // AES-256 encrypted (nullable for platforms without refresh)

  // Token metadata
  tokenExpiresAt: DateTime?       // When access token expires (null if no expiry)

  // Platform-specific identifiers
  platformUserId: String          // Platform's user ID (e.g., "12345678")
  platformUsername: String        // Platform's username (e.g., "@creator_name")

  // Account status
  isActive: Boolean @default(true) // Soft deletion flag

  // Timestamps
  createdAt: DateTime @default(now())
  updatedAt: DateTime @updatedAt

  // Relations
  user: User
  publishLogs: PublishLog[]

  @@unique([userId, platform]) // Only one account per platform per user
  @@index([userId])
}
```

### PublishLog

```typescript
model PublishLog {
  id: String @id @default(cuid())
  projectId: String               // Foreign key to Project
  renderId: String                // Foreign key to Render
  socialAccountId: String         // Foreign key to SocialAccount
  platform: "instagram" | "tiktok" // Target platform

  // Status tracking
  status: "PENDING" | "UPLOADING" | "PUBLISHED" | "FAILED"
  externalId: String?             // Platform's video ID after publish (e.g., Instagram container ID)

  // Error handling
  errorCode: String?              // Error code (e.g., "TOKEN_EXPIRED")
  errorMessage: String?           // Human-readable error

  // Scheduling
  scheduledAt: DateTime?          // Scheduled publish time (null for immediate)
  publishedAt: DateTime?          // Actual publish time (null if not yet published)

  // Timestamps
  createdAt: DateTime @default(now())
  updatedAt: DateTime @updatedAt

  // Relations
  project: Project
  render: Render
  socialAccount: SocialAccount

  @@index([projectId])
  @@index([socialAccountId])
  @@index([status])
  @@index([platform])
}
```

### Error Response

```typescript
interface ErrorResponse {
  error: string;                  // Human-readable message
  code: string;                   // Machine code (e.g., "NO_ACCOUNT")
  details?: Record<string, string>;
}
```

---

## Endpoints

### Social Authentication

#### 1. GET /api/social/auth/:platform — Start OAuth Flow

**Purpose:** Get authorization URL to begin OAuth flow for connecting an account.

**Request:**

```
GET /api/social/auth/instagram
```

**Response (200 OK):**

```json
{
  "authUrl": "https://api.instagram.com/oauth/authorize?client_id=...&redirect_uri=...&state=..."
}
```

**Response Fields:**

- `authUrl` — Full authorization URL to redirect user to. Includes:
  - Client ID
  - Redirect URI (backend callback endpoint)
  - State token for CSRF protection
  - Scope: `instagram_business_basic,instagram_business_manage_messages,pages_read_engagement,pages_manage_metadata`

**Status Codes:**

| Code | Meaning |
|------|---------|
| 200 | Auth URL generated |
| 400 | Unsupported platform |

**Error Response (400 - Unsupported Platform):**

```json
{
  "error": "Platform not supported",
  "code": "INVALID_PLATFORM",
  "details": { "platform": "Must be 'instagram' or 'tiktok'" }
}
```

---

#### 2. GET /api/social/callback/:platform — OAuth Callback Handler

**Purpose:** Handle OAuth redirect from platform. Exchanges authorization code for tokens.

**Request:**

```
GET /api/social/callback/instagram?code=...&state=...
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `code` | string | Authorization code from platform |
| `state` | string | State token for CSRF verification |

**Flow:**

1. Verify state token matches session state
2. Exchange code for access token via platform API
3. Fetch user info from platform (user ID, username)
4. Encrypt tokens using AES-256-GCM with environment key
5. Create/update SocialAccount record
6. Redirect to frontend with success or error

**Response (302 Redirect):**

On success:
```
Location: /auth/callback/success?platform=instagram&username=@creator
```

On failure:
```
Location: /auth/callback/error?error_code=TOKEN_EXCHANGE_FAILED&message=...
```

**Status Codes:**

| Code | Meaning |
|------|---------|
| 302 | Redirect to success or error page |
| 400 | Missing/invalid code or state |
| 401 | State verification failed (CSRF protection) |
| 500 | Token exchange failed |

---

#### 3. GET /api/social/accounts — List Connected Accounts

**Purpose:** Fetch all connected social accounts for authenticated user.

**Request:**

```
GET /api/social/accounts
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "accounts": [
    {
      "id": "acct-123",
      "platform": "instagram",
      "platformUsername": "@my_creator",
      "platformUserId": "12345678",
      "isActive": true,
      "createdAt": "2026-02-20T10:30:00Z"
    },
    {
      "id": "acct-456",
      "platform": "tiktok",
      "platformUsername": "@my_tiktok",
      "platformUserId": "987654321",
      "isActive": true,
      "createdAt": "2026-02-21T15:45:00Z"
    }
  ]
}
```

**Response Fields:**

- `accounts[]` — Array of connected accounts
  - `id` — Social account ID
  - `platform` — "instagram" or "tiktok"
  - `platformUsername` — Username on platform
  - `platformUserId` — User ID on platform
  - `isActive` — Whether account is connected
  - `createdAt` — ISO 8601 timestamp

**Status Codes:**

| Code | Meaning |
|------|---------|
| 200 | List returned |
| 401 | Unauthorized |

---

#### 4. DELETE /api/social/accounts/:id — Disconnect Account

**Purpose:** Disconnect a social account (soft delete).

**Request:**

```
DELETE /api/social/accounts/acct-123
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "message": "Account disconnected"
}
```

**Status Codes:**

| Code | Meaning |
|------|---------|
| 200 | Account disconnected |
| 401 | Unauthorized |
| 404 | Account not found |

---

### Publishing & Scheduling

#### 5. POST /api/projects/:id/publish — Publish Video Immediately

**Purpose:** Publish a rendered video to a connected social account immediately.

**Request:**

```
POST /api/projects/proj-123/publish
Content-Type: application/json
Authorization: Bearer <token>

{
  "platform": "instagram",
  "caption": "Check out my new video! 🎬",
  "hashtags": ["reelforge", "creator"]
}
```

**Request Body:**

```typescript
interface PublishRequest {
  platform: "instagram" | "tiktok";  // Target platform
  caption?: string;                  // Video caption (max 2200 chars Instagram, 150 TikTok)
  hashtags?: string[];               // Hashtags to include in caption
}
```

**Response (202 ACCEPTED):**

```json
{
  "publishLogId": "plog-789",
  "status": "PENDING",
  "platform": "instagram",
  "message": "Publishing queued. Check status with this ID."
}
```

**Response Fields:**

- `publishLogId` — ID to poll for status
- `status` — Initial status (always "PENDING")
- `platform` — Confirmed platform
- `message` — User-friendly status message

**Status Codes:**

| Code | Meaning |
|------|---------|
| 202 | Publish job queued |
| 400 | Validation error (see details) |
| 401 | Unauthorized |
| 404 | Project not found |
| 409 | Project render not done |

**Error Response (400 - No Connected Account):**

```json
{
  "error": "No connected account for platform",
  "code": "NO_ACCOUNT",
  "details": { "platform": "instagram" }
}
```

**Error Response (409 - Render Not Done):**

```json
{
  "error": "Project render not complete",
  "code": "NO_DONE_RENDER",
  "details": { "renderStatus": "rendering", "renderId": "render-456" }
}
```

---

#### 6. POST /api/projects/:id/schedule — Schedule Video for Future Publishing

**Purpose:** Schedule a rendered video for publishing at a future time.

**Request:**

```
POST /api/projects/proj-123/schedule
Content-Type: application/json
Authorization: Bearer <token>

{
  "platform": "tiktok",
  "scheduledAt": "2026-03-15T18:00:00Z",
  "caption": "Dropping at 6 PM! 🚀",
  "hashtags": ["tiktok", "viral"]
}
```

**Request Body:**

```typescript
interface ScheduleRequest {
  platform: "instagram" | "tiktok";
  scheduledAt: string;               // ISO 8601 future timestamp
  caption?: string;
  hashtags?: string[];
}
```

**Response (202 ACCEPTED):**

```json
{
  "publishLogId": "plog-890",
  "status": "PENDING",
  "platform": "tiktok",
  "scheduledAt": "2026-03-15T18:00:00Z",
  "message": "Video scheduled for 2026-03-15 at 6:00 PM UTC"
}
```

**Status Codes:**

| Code | Meaning |
|------|---------|
| 202 | Publish job scheduled |
| 400 | Validation error (see details) |
| 401 | Unauthorized |
| 404 | Project not found |
| 409 | Render not done or timestamp in past |

**Error Response (400 - Schedule in Past):**

```json
{
  "error": "Scheduled time must be in future",
  "code": "SCHEDULE_IN_PAST",
  "details": { "scheduledAt": "2026-03-15T18:00:00Z", "now": "2026-03-16T10:00:00Z" }
}
```

---

#### 7. GET /api/projects/:id/publishes — Get Publishing History

**Purpose:** List all publishing attempts for a project (immediate and scheduled).

**Request:**

```
GET /api/projects/proj-123/publishes?platform=instagram&limit=20&page=1
Authorization: Bearer <token>
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `platform` | string | — | Filter by platform ("instagram" or "tiktok") |
| `status` | string | — | Filter by status (PENDING, UPLOADING, PUBLISHED, FAILED) |
| `limit` | number | 20 | Items per page (max 100) |
| `page` | number | 1 | Page number (1-indexed) |

**Response (200 OK):**

```json
{
  "publishes": [
    {
      "id": "plog-789",
      "platform": "instagram",
      "status": "PUBLISHED",
      "externalId": "instagram-container-12345",
      "caption": "Check out my new video!",
      "publishedAt": "2026-02-24T14:30:00Z",
      "scheduledAt": null
    },
    {
      "id": "plog-890",
      "platform": "tiktok",
      "status": "PENDING",
      "externalId": null,
      "caption": "Dropping at 6 PM!",
      "publishedAt": null,
      "scheduledAt": "2026-03-15T18:00:00Z"
    }
  ],
  "total": 2,
  "page": 1,
  "limit": 20,
  "pages": 1
}
```

**Status Codes:**

| Code | Meaning |
|------|---------|
| 200 | List returned |
| 401 | Unauthorized |
| 404 | Project not found |

---

#### 8. GET /api/publishes/:id — Poll Publishing Status

**Purpose:** Poll the status of a publishing operation (for real-time progress updates).

**Request:**

```
GET /api/publishes/plog-789
Authorization: Bearer <token>
```

**Response (200 OK) - PENDING:**

```json
{
  "id": "plog-789",
  "projectId": "proj-123",
  "platform": "instagram",
  "status": "PENDING",
  "externalId": null,
  "errorCode": null,
  "errorMessage": null,
  "publishedAt": null,
  "scheduledAt": null
}
```

**Response (200 OK) - UPLOADING:**

```json
{
  "id": "plog-789",
  "projectId": "proj-123",
  "platform": "instagram",
  "status": "UPLOADING",
  "externalId": null,
  "errorCode": null,
  "errorMessage": null,
  "publishedAt": null,
  "scheduledAt": null
}
```

**Response (200 OK) - PUBLISHED:**

```json
{
  "id": "plog-789",
  "projectId": "proj-123",
  "platform": "instagram",
  "status": "PUBLISHED",
  "externalId": "instagram-container-12345",
  "errorCode": null,
  "errorMessage": null,
  "publishedAt": "2026-02-24T14:30:45Z",
  "scheduledAt": null
}
```

**Response (200 OK) - FAILED:**

```json
{
  "id": "plog-789",
  "projectId": "proj-123",
  "platform": "instagram",
  "status": "FAILED",
  "externalId": null,
  "errorCode": "TOKEN_EXPIRED",
  "errorMessage": "Access token expired. Please reconnect your account.",
  "publishedAt": null,
  "scheduledAt": null
}
```

**Response Fields:**

- `id` — Publish log ID
- `status` — Current status (PENDING, UPLOADING, PUBLISHED, FAILED)
- `externalId` — Platform's video/container ID (null until published)
- `errorCode` — Error code if failed (null if success)
- `errorMessage` — Human-readable error message
- `publishedAt` — Actual publication timestamp (null if not published)
- `scheduledAt` — Scheduled time if scheduled (null if immediate)

**Status Codes:**

| Code | Meaning |
|------|---------|
| 200 | Status returned |
| 401 | Unauthorized |
| 404 | Publish log not found |

---

## Platform-Specific Implementation

### Instagram Publishing Flow

**API:** Meta Graph API (v18.0+)

**Steps:**

1. **Authenticate:** Use stored access token from SocialAccount
2. **Initialize Upload:** `POST /me/media` with `{ media_type: 'VIDEO', video_data: <mp4_file>, thumb_offset: 0 }`
   - Returns `{ id: <container_id> }`
3. **Wait for Processing:** Poll `GET /<container_id>` until `{ status: 'FINISHED' }`
4. **Publish:** `POST /me/media_publish` with `{ creation_id: <container_id>, user_id: <ig_user_id> }`
   - Returns `{ media_id: <published_id> }`
5. **Add Caption:** `POST /<media_id>` with `{ caption: <caption_text> }`

**Constraints:**

- Video duration: 15 seconds to 10 minutes
- Aspect ratio: 9:16 (1080x1920 recommended)
- File size: max 4 GB
- Format: MP4 (H.264 + AAC)
- Caption max: 2,200 characters

**Error Handling:**

- `#100 Unsupported get request` → Invalid user token
- `#2500 Error validating video format` → Wrong format/codec
- `#9003 Invalid file` → Corrupted file
- `#3xx` token errors → Token expired, attempt refresh then fail with TOKEN_EXPIRED

---

### TikTok Publishing Flow

**API:** TikTok Content Posting API v1

**Steps:**

1. **Authenticate:** Use stored access token from SocialAccount
2. **Initialize Upload:** `POST /v1/post/publish/action/init`
   - Returns `{ upload_url, upload_id }`
3. **Upload Video Chunk:** `POST <upload_url>` with `{ upload_id, chunk_data, is_final_chunk }`
   - For large files, chunk into 5MB segments
4. **Publish:** `POST /v1/post/publish/action/publish` with `{ upload_id, post_info: { title: <caption> } }`
   - Returns `{ publish_id }`
5. **Poll Status:** `GET /v1/post/publish/status/<publish_id>` until complete

**Constraints:**

- Video duration: 15 seconds to 10 minutes (can be up to 60 min for verified creators)
- Aspect ratio: 9:16 to 16:9 (9:16 recommended for Reels-style)
- File size: max 2.4 GB
- Format: MP4, WebM, MOV (H.264 + AAC preferred)
- Caption max: 150 characters
- Hash tags: up to 3

**Error Handling:**

- `429` Duplicate submit within 5 seconds → Implement backoff
- `400 video_validate_failed` → Format/codec issue
- `401 access_token_invalid` → Token expired, attempt refresh
- `invalid_video_duration` → Video too long/short

---

## Error Codes

### Publishing Errors

| Code | HTTP | Meaning | User Message |
|------|------|---------|--------------|
| `NO_ACCOUNT` | 409 | No connected account for platform | "Connect your Instagram/TikTok account first" |
| `NO_DONE_RENDER` | 409 | Project render not complete | "Render your video first" |
| `TOKEN_EXPIRED` | 500 | Access token expired, refresh failed | "Please reconnect your account" |
| `TOKEN_REFRESH_FAILED` | 500 | Refresh token attempt failed | "Please reconnect your account" |
| `VIDEO_TOO_LONG` | 400 | Rendered video exceeds platform limit | "Video is too long (max 10 minutes)" |
| `VIDEO_INVALID_FORMAT` | 500 | Video format not supported by platform | "Invalid video format" |
| `PLATFORM_ERROR` | 500 | Platform API error (quota, limits, etc.) | "Platform error: try again later" |
| `SCHEDULE_IN_PAST` | 400 | Scheduled time is before now | "Schedule time must be in future" |
| `INVALID_PLATFORM` | 400 | Platform not recognized | "Platform must be 'instagram' or 'tiktok'" |
| `UPLOAD_FAILED` | 500 | File upload to platform failed | "Upload failed, please try again" |
| `INVALID_CAPTION` | 400 | Caption too long or invalid chars | "Caption too long for this platform" |

---

## Status Transitions

### Publish Log Status Flow

```
PENDING
  ↓
UPLOADING (worker starts upload to platform)
  ├─→ PUBLISHED (successfully published, externalId set)
  └─→ FAILED (error during upload, errorCode + errorMessage set)
```

**State Persistence:**

- Once in FAILED, remains FAILED (no retry)
- Once in PUBLISHED, remains PUBLISHED
- Status changes persisted to database immediately
- Frontend polls until not PENDING/UPLOADING

---

## Security Considerations

### Token Encryption

- Use `node:crypto` AES-256-GCM
- Encryption key: `ENCRYPTION_KEY` env var (32 bytes)
- Store IV (initialization vector) with ciphertext
- Generate unique IV for each encryption

```typescript
// Encryption example
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
const encrypted = Buffer.concat([
  cipher.update(plaintext, 'utf8'),
  cipher.final()
]);
const authTag = cipher.getAuthTag();
// Store: `${iv.toString('hex')}:${encrypted.toString('hex')}:${authTag.toString('hex')}`
```

### CSRF Protection

- Generate random state token in `GET /api/social/auth/:platform`
- Store in session/cache with 10-minute TTL
- Verify state token matches in callback
- Use secure flag on session cookies

### Rate Limiting

- Publish endpoint: 10 requests/minute per user
- Schedule endpoint: 10 requests/minute per user
- Poll status endpoint: 60 requests/minute per user

---

## Acceptance Criteria

✅ **Spec covers:**
- All 8 endpoints with request/response shapes
- All error codes and validation rules
- SocialAccount and PublishLog models
- Instagram Graph API flow (step-by-step)
- TikTok Content Posting API flow (step-by-step)
- Token encryption and refresh strategy
- Status transitions and polling mechanism
- Security considerations (CSRF, token encryption)

---

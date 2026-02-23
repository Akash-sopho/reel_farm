import { z } from 'zod';

// URL validation regex for Instagram and TikTok
const INSTAGRAM_URL = /^https?:\/\/(www\.)?instagram\.com\/(reel|p)\/[a-zA-Z0-9_-]+\/?$/;
const TIKTOK_URL = /^https?:\/\/(www\.|m\.)?tiktok\.com\/@[a-zA-Z0-9_.-]+\/video\/\d+\/?$/;
const TIKTOK_SHORT_URL = /^https?:\/\/(vm|vt)\.tiktok\.com\/[a-zA-Z0-9_-]+\/?$/;

/**
 * Validate that URL is from Instagram or TikTok
 */
export const isValidIntakeUrl = (url: string): boolean => {
  return INSTAGRAM_URL.test(url) || TIKTOK_URL.test(url) || TIKTOK_SHORT_URL.test(url);
};

/**
 * Detect platform from URL
 */
export const detectPlatform = (url: string): 'instagram' | 'tiktok' | null => {
  if (INSTAGRAM_URL.test(url)) return 'instagram';
  if (TIKTOK_URL.test(url) || TIKTOK_SHORT_URL.test(url)) return 'tiktok';
  return null;
};

/**
 * POST /api/intake/fetch request schema
 */
export const FetchUrlsSchema = z.object({
  urls: z
    .array(z.string().url('Must be a valid URL'))
    .min(1, 'At least one URL required')
    .max(20, 'Maximum 20 URLs per batch')
    .refine(
      (urls) => urls.every((url) => isValidIntakeUrl(url)),
      {
        message: 'All URLs must be from Instagram or TikTok',
      }
    ),
});

export type FetchUrlsRequest = z.infer<typeof FetchUrlsSchema>;

/**
 * GET /api/intake/collections query schema
 */
export const CollectionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['PENDING', 'FETCHING', 'READY', 'FAILED']).optional(),
  platform: z.enum(['instagram', 'tiktok']).optional(),
  tag: z.union([z.string(), z.array(z.string())]).optional(),
  sortBy: z.enum(['createdAt', 'durationSeconds', 'title']).default('createdAt'),
  sortOrder: z.enum(['ASC', 'DESC']).default('DESC'),
});

export type CollectionsQuery = z.infer<typeof CollectionsQuerySchema>;

/**
 * PATCH /api/intake/videos/:id request schema
 */
export const UpdateCollectedVideoSchema = z.object({
  tags: z
    .array(z.string().max(30, 'Tag max 30 characters'))
    .max(20, 'Maximum 20 tags')
    .optional(),
  caption: z.string().max(500, 'Caption max 500 characters').optional(),
});

export type UpdateCollectedVideoRequest = z.infer<typeof UpdateCollectedVideoSchema>;

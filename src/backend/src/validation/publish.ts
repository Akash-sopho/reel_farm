import { z } from 'zod';

// Publish request schema
export const PublishRequestSchema = z.object({
  platform: z.enum(['instagram', 'tiktok'], {
    errorMap: () => ({ message: "Platform must be 'instagram' or 'tiktok'" }),
  }),
  caption: z.string().max(2200, 'Caption too long').optional(),
  hashtags: z.array(z.string()).optional(),
});

// Schedule request schema
export const ScheduleRequestSchema = z.object({
  platform: z.enum(['instagram', 'tiktok'], {
    errorMap: () => ({ message: "Platform must be 'instagram' or 'tiktok'" }),
  }),
  scheduledAt: z.string().datetime('Invalid ISO 8601 timestamp'),
  caption: z.string().max(2200, 'Caption too long').optional(),
  hashtags: z.array(z.string()).optional(),
});

// List publishes query schema
export const ListPublishesQuerySchema = z.object({
  platform: z.enum(['instagram', 'tiktok']).optional(),
  status: z.enum(['PENDING', 'UPLOADING', 'PUBLISHED', 'FAILED']).optional(),
  limit: z.coerce
    .number()
    .int('Limit must be an integer')
    .min(1, 'Limit must be >= 1')
    .max(100, 'Limit must be <= 100')
    .default(20),
  page: z.coerce
    .number()
    .int('Page must be an integer')
    .positive('Page must be >= 1')
    .default(1),
});

// Type exports
export type PublishRequest = z.infer<typeof PublishRequestSchema>;
export type ScheduleRequest = z.infer<typeof ScheduleRequestSchema>;
export type ListPublishesQuery = z.infer<typeof ListPublishesQuerySchema>;

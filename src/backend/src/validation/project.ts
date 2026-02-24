import { z } from 'zod';

// Slot fill schema
const SlotFillSchema = z.object({
  slotId: z.string().min(1, 'Slot ID is required'),
  type: z.enum(['image', 'text', 'video', 'audio']),
  value: z.string().min(1, 'Value is required'),
});

// Create project schema
export const CreateProjectSchema = z.object({
  templateId: z.string().min(1, 'Template ID is required'),
  name: z.string().max(255, 'Name must be less than 255 characters').optional(),
});

// Update project schema
export const UpdateProjectSchema = z.object({
  slotFills: z.array(SlotFillSchema).optional(),
  musicUrl: z.string().url('Invalid music URL').nullable().optional(),
  name: z.string().max(255, 'Name must be less than 255 characters').optional(),
  settings: z.record(z.unknown()).optional(),
});

// List projects query schema
export const ListProjectsQuerySchema = z.object({
  page: z.coerce
    .number()
    .int('Page must be an integer')
    .positive('Page must be >= 1')
    .default(1),
  limit: z.coerce
    .number()
    .int('Limit must be an integer')
    .min(1, 'Limit must be >= 1')
    .max(100, 'Limit must be <= 100')
    .default(20),
  status: z.enum(['draft', 'ready', 'rendering', 'done', 'published']).optional(),
});

// Type exports
export type CreateProjectRequest = z.infer<typeof CreateProjectSchema>;
export type UpdateProjectRequest = z.infer<typeof UpdateProjectSchema>;
export type ListProjectsQuery = z.infer<typeof ListProjectsQuerySchema>;

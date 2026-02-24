import { z } from 'zod';
import { TemplateSchemaValidator } from '../../../shared/validation/template-validator';

/**
 * Validator for query params in GET /api/templates
 */
export const ListTemplatesQuerySchema = z.object({
  category: z.string().optional(),
  tags: z.string().optional(), // comma-separated
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  published: z.coerce.boolean().default(true),
});

export type ListTemplatesQuery = z.infer<typeof ListTemplatesQuerySchema>;

/**
 * Validator for POST /api/templates body
 */
export const CreateTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  category: z.string().min(1),
  tags: z.array(z.string()).optional().default([]),
  description: z.string().max(1000).optional(),
  schema: TemplateSchemaValidator,
  thumbnailUrl: z.string().url().optional(),
  isPublished: z.boolean().optional().default(false),
});

export type CreateTemplateRequest = z.infer<typeof CreateTemplateSchema>;

/**
 * Validator for PATCH /api/templates/:id body
 */
export const UpdateTemplateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens').optional(),
  category: z.string().min(1).optional(),
  tags: z.array(z.string()).optional(),
  description: z.string().max(1000).optional(),
  schema: TemplateSchemaValidator.optional(),
  thumbnailUrl: z.string().url().nullable().optional(),
  isPublished: z.boolean().optional(),
});

export type UpdateTemplateRequest = z.infer<typeof UpdateTemplateSchema>;

/**
 * Validator for POST /api/templates/batch-extract body
 */
export const BatchExtractTemplateSchema = z.object({
  collectedVideoIds: z.array(z.string().cuid()).min(1).max(100),
  autoSeedThreshold: z.number().min(0).max(1).optional().default(0.75),
  templateDefaults: z.object({
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }).optional(),
});

export type BatchExtractTemplateRequest = z.infer<typeof BatchExtractTemplateSchema>;

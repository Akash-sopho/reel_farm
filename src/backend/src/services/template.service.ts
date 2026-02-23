import prisma from '../lib/prisma';
import { Template as TemplateType } from '../types/template';

interface ListTemplatesFilters {
  category?: string;
  tags?: string[];
  published?: boolean;
}

interface PaginationParams {
  page: number;
  limit: number;
}

export interface ListTemplatesResult {
  data: TemplateType[];
  total: number;
  page: number;
  limit: number;
}

/**
 * List templates with filters and pagination
 */
export async function listTemplates(
  filters: ListTemplatesFilters,
  pagination: PaginationParams
): Promise<ListTemplatesResult> {
  const { category, tags, published = true } = filters;
  const { page, limit } = pagination;

  // Build where clause
  const where: any = {};

  if (published !== undefined) {
    where.isPublished = published;
  }

  if (category) {
    where.category = category;
  }

  if (tags && tags.length > 0) {
    // Tags is an array column; we want to match ANY tag (OR logic)
    // In PostgreSQL with Prisma, we use hasSome for array overlap
    where.tags = {
      hasSome: tags,
    };
  }

  // Get total count
  const total = await prisma.template.count({ where });

  // Get paginated results
  const skip = (page - 1) * limit;
  const data = await prisma.template.findMany({
    where,
    skip,
    take: limit,
    orderBy: { createdAt: 'desc' },
  });

  return {
    data: data as unknown as TemplateType[],
    total,
    page,
    limit,
  };
}

/**
 * Get a single template by ID
 */
export async function getTemplateById(id: string): Promise<TemplateType | null> {
  const template = await prisma.template.findUnique({
    where: { id },
  });

  return template as TemplateType | null;
}

/**
 * Create a new template
 */
export async function createTemplate(data: {
  name: string;
  slug: string;
  category: string;
  tags?: string[];
  description?: string;
  schema: unknown;
  thumbnailUrl?: string;
  isPublished?: boolean;
}): Promise<TemplateType> {
  // Check if slug already exists
  const existing = await prisma.template.findUnique({
    where: { slug: data.slug },
  });

  if (existing) {
    throw new Error('DUPLICATE_SLUG');
  }

  // Calculate duration from schema scenes
  const schema = data.schema as any;
  const durationSeconds = schema.scenes?.reduce(
    (total: number, scene: any) => total + (scene.durationSeconds || 0),
    0
  ) || 0;

  const template = await prisma.template.create({
    data: {
      name: data.name,
      slug: data.slug,
      category: data.category,
      tags: data.tags || [],
      description: data.description || '',
      schema: data.schema as any,
      thumbnailUrl: data.thumbnailUrl || null,
      durationSeconds,
      isPublished: data.isPublished || false,
    },
  });

  return template as unknown as TemplateType;
}

/**
 * Update a template
 */
export async function updateTemplate(
  id: string,
  data: Partial<{
    name: string;
    slug: string;
    category: string;
    tags: string[];
    description: string;
    schema: unknown;
    thumbnailUrl: string | null;
    isPublished: boolean;
  }>
): Promise<TemplateType> {
  // Check if template exists
  const existing = await prisma.template.findUnique({ where: { id } });
  if (!existing) {
    throw new Error('NOT_FOUND');
  }

  // If slug is being changed, check for uniqueness
  if (data.slug && data.slug !== existing.slug) {
    const slugExists = await prisma.template.findUnique({
      where: { slug: data.slug },
    });
    if (slugExists) {
      throw new Error('DUPLICATE_SLUG');
    }
  }

  // If schema is being updated, recalculate duration
  let updateData: any = { ...data };
  if (data.schema) {
    const schema = data.schema as any;
    updateData.durationSeconds = schema.scenes?.reduce(
      (total: number, scene: any) => total + (scene.durationSeconds || 0),
      0
    ) || 0;
    updateData.schema = updateData.schema as any;
  }

  const template = await prisma.template.update({
    where: { id },
    data: updateData,
  });

  return template as unknown as TemplateType;
}

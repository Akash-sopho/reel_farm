import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  listTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
} from '../services/template.service';
import {
  ListTemplatesQuerySchema,
  CreateTemplateSchema,
  UpdateTemplateSchema,
} from '../validation/template';
import { HttpError } from '../middleware/error-handler';
import { Template } from '../types/template';

const router = Router();

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

/**
 * GET /api/templates
 * List templates with pagination and filters
 */
router.get(
  '/',
  async (req: Request, res: Response<PaginatedResponse<Template>>, next: NextFunction) => {
    try {
      // Validate query params
      const query = ListTemplatesQuerySchema.parse(req.query);

      // Parse tags from comma-separated string
      const tags = query.tags?.split(',').map((t) => t.trim()).filter((t) => t) || [];

      const result = await listTemplates(
        {
          category: query.category,
          tags: tags.length > 0 ? tags : undefined,
          published: query.published,
        },
        {
          page: query.page,
          limit: query.limit,
        }
      );

      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const details = error.errors.reduce(
          (acc, err) => {
            const path = err.path.join('.');
            acc[path] = err.message;
            return acc;
          },
          {} as Record<string, string>
        );
        return next(new HttpError(400, 'Validation failed', 'VALIDATION_ERROR', details));
      }
      next(error);
    }
  }
);

/**
 * GET /api/templates/:id
 * Get single template by ID
 */
router.get('/:id', async (req: Request, res: Response<Template>, next: NextFunction) => {
  try {
    const template = await getTemplateById(req.params.id);

    if (!template) {
      throw new HttpError(404, 'Template not found', 'NOT_FOUND');
    }

    res.json(template);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/templates
 * Create new template (admin only)
 */
router.post(
  '/',
  async (req: Request, res: Response<Template>, next: NextFunction) => {
    try {
      // Validate body
      const data = CreateTemplateSchema.parse(req.body);

      const template = await createTemplate(data as Parameters<typeof createTemplate>[0]);

      res.status(201).json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const details = error.errors.reduce(
          (acc, err) => {
            const path = err.path.join('.');
            acc[path] = err.message;
            return acc;
          },
          {} as Record<string, string>
        );
        return next(new HttpError(400, 'Validation failed', 'VALIDATION_ERROR', details));
      }
      if (error instanceof Error && error.message === 'DUPLICATE_SLUG') {
        return next(new HttpError(409, 'Template slug already exists', 'DUPLICATE_SLUG', {
          slug: req.body.slug,
        }));
      }
      next(error);
    }
  }
);

/**
 * PATCH /api/templates/:id
 * Update template (admin only)
 */
router.patch(
  '/:id',
  async (req: Request, res: Response<Template>, next: NextFunction) => {
    try {
      // Validate body
      const data = UpdateTemplateSchema.parse(req.body);

      const template = await updateTemplate(req.params.id, data as Parameters<typeof updateTemplate>[1]);

      res.json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const details = error.errors.reduce(
          (acc, err) => {
            const path = err.path.join('.');
            acc[path] = err.message;
            return acc;
          },
          {} as Record<string, string>
        );
        return next(new HttpError(400, 'Validation failed', 'VALIDATION_ERROR', details));
      }
      if (error instanceof Error && error.message === 'NOT_FOUND') {
        return next(new HttpError(404, 'Template not found', 'NOT_FOUND'));
      }
      if (error instanceof Error && error.message === 'DUPLICATE_SLUG') {
        return next(new HttpError(409, 'Template slug already exists', 'DUPLICATE_SLUG', {
          slug: req.body.slug,
        }));
      }
      next(error);
    }
  }
);

export default router;

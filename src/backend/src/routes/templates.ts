import { Router, Request, Response, NextFunction } from 'express';
import { Queue } from 'bullmq';
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
  BatchExtractTemplateSchema,
} from '../validation/template';
import { HttpError } from '../middleware/error-handler';
import { Template } from '../types/template';
import prisma from '../lib/prisma';

const router = Router();

// Middleware to inject extraction queue
let extractionQueue: Queue;

export function setExtractionQueue(queue: Queue) {
  extractionQueue = queue;
}

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
 * GET /api/templates/drafts
 * List unpublished (extracted) templates awaiting review
 */
router.get('/drafts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '50', 10);
    const status = (req.query.status as string) || undefined;
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const order = ((req.query.order as string) || 'desc').toUpperCase();

    // Validate pagination
    if (page < 1 || limit < 1 || limit > 100) {
      throw new HttpError(400, 'Invalid pagination parameters', 'VALIDATION_ERROR', {
        page,
        limit,
      });
    }

    // Build query
    const where: any = {
      isPublished: false,
      extractedFromVideoId: { not: null },
    };

    if (status) {
      where.extractionStatus = status;
    }

    // Get total count
    const total = await (prisma.template as any).count({ where });

    // Get paginated drafts
    const drafts = await (prisma.template as any).findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: {
        [sortBy]: order.toLowerCase(),
      },
    });

    // Transform response to include quality info
    const draftsWithQuality = drafts.map((template: any) => ({
      id: template.id,
      name: template.name,
      category: template.category,
      description: template.description,
      isPublished: template.isPublished,
      extractionStatus: template.extractionStatus,
      extractedFromVideoId: template.extractedFromVideoId,
      sceneCount: template.schema?.scenes?.length || 0,
      slotCount: template.schema?.slots?.length || 0,
      createdAt: template.createdAt,
      completedAt: template.extractionStatus === 'COMPLETED' ? template.updatedAt : null,
      quality: template.extractionQuality,
    }));

    const pages = Math.ceil(total / limit);

    res.json({
      drafts: draftsWithQuality,
      total,
      page,
      limit,
      pages,
    });
  } catch (error) {
    next(error);
  }
});

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
 * POST /api/templates/extract
 * Extract template from analyzed collected video
 */
router.post(
  '/extract',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!extractionQueue) {
        throw new Error('Extraction queue not initialized');
      }

      const { collectedVideoId, name, category, description } = req.body;

      // Validate input
      if (!collectedVideoId || !name || !category) {
        throw new HttpError(
          400,
          'Missing required fields: collectedVideoId, name, category',
          'VALIDATION_ERROR',
          { required: ['collectedVideoId', 'name', 'category'] }
        );
      }

      // Verify video exists and is analyzed
      const video = await (prisma.collectedVideo as any).findUnique({
        where: { id: collectedVideoId },
      });

      if (!video) {
        throw new HttpError(404, 'Collected video not found', 'VIDEO_NOT_FOUND', { collectedVideoId });
      }

      if ((video as any).analysisStatus !== 'ANALYZED') {
        throw new HttpError(
          400,
          'Video analysis is not complete',
          'ANALYSIS_NOT_READY',
          { videoId: collectedVideoId, status: (video as any).analysisStatus }
        );
      }

      // Create template record
      const template = await (prisma.template as any).create({
        data: {
          name,
          slug: `extracted-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          category,
          description: description || '',
          schema: {}, // Empty schema, will be populated by extraction job
          isPublished: false,
          extractedFromVideoId: collectedVideoId,
          extractionStatus: 'EXTRACTING',
        },
      });

      // Enqueue extraction job
      const job = await extractionQueue.add(
        'template-extraction',
        {
          templateId: template.id,
          videoId: collectedVideoId,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000, // 5 seconds initial
          },
          removeOnComplete: false,
          removeOnFail: false,
        }
      );

      res.status(202).json({
        templateId: template.id,
        status: 'EXTRACTING',
        jobId: job.id,
        startedAt: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/templates/batch-extract
 * Extract templates from multiple analyzed videos in parallel with auto-seeding
 */
router.post(
  '/batch-extract',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!extractionQueue) {
        throw new Error('Extraction queue not initialized');
      }

      // Validate request body
      const data = BatchExtractTemplateSchema.parse(req.body);
      const { collectedVideoIds, autoSeedThreshold, templateDefaults } = data;

      // Verify all videos exist and are analyzed
      const videos = await (prisma.collectedVideo as any).findMany({
        where: {
          id: { in: collectedVideoIds },
        },
      });

      if (videos.length !== collectedVideoIds.length) {
        const foundIds = videos.map((v: any) => v.id);
        const missingIds = collectedVideoIds.filter((id: string) => !foundIds.includes(id));
        throw new HttpError(404, 'One or more videos not found', 'VIDEO_NOT_FOUND', {
          missingIds,
        });
      }

      // Check all videos have been analyzed
      const notAnalyzedVideos = videos.filter((v: any) => v.analysisStatus !== 'ANALYZED');
      if (notAnalyzedVideos.length > 0) {
        throw new HttpError(
          400,
          'All videos must have analysisStatus === "ANALYZED"',
          'VIDEO_NOT_ANALYZED',
          {
            notAnalyzed: notAnalyzedVideos.map((v: any) => ({
              id: v.id,
              status: v.analysisStatus,
            })),
          }
        );
      }

      // Create template records and enqueue jobs in parallel
      const templates: any[] = [];
      const jobs: any[] = [];

      for (const videoId of collectedVideoIds) {
        const video = videos.find((v: any) => v.id === videoId);

        // Create template record
        const template = await (prisma.template as any).create({
          data: {
            name: `${templateDefaults?.category ? templateDefaults.category : 'Extracted'} Template ${Date.now()}`,
            slug: `batch-extracted-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            category: templateDefaults?.category || 'trending',
            description: '',
            schema: {},
            isPublished: false,
            extractedFromVideoId: videoId,
            extractionStatus: 'EXTRACTING',
            tags: templateDefaults?.tags || [],
          },
        });

        // Store auto-seed threshold in job data for later use in worker
        const job = await extractionQueue.add(
          'template-extraction',
          {
            templateId: template.id,
            videoId: videoId,
            autoSeedThreshold,
          },
          {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 5000,
            },
            removeOnComplete: false,
            removeOnFail: false,
          }
        );

        templates.push({
          templateId: template.id,
          collectedVideoId: videoId,
          jobId: job.id,
          status: 'EXTRACTING',
          startedAt: new Date().toISOString(),
        });

        jobs.push(job);
      }

      res.status(202).json({
        batchId: `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        totalCount: collectedVideoIds.length,
        pendingCount: collectedVideoIds.length,
        completedCount: 0,
        failedCount: 0,
        templates,
        message: `Batch extraction enqueued for ${collectedVideoIds.length} videos`,
      });
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

/**
 * PATCH /api/templates/:id/publish
 * Publish or reject a draft template
 */
router.patch(
  '/:id/publish',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { action, revisions, reason } = req.body;

      // Validate action
      if (!action || !['publish', 'reject'].includes(action)) {
        throw new HttpError(
          400,
          'Invalid action. Must be "publish" or "reject"',
          'VALIDATION_ERROR',
          { action }
        );
      }

      // Get template
      const template = await (prisma.template as any).findUnique({
        where: { id },
      });

      if (!template) {
        throw new HttpError(404, 'Template not found', 'TEMPLATE_NOT_FOUND', { templateId: id });
      }

      if (template.isPublished) {
        throw new HttpError(
          400,
          'Template is already published',
          'NOT_A_DRAFT',
          { templateId: id }
        );
      }

      if (action === 'publish') {
        // Merge revisions if provided
        const updateData: any = {
          isPublished: true,
          publishedAt: new Date(),
        };

        if (revisions?.name) {
          updateData.name = revisions.name;
        }

        if (revisions?.schema) {
          updateData.schema = revisions.schema;
        }

        const updated = await (prisma.template as any).update({
          where: { id },
          data: updateData,
        });

        res.json({
          id: updated.id,
          name: updated.name,
          isPublished: updated.isPublished,
          publishedAt: updated.publishedAt,
        });
      } else {
        // Reject action
        const updated = await (prisma.template as any).update({
          where: { id },
          data: {
            isPublished: false,
            extractionStatus: 'REJECTED',
            rejectionReason: reason || 'Rejected by supervisor',
          },
        });

        res.json({
          id: updated.id,
          name: updated.name,
          isPublished: updated.isPublished,
          extractionStatus: updated.extractionStatus,
          rejectionReason: updated.rejectionReason,
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

export default router;

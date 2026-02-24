import { Router, Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Queue } from 'bullmq';
import prisma from '../lib/prisma';
import {
  PublishRequestSchema,
  ScheduleRequestSchema,
  ListPublishesQuerySchema,
} from '../validation/publish';
import { HttpError } from '../middleware/error-handler';

const router = Router();
const db = prisma as any;

// Middleware to inject publish queue (will be passed from server.ts)
let publishQueue: Queue;

export function setPublishQueue(queue: Queue) {
  publishQueue = queue;
}

/**
 * POST /api/projects/:id/publish
 * Publish video immediately
 */
router.post('/:projectId/publish', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!publishQueue) {
      throw new HttpError(500, 'Publish queue not initialized', 'QUEUE_ERROR');
    }

    // Validate request body
    let validatedBody;
    try {
      validatedBody = await PublishRequestSchema.parseAsync(req.body);
    } catch (error) {
      if (error instanceof ZodError) {
        const details: Record<string, string> = {};
        error.errors.forEach((err) => {
          const path = err.path.join('.');
          details[path] = err.message;
        });

        return res.status(400).json({
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details,
        });
      }
      throw error;
    }

    // Extract userId from auth
    const userId = (req as any).userId || 'test-user';

    // Get project and verify user owns it
    const project = await db.project.findUnique({
      where: { id: req.params.projectId },
      include: { render: true },
    });

    if (!project) {
      return res.status(404).json({
        error: 'Project not found',
        code: 'NOT_FOUND',
        details: {},
      });
    }

    if (project.userId !== userId) {
      return res.status(403).json({
        error: 'Unauthorized',
        code: 'FORBIDDEN',
        details: {},
      });
    }

    // Check if project has a done render
    if (!project.render || project.render.status !== 'DONE') {
      return res.status(409).json({
        error: 'Project render not complete',
        code: 'NO_DONE_RENDER',
        details: {
          renderStatus: project.render?.status || 'none',
          renderId: project.render?.id || 'none',
        },
      });
    }

    // Check if user has connected social account for platform
    const socialAccount = await db.socialAccount.findFirst({
      where: {
        userId,
        platform: validatedBody.platform,
        isActive: true,
      },
    });

    if (!socialAccount) {
      return res.status(409).json({
        error: 'No connected account for platform',
        code: 'NO_ACCOUNT',
        details: { platform: validatedBody.platform },
      });
    }

    // Create publish log
    const publishLog = await db.publishLog.create({
      data: {
        projectId: project.id,
        renderId: project.render.id,
        socialAccountId: socialAccount.id,
        platform: validatedBody.platform,
        status: 'PENDING',
      },
    });

    // Enqueue publish job
    await publishQueue.add(
      'publish',
      {
        publishLogId: publishLog.id,
        platform: validatedBody.platform,
        renderId: project.render.id,
        socialAccountId: socialAccount.id,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      }
    );

    res.status(202).json({
      publishLogId: publishLog.id,
      status: 'PENDING',
      platform: validatedBody.platform,
      message: 'Publishing queued. Check status with this ID.',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/projects/:id/schedule
 * Schedule video for future publishing
 */
router.post('/:projectId/schedule', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!publishQueue) {
      throw new HttpError(500, 'Publish queue not initialized', 'QUEUE_ERROR');
    }

    // Validate request body
    let validatedBody;
    try {
      validatedBody = await ScheduleRequestSchema.parseAsync(req.body);
    } catch (error) {
      if (error instanceof ZodError) {
        const details: Record<string, string> = {};
        error.errors.forEach((err) => {
          const path = err.path.join('.');
          details[path] = err.message;
        });

        return res.status(400).json({
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details,
        });
      }
      throw error;
    }

    // Extract userId from auth
    const userId = (req as any).userId || 'test-user';

    // Parse scheduled time
    const scheduledAt = new Date(validatedBody.scheduledAt);
    const now = new Date();

    // Check if scheduled time is in the future
    if (scheduledAt <= now) {
      return res.status(400).json({
        error: 'Scheduled time must be in future',
        code: 'SCHEDULE_IN_PAST',
        details: {
          scheduledAt: validatedBody.scheduledAt,
          now: now.toISOString(),
        },
      });
    }

    // Get project and verify user owns it
    const project = await db.project.findUnique({
      where: { id: req.params.projectId },
      include: { render: true },
    });

    if (!project) {
      return res.status(404).json({
        error: 'Project not found',
        code: 'NOT_FOUND',
        details: {},
      });
    }

    if (project.userId !== userId) {
      return res.status(403).json({
        error: 'Unauthorized',
        code: 'FORBIDDEN',
        details: {},
      });
    }

    // Check if project has a done render
    if (!project.render || project.render.status !== 'DONE') {
      return res.status(409).json({
        error: 'Project render not complete',
        code: 'NO_DONE_RENDER',
        details: {
          renderStatus: project.render?.status || 'none',
          renderId: project.render?.id || 'none',
        },
      });
    }

    // Check if user has connected social account for platform
    const socialAccount = await db.socialAccount.findFirst({
      where: {
        userId,
        platform: validatedBody.platform,
        isActive: true,
      },
    });

    if (!socialAccount) {
      return res.status(409).json({
        error: 'No connected account for platform',
        code: 'NO_ACCOUNT',
        details: { platform: validatedBody.platform },
      });
    }

    // Create publish log
    const publishLog = await db.publishLog.create({
      data: {
        projectId: project.id,
        renderId: project.render.id,
        socialAccountId: socialAccount.id,
        platform: validatedBody.platform,
        status: 'PENDING',
        scheduledAt,
      },
    });

    // Calculate delay from now to scheduled time
    const delayMs = scheduledAt.getTime() - now.getTime();

    // Enqueue publish job with delay
    await publishQueue.add(
      'publish',
      {
        publishLogId: publishLog.id,
        platform: validatedBody.platform,
        renderId: project.render.id,
        socialAccountId: socialAccount.id,
      },
      {
        delay: delayMs,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      }
    );

    res.status(202).json({
      publishLogId: publishLog.id,
      status: 'PENDING',
      platform: validatedBody.platform,
      scheduledAt: validatedBody.scheduledAt,
      message: `Video scheduled for ${scheduledAt.toLocaleString()} UTC`,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/projects/:id/publishes
 * Get publishing history for a project
 */
router.get('/:projectId/publishes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate query params
    let validatedQuery;
    try {
      validatedQuery = await ListPublishesQuerySchema.parseAsync(req.query);
    } catch (error) {
      if (error instanceof ZodError) {
        const details: Record<string, string> = {};
        error.errors.forEach((err) => {
          const path = err.path.join('.');
          details[path] = err.message;
        });

        return res.status(400).json({
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details,
        });
      }
      throw error;
    }

    // Extract userId from auth
    const userId = (req as any).userId || 'test-user';

    // Get project and verify user owns it
    const project = await db.project.findUnique({
      where: { id: req.params.projectId },
    });

    if (!project) {
      return res.status(404).json({
        error: 'Project not found',
        code: 'NOT_FOUND',
        details: {},
      });
    }

    if (project.userId !== userId) {
      return res.status(403).json({
        error: 'Unauthorized',
        code: 'FORBIDDEN',
        details: {},
      });
    }

    // Build filter
    const where: any = { projectId: req.params.projectId };
    if (validatedQuery.platform) {
      where.platform = validatedQuery.platform;
    }
    if (validatedQuery.status) {
      where.status = validatedQuery.status;
    }

    // Get total count
    const total = await db.publishLog.count({ where });

    // Get paginated results
    const publishes = await db.publishLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (validatedQuery.page - 1) * validatedQuery.limit,
      take: validatedQuery.limit,
      select: {
        id: true,
        platform: true,
        status: true,
        externalId: true,
        publishedAt: true,
        scheduledAt: true,
        errorCode: true,
        errorMessage: true,
      },
    });

    const pages = Math.ceil(total / validatedQuery.limit);

    res.json({
      publishes,
      total,
      page: validatedQuery.page,
      limit: validatedQuery.limit,
      pages,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Standalone publishes router for GET /api/publishes/:id
 */
const publishesStandaloneRouter = Router();

publishesStandaloneRouter.get('/:publishLogId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Extract userId from auth
    const userId = (req as any).userId || 'test-user';

    // Get publish log
    const publishLog = await db.publishLog.findUnique({
      where: { id: req.params.publishLogId },
      include: { project: true },
    });

    if (!publishLog) {
      return res.status(404).json({
        error: 'Publish log not found',
        code: 'NOT_FOUND',
        details: {},
      });
    }

    // Verify user owns the project
    if (publishLog.project.userId !== userId) {
      return res.status(403).json({
        error: 'Unauthorized',
        code: 'FORBIDDEN',
        details: {},
      });
    }

    // Return publish status
    res.json({
      id: publishLog.id,
      projectId: publishLog.projectId,
      platform: publishLog.platform,
      status: publishLog.status,
      externalId: publishLog.externalId,
      errorCode: publishLog.errorCode,
      errorMessage: publishLog.errorMessage,
      publishedAt: publishLog.publishedAt,
      scheduledAt: publishLog.scheduledAt,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
export { publishesStandaloneRouter };

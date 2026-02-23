import { Router, Request, Response, NextFunction } from 'express';
import { Queue } from 'bullmq';
import {
  fetchVideos,
  listCollectedVideos,
  updateCollectedVideo,
  getCollectedVideo,
} from '../services/intake.service';
import {
  FetchUrlsSchema,
  CollectionsQuerySchema,
  UpdateCollectedVideoSchema,
} from '../validation/intake';
import { HttpError } from '../middleware/error-handler';

const router = Router();

// Middleware to inject queue
let intakeQueue: Queue;

export function setIntakeQueue(queue: Queue) {
  intakeQueue = queue;
}

/**
 * POST /api/intake/fetch
 * Submit URLs for video collection
 */
router.post('/fetch', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!intakeQueue) {
      throw new Error('Intake queue not initialized');
    }

    // Validate request
    const { urls } = FetchUrlsSchema.parse(req.body);

    // Extract userId from token (placeholder - in real app would be from JWT)
    const userId = (req as any).userId || undefined;

    // Fetch videos and enqueue
    const result = await fetchVideos({ urls, userId }, intakeQueue);

    res.status(202).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/intake/collections
 * List collected videos with filters and pagination
 */
router.get('/collections', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate query params
    const query = CollectionsQuerySchema.parse(req.query);

    // Parse tags from array or string
    const tags = Array.isArray(query.tag)
      ? query.tag
      : query.tag
        ? [query.tag]
        : undefined;

    // Extract userId from token
    const userId = (req as any).userId || undefined;

    // List videos
    const result = await listCollectedVideos({
      page: query.page,
      limit: query.limit,
      status: query.status,
      platform: query.platform,
      tags,
      userId,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/intake/videos/:id
 * Update collected video (tags, caption)
 */
router.patch('/videos/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate request
    const updates = UpdateCollectedVideoSchema.parse(req.body);

    // At least one field must be provided
    if (Object.keys(updates).length === 0) {
      throw new HttpError(
        400,
        'At least one field must be provided',
        'VALIDATION_ERROR',
        { message: 'tags or caption required' }
      );
    }

    // Extract userId from token
    const userId = (req as any).userId || undefined;

    // Update video
    const result = await updateCollectedVideo(req.params.id, userId, updates);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/intake/videos/:id
 * Get a specific collected video
 */
router.get('/videos/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Extract userId from token
    const userId = (req as any).userId || undefined;

    // Get video
    const result = await getCollectedVideo(req.params.id, userId);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;

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
import prisma from '../lib/prisma';

const router = Router();

// Middleware to inject queues
let intakeQueue: Queue;
let analysisQueue: Queue;

export function setIntakeQueue(queue: Queue) {
  intakeQueue = queue;
}

export function setAnalysisQueue(queue: Queue) {
  analysisQueue = queue;
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

/**
 * POST /api/intake/videos/:id/analyze
 * Enqueue a video analysis job
 */
router.post('/videos/:id/analyze', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!analysisQueue) {
      throw new Error('Analysis queue not initialized');
    }

    const { id: videoId } = req.params;

    // Verify video exists and is ready
    const video = await prisma.collectedVideo.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      throw new HttpError(404, 'Video not found', 'VIDEO_NOT_FOUND', { videoId });
    }

    if (video.status !== 'READY') {
      throw new HttpError(
        400,
        'Video has not finished downloading',
        'VIDEO_NOT_READY',
        { videoId, status: video.status }
      );
    }

    if ((video as any).analysisStatus === 'ANALYZING') {
      throw new HttpError(
        409,
        'Analysis is already in progress for this video',
        'ANALYSIS_ALREADY_IN_PROGRESS',
        { videoId }
      );
    }

    // Enqueue analysis job
    const job = await analysisQueue.add(
      'video-analysis',
      { videoId },
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
      videoId,
      status: 'ANALYZING',
      jobId: job.id,
      startedAt: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/intake/videos/:id/analysis
 * Get the analysis result for a video
 */
router.get('/videos/:id/analysis', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: videoId } = req.params;

    // Get video with analysis data
    const video = await prisma.collectedVideo.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      throw new HttpError(404, 'Video not found', 'VIDEO_NOT_FOUND', { videoId });
    }

    // Return analysis status and result if available
    res.json({
      videoId,
      status: (video as any).analysisStatus,
      completedAt: (video as any).analysisResult ? new Date().toISOString() : null,
      analysis: (video as any).analysisResult,
      error: (video as any).analysisError,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

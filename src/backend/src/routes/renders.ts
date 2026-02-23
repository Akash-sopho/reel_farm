import { Router, Request, Response, NextFunction } from 'express';
import { Queue } from 'bullmq';
import { triggerRender, getRenderStatus, getDownloadUrl } from '../services/render.service';
import { getStorageService } from '../services/storage.service';
import { HttpError } from '../middleware/error-handler';

const router = Router();

// Middleware to inject queue (will be passed from server.ts)
let renderQueue: Queue;

export function setRenderQueue(queue: Queue) {
  renderQueue = queue;
}

/**
 * POST /api/projects/:id/render
 * Initiate a render for a project
 */
router.post('/:id/render', async (req: Request, res: Response<any>, next: NextFunction) => {
  try {
    if (!renderQueue) {
      throw new Error('Render queue not initialized');
    }

    // Extract userId from token (placeholder - in real app would be from JWT)
    const userId = (req as any).userId || 'test-user';

    const result = await triggerRender(
      {
        projectId: req.params.id,
        userId,
      },
      renderQueue
    );

    res.status(202).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/renders/:id/status
 * Get render status
 */
router.get('/:id/status', async (req: Request, res: Response<any>, next: NextFunction) => {
  try {
    // Extract userId from token (placeholder - in real app would be from JWT)
    const userId = (req as any).userId || 'test-user';

    const result = await getRenderStatus(req.params.id, userId);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/renders/:id/download
 * Get presigned download URL for completed render
 */
router.get('/:id/download', async (req: Request, res: Response<any>, next: NextFunction) => {
  try {
    // Extract userId from token (placeholder - in real app would be from JWT)
    const userId = (req as any).userId || 'test-user';

    const storageService = getStorageService();
    const result = await getDownloadUrl(req.params.id, userId, storageService);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;

import { Router, Request, Response } from 'express';

const router = Router();

interface HealthResponse {
  status: string;
  timestamp: string;
  version: string;
}

/**
 * GET /health
 * Health check endpoint
 */
router.get('/', (_req: Request, res: Response<HealthResponse>) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
  });
});

export default router;

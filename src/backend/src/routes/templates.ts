import { Router, Request, Response } from 'express';

const router = Router();

interface TemplatesResponse {
  data: unknown[];
  total: number;
}

/**
 * GET /api/templates
 * List all templates (stub for now)
 */
router.get('/', (_req: Request, res: Response<TemplatesResponse>) => {
  res.json({
    data: [],
    total: 0,
  });
});

export default router;

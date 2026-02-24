import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { generateTextSuggestions, generateImage, AIError } from '../services/ai.service';

const router = Router();

/**
 * Validation schemas
 */
const TextSuggestionSchema = z.object({
  projectId: z.string().min(1, 'projectId is required'),
  slotId: z.string().min(1, 'slotId is required'),
  hint: z.string().max(200, 'hint must be max 200 characters').optional(),
});

const ImageSuggestionSchema = z.object({
  projectId: z.string().min(1, 'projectId is required'),
  slotId: z.string().min(1, 'slotId is required'),
  prompt: z.string().min(1, 'prompt is required').max(1000, 'prompt must be max 1000 characters'),
});

type TextSuggestionRequest = z.infer<typeof TextSuggestionSchema>;
type ImageSuggestionRequest = z.infer<typeof ImageSuggestionSchema>;

/**
 * Helper: Convert AIError to HTTP response
 */
function handleAIError(error: AIError, res: Response): void {
  const statusCodeMap: Record<string, number> = {
    VALIDATION_ERROR: 400,
    UNAUTHORIZED: 401,
    NOT_FOUND: 404,
    RATE_LIMITED: 429,
    OPENAI_ERROR: 500,
    STORAGE_ERROR: 500,
    INTERNAL_ERROR: 500,
    PREVIEW_GENERATION_ERROR: 500,
  };

  const status = statusCodeMap[error.code] || 500;

  res.status(status).json({
    error: error.message,
    code: error.code,
    details: error.details || {},
  });
}

/**
 * POST /api/ai/suggest/text
 * Generate text suggestions for a slot using GPT-4o
 */
router.post('/suggest/text', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate request body
    const validationResult = TextSuggestionSchema.safeParse(req.body);
    if (!validationResult.success) {
      const details: Record<string, string> = {};
      validationResult.error.errors.forEach((err) => {
        const path = err.path.join('.');
        details[path] = err.message;
      });

      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details,
      });
    }

    const { projectId, slotId, hint }: TextSuggestionRequest = validationResult.data;

    // Extract userId from request (placeholder - in real app would come from JWT)
    const userId = (req as any).userId || 'user-test';

    // Call AI service
    const result = await generateTextSuggestions(projectId, userId, slotId, hint);

    res.json(result);
  } catch (error) {
    if (error instanceof AIError) {
      return handleAIError(error, res);
    }

    // Unexpected error
    console.error('[AI-ROUTES] Unexpected error in suggest/text:', error);
    res.status(500).json({
      error: 'Unexpected error generating suggestions',
      code: 'INTERNAL_ERROR',
      details: {},
    });
  }
});

/**
 * POST /api/ai/suggest/image
 * Generate image for a slot using DALL-E 3
 */
router.post('/suggest/image', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate request body
    const validationResult = ImageSuggestionSchema.safeParse(req.body);
    if (!validationResult.success) {
      const details: Record<string, string> = {};
      validationResult.error.errors.forEach((err) => {
        const path = err.path.join('.');
        details[path] = err.message;
      });

      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details,
      });
    }

    const { projectId, slotId, prompt }: ImageSuggestionRequest = validationResult.data;

    // Extract userId from request (placeholder - in real app would come from JWT)
    const userId = (req as any).userId || 'user-test';

    // Call AI service
    const result = await generateImage(projectId, userId, slotId, prompt);

    res.json(result);
  } catch (error) {
    if (error instanceof AIError) {
      return handleAIError(error, res);
    }

    // Unexpected error
    console.error('[AI-ROUTES] Unexpected error in suggest/image:', error);
    res.status(500).json({
      error: 'Unexpected error generating image',
      code: 'INTERNAL_ERROR',
      details: {},
    });
  }
});

export default router;

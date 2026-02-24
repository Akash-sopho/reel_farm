import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { getStorageService } from '../services/storage.service';

const router = Router();

/**
 * Validation schemas
 */
const MusicListQuerySchema = z.object({
  page: z.coerce.number().int().min(1, 'page must be >= 1').default(1),
  limit: z.coerce.number().int().min(1, 'limit must be >= 1').max(100, 'limit must be <= 100').default(20),
  mood: z.enum(['happy', 'sad', 'energetic', 'calm', 'neutral']).optional(),
  genre: z.enum(['pop', 'hip-hop', 'ambient', 'electronic', 'acoustic', 'cinematic']).optional(),
  bpm_min: z.coerce.number().int().min(0, 'bpm_min must be >= 0').optional(),
  bpm_max: z.coerce.number().int().min(0, 'bpm_max must be >= 0').optional(),
  tags: z.string().optional(),
});

type MusicListQuery = z.infer<typeof MusicListQuerySchema>;

/**
 * GET /api/music
 * List music tracks with pagination and filtering
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    // Validate query params
    const validationResult = MusicListQuerySchema.safeParse(req.query);
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

    const { page, limit, mood, genre, bpm_min, bpm_max, tags }: MusicListQuery = validationResult.data;

    // Build where clause for filtering
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      isActive: true,
    };

    if (mood) {
      where.mood = mood;
    }

    if (genre) {
      where.genre = genre;
    }

    if (bpm_min !== undefined || bpm_max !== undefined) {
      where.bpm = {
        gte: bpm_min || 0,
        lte: bpm_max || 999,
      };
    }

    if (tags) {
      const tagArray = tags.split(',').map((t) => t.trim());
      where.tags = {
        hasSome: tagArray,
      };
    }

    // Query total count
    const total = await prisma.musicTrack.count({ where });

    // Query tracks with pagination
    const offset = (page - 1) * limit;
    const tracks = await prisma.musicTrack.findMany({
      where,
      select: {
        id: true,
        title: true,
        artist: true,
        durationSeconds: true,
        bpm: true,
        mood: true,
        genre: true,
        tags: true,
        isActive: true,
      },
      orderBy: { title: 'asc' },
      skip: offset,
      take: limit,
    });

    const pages = Math.ceil(total / limit);

    res.json({
      tracks,
      total,
      page,
      limit,
      pages,
    });
  } catch (error) {
    console.error('[MUSIC-ROUTES] Error in GET /api/music:', error);
    res.status(500).json({
      error: 'Unexpected error retrieving music tracks',
      code: 'INTERNAL_ERROR',
      details: {},
    });
  }
});

/**
 * GET /api/music/:id
 * Get single music track with all metadata
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate ID format
    if (!id || id.length === 0) {
      return res.status(400).json({
        error: 'Invalid track ID',
        code: 'VALIDATION_ERROR',
        details: { id: 'id is required' },
      });
    }

    // Query track
    const track = await prisma.musicTrack.findUnique({
      where: { id },
    });

    if (!track) {
      return res.status(404).json({
        error: 'Track not found',
        code: 'NOT_FOUND',
        details: { trackId: id },
      });
    }

    res.json(track);
  } catch (error) {
    console.error('[MUSIC-ROUTES] Error in GET /api/music/:id:', error);
    res.status(500).json({
      error: 'Unexpected error retrieving track',
      code: 'INTERNAL_ERROR',
      details: {},
    });
  }
});

/**
 * GET /api/music/:id/preview
 * Generate presigned URL for preview clip (first 30 seconds)
 */
router.get('/:id/preview', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate ID format
    if (!id || id.length === 0) {
      return res.status(400).json({
        error: 'Invalid track ID',
        code: 'VALIDATION_ERROR',
        details: { id: 'id is required' },
      });
    }

    // Query track
    const track = await prisma.musicTrack.findUnique({
      where: { id },
    });

    if (!track) {
      return res.status(404).json({
        error: 'Track not found',
        code: 'NOT_FOUND',
        details: { trackId: id },
      });
    }

    // Generate presigned URL for preview
    try {
      const storage = getStorageService();
      const minioKey = track.url; // e.g., music/track-id.mp3
      const previewUrl = await storage.getSignedDownloadUrl(minioKey, 3600); // 1-hour expiry

      const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

      res.json({
        trackId: track.id,
        previewUrl,
        durationSeconds: 30,
        expiresAt,
      });
    } catch (storageError) {
      console.error('[MUSIC-ROUTES] Storage error generating preview URL:', storageError);
      res.status(500).json({
        error: 'Failed to generate preview URL',
        code: 'STORAGE_ERROR',
        details: { message: 'Could not generate presigned URL' },
      });
    }
  } catch (error) {
    console.error('[MUSIC-ROUTES] Error in GET /api/music/:id/preview:', error);
    res.status(500).json({
      error: 'Unexpected error generating preview',
      code: 'INTERNAL_ERROR',
      details: {},
    });
  }
});

export default router;

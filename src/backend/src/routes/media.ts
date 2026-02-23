import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { getStorageService } from '../services/storage.service';
import {
  PresignedUrlQuerySchema,
  ConfirmUploadSchema,
  FileUploadValidationSchema,
} from '../validation/media';
import { ZodError } from 'zod';

const router = Router();

// Memory storage for multer (files uploaded as Buffer)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

/**
 * POST /api/media/upload
 * Direct multipart form upload with file processing
 */
router.post('/upload', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate file exists
    if (!req.file) {
      return res.status(400).json({
        error: 'No file provided',
        code: 'NO_FILE',
        details: {},
      });
    }

    // Validate file type and size
    try {
      await FileUploadValidationSchema.parseAsync({
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        const details: Record<string, string> = {};
        error.errors.forEach((err) => {
          const path = err.path.join('.');
          details[path] = err.message;
        });

        // Return appropriate status based on error
        if (details.mimetype) {
          return res.status(415).json({
            error: 'Unsupported file type',
            code: 'UNSUPPORTED_MEDIA_TYPE',
            details,
          });
        }
        if (details.size) {
          return res.status(413).json({
            error: 'File too large',
            code: 'FILE_TOO_LARGE',
            details,
          });
        }

        return res.status(400).json({
          error: 'Invalid file',
          code: 'INVALID_FILE',
          details,
        });
      }
      throw error;
    }

    // Get image metadata (width, height)
    let width = 0;
    let height = 0;

    try {
      const metadata = await sharp(req.file.buffer).metadata();
      width = metadata.width || 0;
      height = metadata.height || 0;

      // Validate dimensions
      if (width < 100 || height < 100) {
        return res.status(400).json({
          error: 'Image dimensions too small',
          code: 'IMAGE_TOO_SMALL',
          details: {
            message: 'Image must be at least 100x100 pixels',
            width,
            height,
          },
        });
      }

      if (width > 4000 || height > 4000) {
        return res.status(400).json({
          error: 'Image dimensions too large',
          code: 'IMAGE_TOO_LARGE',
          details: {
            message: 'Image must not exceed 4000x4000 pixels',
            width,
            height,
          },
        });
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('Input buffer')) {
        return res.status(400).json({
          error: 'Invalid image file',
          code: 'INVALID_IMAGE',
          details: { message: 'Could not process image file' },
        });
      }
      throw error;
    }

    // Generate storage key
    const storageService = getStorageService();
    const userId = (req as any).userId || 'anonymous'; // TODO: Extract from auth token in production
    const key = storageService.generateUploadKey(userId, req.file.originalname);

    // Upload to storage
    const { url } = await storageService.uploadFile(key, req.file.buffer, req.file.mimetype);

    return res.status(200).json({
      url,
      key,
      width,
      height,
      size: req.file.size,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/media/presigned-url
 * Generate a presigned URL for direct client-to-MinIO upload
 */
router.get('/presigned-url', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate query params
    try {
      PresignedUrlQuerySchema.parse(req.query);
    } catch (error) {
      if (error instanceof ZodError) {
        const details: Record<string, string> = {};
        error.errors.forEach((err) => {
          const path = err.path.join('.');
          details[path] = err.message;
        });

        return res.status(400).json({
          error: 'Invalid query parameters',
          code: 'INVALID_QUERY',
          details,
        });
      }
      throw error;
    }

    const { filename, contentType } = req.query as { filename: string; contentType: string };

    // Generate storage key
    const storageService = getStorageService();
    const userId = (req as any).userId || 'anonymous'; // TODO: Extract from auth token in production
    const key = storageService.generateUploadKey(userId, filename);

    // Get presigned URL (1 hour expiry)
    const uploadUrl = await storageService.getSignedUrl(key, 3600);

    return res.status(200).json({
      uploadUrl,
      key,
      expiresIn: 3600,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/media/confirm-upload
 * Confirm a presigned upload and get public URL
 */
router.post('/confirm-upload', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate request body
    try {
      ConfirmUploadSchema.parse(req.body);
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

    const { key } = req.body as { key: string };

    // Verify the key exists in storage
    const storageService = getStorageService();

    try {
      // Try to stat the object to verify it exists
      await (storageService as any).client.statObject((storageService as any).bucket, key);
    } catch (error) {
      if ((error as any).code === 'NotFound') {
        return res.status(404).json({
          error: 'File not found',
          code: 'NOT_FOUND',
          details: { key },
        });
      }
      throw error;
    }

    // Get public URL
    const url = storageService.getPublicUrl(key);

    return res.status(200).json({
      url,
      key,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

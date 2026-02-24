import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import 'dotenv/config';
import { Queue } from 'bullmq';

import { logger } from './middleware/logger';
import { errorHandler } from './middleware/error-handler';
import healthRoutes from './routes/health';
import templatesRoutes, { setExtractionQueue } from './routes/templates';
import mediaRoutes from './routes/media';
import projectsRoutes from './routes/projects';
import rendersRoutes, { setRenderQueue } from './routes/renders';
import intakeRoutes, { setIntakeQueue, setAnalysisQueue } from './routes/intake';
import aiRoutes from './routes/ai';
import musicRoutes from './routes/music';
import authRoutes from './routes/auth';
import publishesRoutes, { setPublishQueue, publishesStandaloneRouter } from './routes/publishes';
import prisma from './lib/prisma';
import { initializeStorageService } from './services/storage.service';
import { createRenderWorker } from './jobs/render.worker';
import { createIntakeWorker } from './jobs/intake.worker';
import { createAnalysisWorker } from './jobs/analysis.worker';
import { createExtractionWorker } from './jobs/extraction.worker';
import { createPublishWorker } from './jobs/publish.worker';
import { createRedisClient, closeRedisClient } from './lib/redis';

const PORT = parseInt(process.env.PORT || '3001', 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

const app: Express = express();

// Middleware
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json({ limit: '10mb' }));
app.use(logger);

// Request ID middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  (req as any).id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  next();
});

// Routes
app.use('/health', healthRoutes);
app.use('/api/templates', templatesRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/renders', rendersRoutes);
app.use('/api/intake', intakeRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/music', musicRoutes);
app.use('/api/social', authRoutes);
app.use('/api/projects', publishesRoutes);
app.use('/api/publishes', publishesStandaloneRouter);
// Note: Templates routes handle /api/templates and /api/templates/:id
// Note: Media routes handle /api/media/upload, /api/media/presigned-url, /api/media/confirm-upload
// Note: Projects routes handle /api/projects (POST, GET list) and /api/projects/:id (GET, PATCH)
// Note: Renders routes handle /api/renders/:id/status, /api/renders/:id/download, /api/projects/:id/render
// Note: Intake routes handle /api/intake/fetch (POST), /api/intake/collections (GET), /api/intake/videos/:id (GET, PATCH)
// Note: AI routes handle /api/ai/suggest/text (POST), /api/ai/suggest/image (POST)
// Note: Music routes handle /api/music (GET), /api/music/:id (GET), /api/music/:id/preview (GET)
// Note: Auth routes handle /api/social/auth/:platform (GET), /api/social/callback/:platform (GET), /api/social/accounts (GET, DELETE)
// Note: Publish routes handle /api/projects/:id/publish (POST), /api/projects/:id/schedule (POST), /api/projects/:id/publishes (GET), /api/publishes/:id (GET)

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: 'Route not found',
    code: 'NOT_FOUND',
    details: {},
  });
});

// Error handler (must be last)
app.use(errorHandler);

// Start server
const startServer = async (): Promise<void> => {
  try {
    // Test Prisma connection
    await prisma.$queryRaw`SELECT 1`;
    console.log('✓ Database connection successful');
  } catch (error) {
    console.warn('⚠ Database connection failed (is PostgreSQL running?):', error instanceof Error ? error.message : error);
    console.warn('  Continuing anyway - you may need to run: docker compose up -d');
  }

  try {
    // Initialize storage service (MinIO)
    await initializeStorageService();
    console.log('✓ Storage service initialized');
  } catch (error) {
    console.warn('⚠ Storage service initialization failed (is MinIO running?):', error instanceof Error ? error.message : error);
    console.warn('  Continuing anyway - you may need to run: docker compose up -d');
  }

  try {
    // Initialize Redis client for rate limiting and caching
    await createRedisClient();
    console.log('✓ Redis client initialized');
  } catch (error) {
    console.warn('⚠ Redis client initialization failed (is Redis running?):', error instanceof Error ? error.message : error);
    console.warn('  Continuing anyway - rate limiting will not work until Redis is available');
  }

  try {
    // Initialize BullMQ for render pipeline and intake
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
    const redisUrl = `redis://${redisHost}:${redisPort}`;

    const renderQueue = new Queue('video-renders', {
      connection: {
        host: redisHost,
        port: redisPort,
      },
    });

    setRenderQueue(renderQueue);

    // Create intake queue
    const intakeQueue = new Queue('video-intake', {
      connection: {
        host: redisHost,
        port: redisPort,
      },
    });

    setIntakeQueue(intakeQueue);

    // Create analysis queue
    const analysisQueue = new Queue('video-analysis', {
      connection: {
        host: redisHost,
        port: redisPort,
      },
    });

    setAnalysisQueue(analysisQueue);

    // Create extraction queue
    const extractionQueue = new Queue('template-extraction', {
      connection: {
        host: redisHost,
        port: redisPort,
      },
    });

    setExtractionQueue(extractionQueue);

    // Create publish queue
    const publishQueue = new Queue('video-publishes', {
      connection: {
        host: redisHost,
        port: redisPort,
      },
    });

    setPublishQueue(publishQueue);

    // Start render worker
    const renderWorker = createRenderWorker();
    console.log('✓ Render worker initialized');

    // Start intake worker
    const intakeWorker = createIntakeWorker(redisUrl);
    console.log('✓ Intake worker initialized');

    // Start analysis worker
    const analysisWorker = createAnalysisWorker(redisUrl);
    console.log('✓ Analysis worker initialized');

    // Start extraction worker
    const extractionWorker = createExtractionWorker(redisUrl);
    console.log('✓ Extraction worker initialized');

    // Start publish worker
    const publishWorker = createPublishWorker();
    console.log('✓ Publish worker initialized');

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received, shutting down...');
      await renderWorker.close();
      await renderQueue.close();
      await intakeWorker.close();
      await intakeQueue.close();
      await analysisWorker.close();
      await analysisQueue.close();
      await extractionWorker.close();
      await extractionQueue.close();
      await publishWorker.close();
      await publishQueue.close();
      await closeRedisClient();
      process.exit(0);
    });
  } catch (error) {
    console.warn('⚠ BullMQ/Redis initialization failed (is Redis running?):', error instanceof Error ? error.message : error);
    console.warn('  Continuing anyway - renders will not process until Redis is available');
  }

  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📝 Health check: http://localhost:${PORT}/health`);
  });
};

startServer();

export default app;

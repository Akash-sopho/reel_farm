import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import 'dotenv/config';
import { Queue } from 'bullmq';

import { logger } from './middleware/logger';
import { errorHandler } from './middleware/error-handler';
import healthRoutes from './routes/health';
import templatesRoutes from './routes/templates';
import mediaRoutes from './routes/media';
import projectsRoutes from './routes/projects';
import rendersRoutes, { setRenderQueue } from './routes/renders';
import prisma from './lib/prisma';
import { initializeStorageService } from './services/storage.service';
import { createRenderWorker } from './jobs/render.worker';

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
// Note: Templates routes handle /api/templates and /api/templates/:id
// Note: Media routes handle /api/media/upload, /api/media/presigned-url, /api/media/confirm-upload
// Note: Projects routes handle /api/projects (POST, GET list) and /api/projects/:id (GET, PATCH)
// Note: Renders routes handle /api/renders/:id/status, /api/renders/:id/download, /api/projects/:id/render

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
    // Initialize BullMQ for render pipeline
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);

    const renderQueue = new Queue('video-renders', {
      connection: {
        host: redisHost,
        port: redisPort,
      },
    });

    setRenderQueue(renderQueue);

    // Start render worker
    const renderWorker = createRenderWorker();
    console.log('✓ Render worker initialized');

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received, shutting down...');
      await renderWorker.close();
      await renderQueue.close();
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

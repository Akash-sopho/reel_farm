import { Worker, Job } from 'bullmq';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import prisma from '../lib/prisma';
import { getStorageService } from '../services/storage.service';

interface RenderJobData {
  renderId: string;
  projectId: string;
  userId: string;
  templateId: string;
  slotFills: any[];
  musicUrl?: string;
  durationSeconds: number;
  fps: number;
}

/**
 * Execute remotion render command
 */
async function executeRender(jobData: RenderJobData): Promise<{ outputPath: string; fileSize: number }> {
  const { renderId, slotFills, durationSeconds, fps } = jobData;
  const tempDir = path.join('/tmp', renderId);
  const propsPath = path.join(tempDir, 'props.json');
  const outputPath = path.join(tempDir, 'output.mp4');

  try {
    // Create temp directory
    await fs.mkdir(tempDir, { recursive: true });

    // Build props object
    const props = {
      duration: durationSeconds,
      fps,
      slots: {} as Record<string, string>,
    };

    // Populate slots from slotFills
    for (const fill of slotFills) {
      props.slots[fill.slotId] = fill.value;
    }

    // Write props to JSON file
    await fs.writeFile(propsPath, JSON.stringify(props, null, 2));

    console.log(`[RENDER] Render ${renderId}: props written to ${propsPath}`);

    // Execute Remotion CLI
    return await new Promise((resolve, reject) => {
      const startTime = Date.now();
      const command = 'npx';
      const args = [
        'remotion',
        'render',
        '--props',
        propsPath,
        '--output',
        outputPath,
        '--timeout',
        '600',
        '--disable-logging',
        'src/video/src/Root.tsx',
        `TemplateRenderer-${jobData.templateId}`, // Composition name (must match what's registered in Root.tsx)
      ];

      console.log(`[RENDER] Render ${renderId}: executing command: ${command} ${args.join(' ')}`);

      const child = spawn(command, args, {
        cwd: path.resolve(__dirname, '../../..'),
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';
      let timedOut = false;

      const timeout = setTimeout(() => {
        timedOut = true;
        child.kill('SIGTERM');
      }, 610000); // 610 seconds (slightly more than the --timeout 600 to let CLI handle it)

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        clearTimeout(timeout);
        const duration = Date.now() - startTime;

        if (timedOut) {
          reject(new Error(`Render timeout after ${duration}ms (RENDER_TIMEOUT)`));
          return;
        }

        if (code !== 0) {
          const errorMsg = `Remotion CLI exited with code ${code}: ${stderr || stdout}`;
          console.error(`[RENDER] Render ${renderId} FAILED: ${errorMsg}`);
          reject(new Error(errorMsg));
          return;
        }

        console.log(`[RENDER] Render ${renderId}: CLI completed successfully in ${duration}ms`);
        resolve({ outputPath, fileSize: 0 }); // fileSize will be set after upload
      });

      child.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  } catch (error) {
    console.error(`[RENDER] Render ${renderId} error: ${error instanceof Error ? error.message : error}`);
    throw error;
  }
}

/**
 * Upload rendered video to MinIO
 */
async function uploadToStorage(
  renderId: string,
  outputPath: string
): Promise<{ minioKey: string; fileSize: number }> {
  const storageService = getStorageService();
  const minioKey = `renders/${renderId}.mp4`;

  try {
    // Read file
    const buffer = await fs.readFile(outputPath);
    const fileSize = buffer.length;

    // Upload to MinIO
    await storageService.uploadFile(minioKey, buffer, 'video/mp4');

    console.log(`[RENDER] Render ${renderId}: uploaded to MinIO at ${minioKey} (${fileSize} bytes)`);

    return { minioKey, fileSize };
  } catch (error) {
    console.error(`[RENDER] Render ${renderId} storage upload error: ${error instanceof Error ? error.message : error}`);
    throw error;
  }
}

/**
 * Clean up temp directory
 */
async function cleanupTempDir(renderId: string): Promise<void> {
  const tempDir = path.join('/tmp', renderId);
  try {
    await fs.rm(tempDir, { recursive: true, force: true });
    console.log(`[RENDER] Render ${renderId}: temp directory cleaned up`);
  } catch (error) {
    console.warn(`[RENDER] Render ${renderId}: failed to cleanup temp dir: ${error instanceof Error ? error.message : error}`);
    // Don't throw - cleanup failure shouldn't fail the job
  }
}

/**
 * Classify yt-dlp exit codes into error codes
 */
function classifyError(error: Error): { code: string; shouldRetry: boolean } {
  const message = error.message.toLowerCase();

  if (message.includes('timeout')) {
    return { code: 'RENDER_TIMEOUT', shouldRetry: false };
  }

  if (message.includes('component') || message.includes('not found')) {
    return { code: 'COMPONENT_NOT_FOUND', shouldRetry: false };
  }

  if (message.includes('invalid props')) {
    return { code: 'INVALID_PROPS', shouldRetry: false };
  }

  return { code: 'REMOTION_CLI_FAILED', shouldRetry: true };
}

/**
 * BullMQ Worker for rendering
 */
export function createRenderWorker() {
  const worker = new Worker('video-renders', renderJobHandler, {
    connection: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
    },
    concurrency: 1, // Process one render at a time
  });

  worker.on('completed', (job: Job) => {
    console.log(`[RENDER] Worker: job ${job.id} completed`);
  });

  worker.on('failed', (job: Job | undefined, err: Error) => {
    console.error(`[RENDER] Worker: job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err: Error) => {
    console.error('[RENDER] Worker error:', err);
  });

  return worker;
}

/**
 * Main job handler
 */
async function renderJobHandler(job: Job<RenderJobData>): Promise<void> {
  const { renderId, projectId } = job.data;
  const startTime = Date.now();

  console.log(`[RENDER] Starting render ${renderId} for project ${projectId}`);

  try {
    // Update render status to PROCESSING
    await prisma.render.update({
      where: { id: renderId },
      data: {
        status: 'PROCESSING',
        startedAt: new Date(),
      },
    });

    // Execute Remotion render
    const { outputPath } = await executeRender(job.data);

    // Upload to MinIO
    const { minioKey, fileSize } = await uploadToStorage(renderId, outputPath);

    // Generate presigned URL
    const storageService = getStorageService();
    const outputUrl = await storageService.getSignedDownloadUrl(minioKey, 3600);

    // Update render status to DONE
    await prisma.render.update({
      where: { id: renderId },
      data: {
        status: 'DONE',
        minioKey,
        outputUrl,
        fileSizeBytes: fileSize,
        completedAt: new Date(),
      },
    });

    // Also update project status to DONE
    await prisma.project.update({
      where: { id: projectId },
      data: { status: 'done' },
    });

    const duration = Date.now() - startTime;
    console.log(`[RENDER] Render ${renderId} completed successfully in ${duration}ms`);
  } catch (error) {
    const { code, shouldRetry } = classifyError(error instanceof Error ? error : new Error(String(error)));
    const duration = Date.now() - startTime;

    console.error(`[RENDER] Render ${renderId} failed after ${duration}ms: ${error instanceof Error ? error.message : error}`);

    // Update render status to FAILED
    await prisma.render.update({
      where: { id: renderId },
      data: {
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : String(error),
        errorCode: code,
        completedAt: new Date(),
      },
    });

    // Don't retry if error is non-retriable
    if (!shouldRetry) {
      throw new Error(`[NO-RETRY] ${error instanceof Error ? error.message : error}`);
    }

    // Re-throw to trigger BullMQ retry logic
    throw error;
  } finally {
    // Always cleanup temp directory
    await cleanupTempDir(renderId);
  }
}

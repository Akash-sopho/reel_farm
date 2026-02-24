import { Worker, Job } from 'bullmq';
import { publishVideo } from '../services/publish.service';
import { getRedisClient } from '../lib/redis';

/**
 * BullMQ Worker for video publishing jobs
 * Processes publish jobs from the video-publishes queue
 */

export interface PublishJobData {
  publishLogId: string;
  platform: 'instagram' | 'tiktok';
  renderId: string;
  socialAccountId: string;
}

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);

/**
 * Create and return publish worker
 */
export function createPublishWorker(): Worker {
  const worker = new Worker<PublishJobData>('video-publishes', processPublishJob, {
    connection: {
      host: REDIS_HOST,
      port: REDIS_PORT,
    },
    concurrency: 2, // Process 2 videos at a time
    maxStalledCount: 2,
    stalledInterval: 30000, // Check stalled jobs every 30s
  });

  // Event listeners for monitoring
  worker.on('completed', (job: Job<PublishJobData>) => {
    console.log(`[PUBLISH-WORKER] Job ${job.id} completed (${job.data.platform})`);
  });

  worker.on('failed', (job: Job<PublishJobData> | undefined, error: Error) => {
    if (job) {
      console.error(`[PUBLISH-WORKER] Job ${job.id} failed:`, error.message);
    } else {
      console.error(`[PUBLISH-WORKER] Job failed:`, error.message);
    }
  });

  worker.on('error', (error: Error) => {
    console.error('[PUBLISH-WORKER] Worker error:', error);
  });

  return worker;
}

/**
 * Process a single publish job
 */
async function processPublishJob(job: Job<PublishJobData>): Promise<void> {
  const { publishLogId, platform, renderId, socialAccountId } = job.data;

  console.log(`[PUBLISH-WORKER] Processing job ${job.id}: ${platform} publish (log: ${publishLogId})`);

  try {
    // Call publish service
    const config = {
      platform,
      clientId: platform === 'instagram'
        ? process.env.INSTAGRAM_CLIENT_ID || ''
        : process.env.TIKTOK_CLIENT_ID || '',
      clientSecret: platform === 'instagram'
        ? process.env.INSTAGRAM_CLIENT_SECRET || ''
        : process.env.TIKTOK_CLIENT_SECRET || '',
    };

    const result = await publishVideo(publishLogId, config);

    if (result.status === 'PUBLISHED') {
      console.log(
        `[PUBLISH-WORKER] Successfully published to ${platform}: ${result.externalId}`
      );
      job.updateProgress(100);
      return; // Job completes successfully
    } else {
      // Publish failed
      const error = new Error(result.errorMessage || 'Unknown publish error');
      (error as any).code = result.errorCode;
      throw error;
    }
  } catch (error) {
    console.error(`[PUBLISH-WORKER] Job ${job.id} error:`, error);

    // Retry on transient errors
    const isTransient = shouldRetry(error);

    if (isTransient && job.attemptsStarted < 3) {
      // Throw to trigger retry
      throw error;
    } else {
      // Give up on permanent errors or after max retries
      const message = error instanceof Error ? error.message : 'Unknown error';
      const code = (error as any)?.code || 'PUBLISH_FAILED';
      throw new Error(`[FINAL] ${code}: ${message}`);
    }
  }
}

/**
 * Determine if an error is transient (retryable)
 */
function shouldRetry(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();

  // Transient errors (retryable)
  if (
    message.includes('429') || // Rate limit
    message.includes('timeout') ||
    message.includes('econnrefused') ||
    message.includes('econnreset') ||
    message.includes('temporarily') ||
    message.includes('unavailable')
  ) {
    return true;
  }

  // Check for 5xx errors in response
  if (message.includes('500') || message.includes('502') || message.includes('503')) {
    return true;
  }

  return false;
}

/**
 * Add a publish job to the queue
 */
export async function enqueuePublishJob(
  publishLogId: string,
  platform: 'instagram' | 'tiktok',
  renderId: string,
  socialAccountId: string,
  delayMs?: number
): Promise<string> {
  // This would be called from the routes
  // For now, this is a helper function that can be used

  const jobData: PublishJobData = {
    publishLogId,
    platform,
    renderId,
    socialAccountId,
  };

  console.log(`[PUBLISH-WORKER] Enqueueing publish job for ${platform}: ${publishLogId}`);

  // Job will be created by the route handlers
  // This function serves as documentation
  return publishLogId;
}

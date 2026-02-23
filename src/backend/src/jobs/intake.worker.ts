import { Job, Worker } from 'bullmq';
import prisma from '../lib/prisma';
import { getStorageService } from '../services/storage.service';
import { fetchVideo, FetchError } from '../services/video-fetcher.service';

/**
 * Job payload for video intake
 */
interface CollectVideoJobPayload {
  collectedVideoId: string;
  sourceUrl: string;
  platform: 'instagram' | 'tiktok';
  userId?: string;
}

/**
 * Process a video intake job
 * Fetches video from Instagram/TikTok, uploads to MinIO, updates database
 */
async function processIntakeJob(job: Job<CollectVideoJobPayload>) {
  const { collectedVideoId, sourceUrl, platform, userId } = job.data;

  console.log(`[INTAKE] Starting video collection for ${collectedVideoId}`);

  try {
    // Update status to FETCHING
    await prisma.collectedVideo.update({
      where: { id: collectedVideoId },
      data: { status: 'FETCHING' },
    });

    // Fetch video using the video-fetcher service
    const result = await fetchVideo(sourceUrl);

    // Update CollectedVideo with success data
    const updated = await prisma.collectedVideo.update({
      where: { id: collectedVideoId },
      data: {
        status: 'READY',
        videoUrl: result.minioKey, // MinIO key from fetcher
        durationSeconds: result.metadata.duration || null,
        title: result.metadata.title || null,
        caption: result.metadata.uploader || null,
        thumbnailUrl: null, // TODO: Extract thumbnail from video if needed
        tags: extractTags(result.metadata.title || ''),
      },
    });

    console.log(`[INTAKE] Successfully collected video ${collectedVideoId}`);
    return {
      success: true,
      collectedVideoId,
      videoUrl: result.minioKey,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error during video collection';

    console.error(`[INTAKE] Failed to collect video ${collectedVideoId}:`, err);

    // Determine if error is retriable
    const isRetriable = !isNonRetriableError(err);

    // Update CollectedVideo with failure data
    if (!isRetriable) {
      // Only save error message for final failures
      await prisma.collectedVideo.update({
        where: { id: collectedVideoId },
        data: {
          status: 'FAILED',
          errorMessage: errorMessage,
        },
      });
    }

    // If non-retriable, don't retry by throwing
    if (!isRetriable) {
      console.log(`[INTAKE] Non-retriable error for ${collectedVideoId}, not retrying`);
      throw new Error(`Non-retriable error: ${errorMessage}`);
    }

    // For retriable errors, throw to trigger BullMQ retry
    throw err;
  }
}

/**
 * Determine if an error is non-retriable (should not retry)
 */
function isNonRetriableError(err: any): boolean {
  if (err instanceof FetchError) {
    // Don't retry on these error types
    return (
      err.type === 'PRIVATE_VIDEO' ||
      err.type === 'DELETED_VIDEO' ||
      err.type === 'INVALID_URL'
    );
  }

  // Check error message for common non-retriable patterns
  const message = err?.message?.toLowerCase() || '';
  return (
    message.includes('404') ||
    message.includes('not found') ||
    message.includes('private') ||
    message.includes('deleted') ||
    message.includes('removed')
  );
}

/**
 * Extract tags from video title
 * Simple keyword extraction - can be enhanced later
 */
function extractTags(title: string): string[] {
  if (!title) return [];

  // Common trend keywords
  const keywords = [
    'dance', 'music', 'challenge', 'tutorial', 'trending', 'funny',
    'comedy', 'prank', 'motivation', 'beauty', 'fashion', 'fitness',
    'cooking', 'travel', 'vlog', 'gaming', 'sports', 'art', 'design'
  ];

  const tags: string[] = [];
  const titleLower = title.toLowerCase();

  keywords.forEach((keyword) => {
    if (titleLower.includes(keyword)) {
      tags.push(keyword);
    }
  });

  return tags;
}

/**
 * Create and register the intake worker
 */
export function createIntakeWorker(redisUrl: string) {
  const worker = new Worker<CollectVideoJobPayload>('video-intake', processIntakeJob, {
    connection: {
      url: redisUrl,
    },
    concurrency: 3, // Process up to 3 videos concurrently
  });

  worker.on('completed', (job) => {
    console.log(`[INTAKE] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[INTAKE] Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error(`[INTAKE] Worker error:`, err);
  });

  return worker;
}

import { Job, Worker } from 'bullmq';
import { analyzeVideo, VideoAnalysisError } from '../services/video-analysis.service';

/**
 * Job payload for video analysis
 */
interface VideoAnalysisJobPayload {
  videoId: string;
}

/**
 * Process a video analysis job
 * Extracts keyframes, analyzes with GPT-4o Vision, stores results
 */
async function processAnalysisJob(job: Job<VideoAnalysisJobPayload>) {
  const { videoId } = job.data;

  console.log(`[ANALYSIS] Starting video analysis for ${videoId}`);

  try {
    // Analyze video
    const analysis = await analyzeVideo(videoId);

    console.log(`[ANALYSIS] Successfully analyzed video ${videoId}: ${analysis.sceneCount} scenes`);
    return {
      success: true,
      videoId,
      sceneCount: analysis.sceneCount,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error during video analysis';

    console.error(`[ANALYSIS] Failed to analyze video ${videoId}:`, err);

    // VideoAnalysisError is already handled (database updated)
    // Just re-throw for BullMQ to handle retry logic
    throw err;
  }
}

/**
 * Create and register the analysis worker
 */
export function createAnalysisWorker(redisUrl: string) {
  const worker = new Worker<VideoAnalysisJobPayload>('video-analysis', processAnalysisJob, {
    connection: {
      url: redisUrl,
    },
    concurrency: 2, // Process up to 2 videos concurrently (GPU/CPU intensive)
  });

  worker.on('completed', (job) => {
    console.log(`[ANALYSIS] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[ANALYSIS] Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error(`[ANALYSIS] Worker error:`, err);
  });

  return worker;
}

import { Job, Worker } from 'bullmq';
import prisma from '../lib/prisma';
import { extractTemplate } from '../services/extraction.service';

/**
 * Job payload for template extraction
 */
interface TemplateExtractionJobPayload {
  templateId: string;
  videoId: string;
  autoSeedThreshold?: number;
}

/**
 * Process a template extraction job
 * Extracts template schema from video analysis using GPT-4o
 * Optionally auto-publishes high-quality templates (auto-seeding)
 */
async function processExtractionJob(job: Job<TemplateExtractionJobPayload>) {
  const { templateId, videoId, autoSeedThreshold } = job.data;

  console.log(`[EXTRACTION] Starting template extraction job for ${templateId} from video ${videoId}`);

  try {
    // Get the template and video analysis
    const template = await (prisma.template as any).findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const video = await (prisma.collectedVideo as any).findUnique({
      where: { id: videoId },
    });

    if (!video) {
      throw new Error(`Video not found: ${videoId}`);
    }

    const videoAnalysis = (video as any).analysisResult;
    if (!videoAnalysis) {
      throw new Error(`No analysis available for video ${videoId}`);
    }

    // Extract template schema
    const schema = await extractTemplate(templateId, videoAnalysis);

    // Check if auto-seeding should be applied
    if (autoSeedThreshold !== undefined && autoSeedThreshold >= 0 && autoSeedThreshold <= 1) {
      // Fetch updated template to get quality score
      const updatedTemplate = await (prisma.template as any).findUnique({
        where: { id: templateId },
      });

      const qualityScore = updatedTemplate?.extractionQuality?.score || 0;

      if (qualityScore >= autoSeedThreshold) {
        console.log(
          `[EXTRACTION] Auto-seeding template ${templateId} (quality: ${qualityScore} >= threshold: ${autoSeedThreshold})`
        );

        // Auto-publish template
        await (prisma.template as any).update({
          where: { id: templateId },
          data: {
            isPublished: true,
            publishedAt: new Date(),
          },
        });
      } else {
        console.log(
          `[EXTRACTION] Template ${templateId} does not meet auto-seed threshold (quality: ${qualityScore} < ${autoSeedThreshold})`
        );
      }
    }

    console.log(`[EXTRACTION] Successfully extracted template ${templateId}`);
    return {
      success: true,
      templateId,
      videoId,
      sceneCount: schema.scenes.length,
      slotCount: schema.slots.length,
      autoSeeded: autoSeedThreshold !== undefined ? template?.isPublished : false,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error during template extraction';

    console.error(`[EXTRACTION] Failed to extract template ${templateId}:`, err);

    // Error is already handled in extractTemplate (database updated)
    // Just re-throw for BullMQ to handle retry logic
    throw err;
  }
}

/**
 * Create and register the extraction worker
 */
export function createExtractionWorker(redisUrl: string) {
  const worker = new Worker<TemplateExtractionJobPayload>('template-extraction', processExtractionJob, {
    connection: {
      url: redisUrl,
    },
    concurrency: 2, // Process up to 2 extractions concurrently
  });

  worker.on('completed', (job) => {
    console.log(`[EXTRACTION] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[EXTRACTION] Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error(`[EXTRACTION] Worker error:`, err);
  });

  return worker;
}

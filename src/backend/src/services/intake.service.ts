import { Queue } from 'bullmq';
import prisma from '../lib/prisma';
import { HttpError } from '../middleware/error-handler';
import { detectPlatform } from '../validation/intake';

export interface FetchVideosInput {
  urls: string[];
  userId?: string;
}

export interface FetchVideosResult {
  jobIds: string[];
  collectedVideoIds: string[];
  message: string;
}

export interface ListCollectedVideosInput {
  page: number;
  limit: number;
  status?: string;
  platform?: string;
  tags?: string[];
  userId?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface ListCollectedVideosResult {
  data: any[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

/**
 * Fetch videos from URLs and enqueue them for processing
 */
export async function fetchVideos(input: FetchVideosInput, queue: Queue): Promise<FetchVideosResult> {
  const { urls, userId } = input;

  const jobIds: string[] = [];
  const collectedVideoIds: string[] = [];

  // Create CollectedVideo records and enqueue jobs
  for (const url of urls) {
    try {
      const platform = detectPlatform(url);
      if (!platform) {
        throw new HttpError(400, 'Invalid or unsupported URL', 'INVALID_URL', {
          url,
        });
      }

      // Create CollectedVideo record with status PENDING
      const collectedVideo = await prisma.collectedVideo.create({
        data: {
          sourceUrl: url,
          platform,
          status: 'PENDING',
          ...(userId && { userId }),
          // Note: videoUrl is optional and will be populated when ready
          tags: [],
        },
      });

      // Enqueue BullMQ job
      const job = await queue.add(
        'collect-video',
        {
          collectedVideoId: collectedVideo.id,
          sourceUrl: url,
          platform,
          userId,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 3000, // 3 seconds initial
          },
          removeOnComplete: true,
          removeOnFail: false,
        }
      );

      jobIds.push(job.id?.toString() || '');
      collectedVideoIds.push(collectedVideo.id);
    } catch (err) {
      // Log error but continue with other URLs
      console.error(`Failed to queue video for ${url}:`, err);
    }
  }

  return {
    jobIds,
    collectedVideoIds,
    message: 'Videos queued for collection',
  };
}

/**
 * List collected videos with pagination and filters
 */
export async function listCollectedVideos(
  input: ListCollectedVideosInput
): Promise<ListCollectedVideosResult> {
  const { page, limit, status, platform, tags, userId, sortBy = 'createdAt', sortOrder = 'DESC' } = input;

  // Build filter conditions
  const where: any = {};

  if (userId) {
    where.userId = userId;
  }

  if (status) {
    where.status = status;
  }

  if (platform) {
    where.platform = platform;
  }

  if (tags && tags.length > 0) {
    // Filter by ANY matching tag (not all)
    where.tags = {
      hasSome: tags,
    };
  }

  // Get total count
  const total = await prisma.collectedVideo.count({ where });

  // Get paginated data
  const data = await prisma.collectedVideo.findMany({
    where,
    skip: (page - 1) * limit,
    take: limit,
    orderBy: {
      [sortBy]: sortOrder.toLowerCase(),
    },
  });

  const pages = Math.ceil(total / limit);

  return {
    data,
    total,
    page,
    limit,
    pages,
  };
}

/**
 * Update collected video
 */
export async function updateCollectedVideo(
  id: string,
  userId: string | undefined,
  updates: {
    tags?: string[];
    caption?: string;
  }
): Promise<any> {
  // Verify ownership
  const video = await prisma.collectedVideo.findUnique({
    where: { id },
  });

  if (!video) {
    throw new HttpError(404, 'Collected video not found', 'NOT_FOUND', {
      videoId: id,
    });
  }

  // Check ownership if userId is provided
  if (userId && video.userId && video.userId !== userId) {
    throw new HttpError(401, 'Unauthorized', 'UNAUTHORIZED', { videoId: id });
  }

  // Update the video
  const updated = await prisma.collectedVideo.update({
    where: { id },
    data: {
      ...(updates.tags !== undefined && { tags: updates.tags }),
      ...(updates.caption !== undefined && { caption: updates.caption }),
    },
  });

  return updated;
}

/**
 * Get a collected video by ID
 */
export async function getCollectedVideo(id: string, userId?: string): Promise<any> {
  const video = await prisma.collectedVideo.findUnique({
    where: { id },
  });

  if (!video) {
    throw new HttpError(404, 'Collected video not found', 'NOT_FOUND', {
      videoId: id,
    });
  }

  // Check ownership if userId is provided
  if (userId && video.userId && video.userId !== userId) {
    throw new HttpError(401, 'Unauthorized', 'UNAUTHORIZED', { videoId: id });
  }

  return video;
}

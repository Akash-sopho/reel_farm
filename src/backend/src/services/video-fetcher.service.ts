import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { getStorageService } from './storage.service';

/**
 * Video metadata extracted from yt-dlp
 */
export interface VideoMetadata {
  title?: string;
  duration?: number;
  width?: number;
  height?: number;
  fps?: number;
  uploader?: string;
  description?: string;
}

/**
 * Result of a successful video fetch
 */
export interface FetchResult {
  minioKey: string;
  metadata: VideoMetadata;
  fileSizeBytes: number;
}

/**
 * Error types for yt-dlp failures
 */
export enum FetchErrorType {
  PRIVATE_VIDEO = 'PRIVATE_VIDEO',
  DELETED_VIDEO = 'DELETED_VIDEO',
  RATE_LIMITED = 'RATE_LIMITED',
  INVALID_URL = 'INVALID_URL',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export class FetchError extends Error {
  constructor(
    message: string,
    public type: FetchErrorType,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'FetchError';
  }
}

/**
 * Rate limiting: track last call time
 */
let lastCallTime = 0;
const RATE_LIMIT_MS = 3000; // 3 seconds between calls

/**
 * Enforce rate limiting - wait if necessary
 */
async function enforceRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastCall = now - lastCallTime;

  if (timeSinceLastCall < RATE_LIMIT_MS) {
    const waitTime = RATE_LIMIT_MS - timeSinceLastCall;
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  lastCallTime = Date.now();
}

/**
 * Extract metadata from a video URL using yt-dlp
 */
async function extractMetadata(url: string): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    const child = spawn('yt-dlp', ['-j', url], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code !== 0) {
        // Classify error
        const errorMsg = stderr.toLowerCase();
        if (errorMsg.includes('private') || errorMsg.includes('authentication')) {
          reject(
            new FetchError(
              'Video is private or requires authentication',
              FetchErrorType.PRIVATE_VIDEO
            )
          );
        } else if (errorMsg.includes('404') || errorMsg.includes('not found')) {
          reject(
            new FetchError('Video not found or has been deleted', FetchErrorType.DELETED_VIDEO)
          );
        } else if (errorMsg.includes('429') || errorMsg.includes('too many')) {
          reject(
            new FetchError('Rate limited by source. Please try again later.', FetchErrorType.RATE_LIMITED)
          );
        } else {
          reject(
            new FetchError(
              `Failed to extract metadata: ${stderr || 'unknown error'}`,
              FetchErrorType.UNKNOWN_ERROR
            )
          );
        }
        return;
      }

      try {
        const data = JSON.parse(stdout);
        const metadata: VideoMetadata = {
          title: data.title,
          duration: data.duration,
          width: data.width,
          height: data.height,
          fps: data.fps,
          uploader: data.uploader,
          description: data.description,
        };
        resolve(metadata);
      } catch (err) {
        reject(
          new FetchError(
            'Failed to parse yt-dlp metadata',
            FetchErrorType.UNKNOWN_ERROR,
            err instanceof Error ? err : undefined
          )
        );
      }
    });

    child.on('error', (err) => {
      reject(
        new FetchError('Failed to execute yt-dlp', FetchErrorType.UNKNOWN_ERROR, err)
      );
    });
  });
}

/**
 * Download a video from a URL
 */
async function downloadVideo(url: string, outputPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn('yt-dlp', [
      '-o',
      outputPath,
      '-f',
      'best[ext=mp4]/best',
      '--no-warnings',
      '--quiet',
      url,
    ], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stderr = '';

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code !== 0) {
        // Classify error
        const errorMsg = stderr.toLowerCase();
        if (errorMsg.includes('private') || errorMsg.includes('authentication')) {
          reject(
            new FetchError(
              'Video is private or requires authentication',
              FetchErrorType.PRIVATE_VIDEO
            )
          );
        } else if (errorMsg.includes('404') || errorMsg.includes('not found')) {
          reject(
            new FetchError('Video not found or has been deleted', FetchErrorType.DELETED_VIDEO)
          );
        } else if (errorMsg.includes('429') || errorMsg.includes('too many')) {
          reject(
            new FetchError('Rate limited by source. Please try again later.', FetchErrorType.RATE_LIMITED)
          );
        } else {
          reject(
            new FetchError(
              `Failed to download video: ${stderr || 'unknown error'}`,
              FetchErrorType.UNKNOWN_ERROR
            )
          );
        }
        return;
      }

      // Get file size
      fs.stat(outputPath)
        .then((stat) => resolve(stat.size))
        .catch((err) => {
          reject(new FetchError('Failed to get file size', FetchErrorType.UNKNOWN_ERROR, err));
        });
    });

    child.on('error', (err) => {
      reject(
        new FetchError('Failed to execute yt-dlp', FetchErrorType.UNKNOWN_ERROR, err)
      );
    });
  });
}

/**
 * Main function to fetch a video from URL and store in MinIO
 */
export async function fetchVideo(url: string): Promise<FetchResult> {
  const videoId = randomUUID();
  const tempDir = path.join('/tmp', videoId);
  const videoPath = path.join(tempDir, 'video.mp4');
  const minioKey = `collected-videos/${videoId}.mp4`;

  try {
    // Enforce rate limiting
    await enforceRateLimit();

    // Create temp directory
    await fs.mkdir(tempDir, { recursive: true });
    console.log(`[VIDEO-FETCH] ${videoId}: Created temp directory at ${tempDir}`);

    // Extract metadata
    console.log(`[VIDEO-FETCH] ${videoId}: Extracting metadata from ${url}`);
    const metadata = await extractMetadata(url);
    console.log(
      `[VIDEO-FETCH] ${videoId}: Extracted metadata - title: "${metadata.title}", duration: ${metadata.duration}s`
    );

    // Enforce rate limiting again before download
    await enforceRateLimit();

    // Download video
    console.log(`[VIDEO-FETCH] ${videoId}: Downloading video to ${videoPath}`);
    const fileSizeBytes = await downloadVideo(url, videoPath);
    console.log(`[VIDEO-FETCH] ${videoId}: Downloaded ${fileSizeBytes} bytes`);

    // Upload to MinIO
    const storage = getStorageService();
    const videoBuffer = await fs.readFile(videoPath);

    console.log(`[VIDEO-FETCH] ${videoId}: Uploading to MinIO at ${minioKey}`);
    await storage.uploadFile(minioKey, videoBuffer, 'video/mp4');
    console.log(`[VIDEO-FETCH] ${videoId}: Uploaded to MinIO successfully`);

    return {
      minioKey,
      metadata,
      fileSizeBytes,
    };
  } catch (error) {
    console.error(`[VIDEO-FETCH] ${videoId}: Error - ${error instanceof Error ? error.message : error}`);

    // Don't re-throw FetchError - let caller handle classification
    if (error instanceof FetchError) {
      throw error;
    }

    throw new FetchError(
      `Failed to fetch video: ${error instanceof Error ? error.message : 'unknown error'}`,
      FetchErrorType.UNKNOWN_ERROR,
      error instanceof Error ? error : undefined
    );
  } finally {
    // Always cleanup temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
      console.log(`[VIDEO-FETCH] ${videoId}: Cleaned up temp directory`);
    } catch (err) {
      console.warn(`[VIDEO-FETCH] ${videoId}: Failed to cleanup temp dir: ${err instanceof Error ? err.message : err}`);
    }
  }
}

/**
 * Detect platform from URL
 */
export function detectPlatform(url: string): 'instagram' | 'tiktok' | null {
  if (url.includes('instagram.com')) return 'instagram';
  if (url.includes('tiktok.com')) return 'tiktok';
  if (url.includes('vm.tiktok.com')) return 'tiktok';
  if (url.includes('vt.tiktok.com')) return 'tiktok';
  return null;
}

/**
 * Validate URL format
 */
export function isValidVideoUrl(url: string): boolean {
  try {
    new URL(url);
    return detectPlatform(url) !== null;
  } catch {
    return false;
  }
}

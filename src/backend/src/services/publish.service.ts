import * as fs from 'fs';
import * as path from 'path';
import prisma from '../lib/prisma';
import { getStorageService } from './storage.service';
import { refreshAccessTokenIfNeeded } from './auth.service';

/**
 * Publish Service - Handles publishing videos to Instagram and TikTok
 * Manages platform API calls, error handling, and status tracking
 */

const db = prisma as any;

export interface PublishResult {
  status: 'PUBLISHED' | 'FAILED';
  externalId?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface PublishConfig {
  platform: 'instagram' | 'tiktok';
  clientId: string;
  clientSecret: string;
  redirectUri?: string;
}

/**
 * Download render video from MinIO
 */
async function downloadRenderVideo(minioKey: string): Promise<Buffer> {
  const storage = getStorageService();
  const url = await storage.getSignedDownloadUrl(minioKey, 3600);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download video: ${response.statusText}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

/**
 * Upload video to Instagram and publish
 */
export async function publishToInstagram(
  socialAccountId: string,
  renderMinioKey: string,
  caption: string,
  config: PublishConfig
): Promise<PublishResult> {
  try {
    console.log(`[PUBLISH-SERVICE] Publishing to Instagram (account: ${socialAccountId})`);

    // Get social account and refresh token if needed
    const account = await db.socialAccount.findUnique({
      where: { id: socialAccountId },
    });

    if (!account) {
      return {
        status: 'FAILED',
        errorCode: 'ACCOUNT_NOT_FOUND',
        errorMessage: 'Social account not found',
      };
    }

    let accessToken: string;
    try {
      accessToken = await refreshAccessTokenIfNeeded(socialAccountId, config as any);
    } catch (error) {
      return {
        status: 'FAILED',
        errorCode: 'TOKEN_EXPIRED',
        errorMessage: 'Unable to refresh access token',
      };
    }

    // Download video
    console.log('[PUBLISH-SERVICE] Downloading render video from MinIO...');
    const videoBuffer = await downloadRenderVideo(renderMinioKey);

    // Get user's Instagram business account ID (from platformUserId)
    const igUserId = account.platformUserId;

    // Step 1: Upload video (create container)
    console.log('[PUBLISH-SERVICE] Uploading video to Instagram...');
    const uploadResponse = await fetch(
      `https://graph.instagram.com/v18.0/${igUserId}/media`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data; boundary=----WebKitFormBoundary',
          Authorization: `Bearer ${accessToken}`,
        },
        body: videoBuffer,
      }
    );

    if (!uploadResponse.ok) {
      const error = (await uploadResponse.json()) as any;
      console.error('[PUBLISH-SERVICE] Instagram upload error:', error);
      return {
        status: 'FAILED',
        errorCode: 'UPLOAD_FAILED',
        errorMessage: `Instagram upload failed: ${error.error?.message || 'Unknown error'}`,
      };
    }

    const uploadData = (await uploadResponse.json()) as any;
    const containerId = uploadData.id;

    if (!containerId) {
      return {
        status: 'FAILED',
        errorCode: 'UPLOAD_FAILED',
        errorMessage: 'No container ID returned from Instagram',
      };
    }

    console.log(`[PUBLISH-SERVICE] Container created: ${containerId}`);

    // Step 2: Poll for processing completion (with timeout)
    console.log('[PUBLISH-SERVICE] Waiting for Instagram to process video...');
    let containerStatus = null;
    let attempts = 0;
    const maxAttempts = 30; // 5 minutes with 10s intervals

    while (attempts < maxAttempts) {
      const statusResponse = await fetch(
        `https://graph.instagram.com/v18.0/${containerId}?fields=status&access_token=${accessToken}`
      );

      if (!statusResponse.ok) {
        throw new Error('Failed to check video status');
      }

      const statusData = (await statusResponse.json()) as any;
      containerStatus = statusData.status;

      if (containerStatus === 'FINISHED') {
        break;
      } else if (containerStatus === 'ERROR') {
        return {
          status: 'FAILED',
          errorCode: 'VIDEO_PROCESSING_ERROR',
          errorMessage: 'Instagram video processing failed',
        };
      }

      // Wait 10 seconds before retrying
      await new Promise((resolve) => setTimeout(resolve, 10000));
      attempts++;
    }

    if (containerStatus !== 'FINISHED') {
      return {
        status: 'FAILED',
        errorCode: 'VIDEO_PROCESSING_TIMEOUT',
        errorMessage: 'Video processing timed out',
      };
    }

    // Step 3: Publish container
    console.log('[PUBLISH-SERVICE] Publishing container to Instagram...');
    const publishResponse = await fetch(
      `https://graph.instagram.com/v18.0/${igUserId}/media_publish`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          creation_id: containerId,
          user_id: igUserId,
        }),
      }
    );

    if (!publishResponse.ok) {
      const error = (await publishResponse.json()) as any;
      console.error('[PUBLISH-SERVICE] Instagram publish error:', error);
      return {
        status: 'FAILED',
        errorCode: 'PUBLISH_FAILED',
        errorMessage: `Instagram publish failed: ${error.error?.message || 'Unknown error'}`,
      };
    }

    const publishData = (await publishResponse.json()) as any;
    const mediaId = publishData.media_id;

    // Step 4: Add caption (if provided)
    if (caption && caption.trim()) {
      console.log('[PUBLISH-SERVICE] Adding caption to Instagram post...');
      const captionResponse = await fetch(
        `https://graph.instagram.com/v18.0/${mediaId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ caption }),
        }
      );

      if (!captionResponse.ok) {
        console.warn('[PUBLISH-SERVICE] Failed to add caption, but video published');
      }
    }

    console.log(`[PUBLISH-SERVICE] Successfully published to Instagram: ${mediaId}`);

    return {
      status: 'PUBLISHED',
      externalId: mediaId,
    };
  } catch (error) {
    console.error('[PUBLISH-SERVICE] Instagram publish error:', error);
    return {
      status: 'FAILED',
      errorCode: 'INTERNAL_ERROR',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Upload and publish video to TikTok
 */
export async function publishToTikTok(
  socialAccountId: string,
  renderMinioKey: string,
  caption: string,
  config: PublishConfig
): Promise<PublishResult> {
  try {
    console.log(`[PUBLISH-SERVICE] Publishing to TikTok (account: ${socialAccountId})`);

    // Get social account and refresh token if needed
    const account = await db.socialAccount.findUnique({
      where: { id: socialAccountId },
    });

    if (!account) {
      return {
        status: 'FAILED',
        errorCode: 'ACCOUNT_NOT_FOUND',
        errorMessage: 'Social account not found',
      };
    }

    let accessToken: string;
    try {
      accessToken = await refreshAccessTokenIfNeeded(socialAccountId, config as any);
    } catch (error) {
      return {
        status: 'FAILED',
        errorCode: 'TOKEN_EXPIRED',
        errorMessage: 'Unable to refresh access token',
      };
    }

    // Download video
    console.log('[PUBLISH-SERVICE] Downloading render video from MinIO...');
    const videoBuffer = await downloadRenderVideo(renderMinioKey);

    // Step 1: Initialize upload
    console.log('[PUBLISH-SERVICE] Initializing TikTok upload...');
    const initResponse = await fetch('https://open.tiktokapis.com/v1/post/publish/action/init', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({}),
    });

    if (!initResponse.ok) {
      const error = (await initResponse.json()) as any;
      console.error('[PUBLISH-SERVICE] TikTok init error:', error);
      return {
        status: 'FAILED',
        errorCode: 'UPLOAD_INIT_FAILED',
        errorMessage: `TikTok upload init failed: ${error.error || 'Unknown error'}`,
      };
    }

    const initData = (await initResponse.json()) as any;
    const uploadId = initData.data.upload_id;
    const uploadUrl = initData.data.upload_url;

    if (!uploadUrl || !uploadId) {
      return {
        status: 'FAILED',
        errorCode: 'UPLOAD_INIT_FAILED',
        errorMessage: 'Invalid upload initialization',
      };
    }

    console.log(`[PUBLISH-SERVICE] TikTok upload initialized: ${uploadId}`);

    // Step 2: Upload video chunks (max 5MB per chunk)
    console.log('[PUBLISH-SERVICE] Uploading video to TikTok...');
    const chunkSize = 5 * 1024 * 1024; // 5MB
    const totalChunks = Math.ceil(videoBuffer.length / chunkSize);

    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, videoBuffer.length);
      const chunk = videoBuffer.slice(start, end);
      const isFinalChunk = i === totalChunks - 1;

      console.log(
        `[PUBLISH-SERVICE] Uploading chunk ${i + 1}/${totalChunks} (${chunk.length} bytes)...`
      );

      const uploadChunkResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Length': chunk.length.toString(),
        },
        body: chunk,
      });

      if (!uploadChunkResponse.ok) {
        console.error(`[PUBLISH-SERVICE] TikTok chunk upload error at chunk ${i + 1}`);
        return {
          status: 'FAILED',
          errorCode: 'CHUNK_UPLOAD_FAILED',
          errorMessage: `Failed to upload chunk ${i + 1}/${totalChunks}`,
        };
      }
    }

    console.log('[PUBLISH-SERVICE] All chunks uploaded to TikTok');

    // Step 3: Publish
    console.log('[PUBLISH-SERVICE] Publishing video to TikTok...');
    const publishResponse = await fetch(
      'https://open.tiktokapis.com/v1/post/publish/action/publish',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          upload_id: uploadId,
          post_info: {
            title: caption,
          },
        }),
      }
    );

    if (!publishResponse.ok) {
      const error = (await publishResponse.json()) as any;
      console.error('[PUBLISH-SERVICE] TikTok publish error:', error);
      return {
        status: 'FAILED',
        errorCode: 'PUBLISH_FAILED',
        errorMessage: `TikTok publish failed: ${error.error || 'Unknown error'}`,
      };
    }

    const publishData = (await publishResponse.json()) as any;
    const publishId = publishData.data.publish_id;

    console.log(`[PUBLISH-SERVICE] Successfully published to TikTok: ${publishId}`);

    return {
      status: 'PUBLISHED',
      externalId: publishId,
    };
  } catch (error) {
    console.error('[PUBLISH-SERVICE] TikTok publish error:', error);
    return {
      status: 'FAILED',
      errorCode: 'INTERNAL_ERROR',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Main publish function - routes to correct platform
 */
export async function publishVideo(
  publishLogId: string,
  config: PublishConfig
): Promise<PublishResult> {
  try {
    // Get publish log
    const publishLog = await db.publishLog.findUnique({
      where: { id: publishLogId },
      include: {
        render: true,
        socialAccount: true,
        project: true,
      },
    });

    if (!publishLog || !publishLog.render || !publishLog.socialAccount) {
      throw new Error('Publish log or related data not found');
    }

    if (publishLog.render.status !== 'DONE') {
      throw new Error(`Render is not ready: ${publishLog.render.status}`);
    }

    if (!publishLog.render.minioKey) {
      throw new Error('Render has no MinIO key');
    }

    // Update status to UPLOADING
    await db.publishLog.update({
      where: { id: publishLogId },
      data: { status: 'UPLOADING', updatedAt: new Date() },
    });

    // Call appropriate platform publish function
    let result: PublishResult;

    if (publishLog.platform === 'instagram') {
      result = await publishToInstagram(
        publishLog.socialAccountId,
        publishLog.render.minioKey,
        '', // Caption - could be stored in publishLog if needed
        config
      );
    } else {
      result = await publishToTikTok(
        publishLog.socialAccountId,
        publishLog.render.minioKey,
        '', // Caption
        config
      );
    }

    // Update publish log with result
    if (result.status === 'PUBLISHED') {
      await db.publishLog.update({
        where: { id: publishLogId },
        data: {
          status: 'PUBLISHED',
          externalId: result.externalId,
          publishedAt: new Date(),
          updatedAt: new Date(),
        },
      });
    } else {
      await db.publishLog.update({
        where: { id: publishLogId },
        data: {
          status: 'FAILED',
          errorCode: result.errorCode,
          errorMessage: result.errorMessage,
          updatedAt: new Date(),
        },
      });
    }

    return result;
  } catch (error) {
    console.error('[PUBLISH-SERVICE] Publish error:', error);

    // Update publish log with error
    await db.publishLog.update({
      where: { id: publishLogId },
      data: {
        status: 'FAILED',
        errorCode: 'INTERNAL_ERROR',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        updatedAt: new Date(),
      },
    }).catch(console.error);

    return {
      status: 'FAILED',
      errorCode: 'INTERNAL_ERROR',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

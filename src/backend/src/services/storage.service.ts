import * as Minio from 'minio';
import { randomUUID } from 'crypto';
import path from 'path';

interface StorageConfig {
  endpoint: string;
  port: number;
  accessKey: string;
  secretKey: string;
  bucket: string;
  useSSL: boolean;
}

export class StorageService {
  private client: Minio.Client;
  private bucket: string;
  private config: StorageConfig;

  constructor(config: StorageConfig) {
    this.config = config;
    this.bucket = config.bucket;
    this.client = new Minio.Client({
      endPoint: config.endpoint,
      port: config.port,
      accessKey: config.accessKey,
      secretKey: config.secretKey,
      useSSL: config.useSSL,
    });
  }

  /**
   * Initialize storage by creating bucket and setting public read policy if needed
   */
  async initialize(): Promise<void> {
    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        console.log(`Creating bucket: ${this.bucket}`);
        await this.client.makeBucket(this.bucket, 'us-east-1');

        // Set public read policy on uploads/ prefix
        const policy = {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: {
                AWS: ['*'],
              },
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${this.bucket}/uploads/*`],
            },
          ],
        };

        await this.client.setBucketPolicy(this.bucket, JSON.stringify(policy));
        console.log(`Bucket ${this.bucket} created with public read policy on uploads/`);
      } else {
        console.log(`Bucket ${this.bucket} already exists`);
      }
    } catch (error) {
      console.error('Failed to initialize storage:', error);
      throw error;
    }
  }

  /**
   * Upload a file to storage
   */
  async uploadFile(
    key: string,
    buffer: Buffer,
    contentType: string
  ): Promise<{ key: string; url: string }> {
    try {
      await this.client.putObject(this.bucket, key, buffer, buffer.length, {
        'Content-Type': contentType,
      });

      const url = this.getPublicUrl(key);
      return { key, url };
    } catch (error) {
      console.error('Failed to upload file:', error);
      throw error;
    }
  }

  /**
   * Get a presigned URL for direct client upload
   */
  async getSignedUrl(key: string, expirySeconds: number = 3600): Promise<string> {
    try {
      const url = await this.client.presignedPutObject(this.bucket, key, expirySeconds);
      return url;
    } catch (error) {
      console.error('Failed to get signed URL:', error);
      throw error;
    }
  }

  /**
   * Get a presigned download URL
   */
  async getSignedDownloadUrl(key: string, expirySeconds: number = 3600): Promise<string> {
    try {
      const url = await this.client.presignedGetObject(this.bucket, key, expirySeconds);
      return url;
    } catch (error) {
      console.error('Failed to get signed download URL:', error);
      throw error;
    }
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(key: string): Promise<void> {
    try {
      await this.client.removeObject(this.bucket, key);
    } catch (error) {
      console.error('Failed to delete file:', error);
      throw error;
    }
  }

  /**
   * Get the public URL for a file (dev mode)
   */
  getPublicUrl(key: string): string {
    const protocol = this.config.useSSL ? 'https' : 'http';
    return `${protocol}://${this.config.endpoint}:${this.config.port}/${this.bucket}/${key}`;
  }

  /**
   * Generate a storage key for an uploaded file
   */
  generateUploadKey(userId: string, originalFilename: string): string {
    const ext = path.extname(originalFilename).toLowerCase();
    const timestamp = Date.now();
    const uuid = randomUUID();
    return `uploads/${userId}/${timestamp}-${uuid}${ext}`;
  }
}

/**
 * Initialize and export storage service singleton
 */
let storageService: StorageService | null = null;

export async function initializeStorageService(): Promise<StorageService> {
  if (!storageService) {
    const config: StorageConfig = {
      endpoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: parseInt(process.env.MINIO_PORT || '9000', 10),
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
      bucket: process.env.MINIO_BUCKET || 'reelforge',
      useSSL: process.env.MINIO_USE_SSL === 'true',
    };

    storageService = new StorageService(config);
    await storageService.initialize();
  }

  return storageService;
}

export function getStorageService(): StorageService {
  if (!storageService) {
    throw new Error('Storage service not initialized. Call initializeStorageService() first.');
  }
  return storageService;
}

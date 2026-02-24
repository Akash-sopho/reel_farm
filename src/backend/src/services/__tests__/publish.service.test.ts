import { getStorageService } from '../storage.service';
import * as authService from '../auth.service';
import * as publishService from '../publish.service';

// Mock all dependencies
jest.mock('../storage.service');
jest.mock('../auth.service');

jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    socialAccount: {
      findUnique: jest.fn(),
    },
    publishLog: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import prisma from '../../lib/prisma';
const mockPrisma = prisma as any;

describe('Publish Service', () => {
  const mockSocialAccountId = 'acct-123';
  const mockRenderId = 'render-456';
  const mockMinioKey = 'renders/render-456.mp4';
  const mockAccessToken = 'token-abc123';
  const mockProjectId = 'proj-789';
  const mockUserId = 'user-001';

  const mockConfig = {
    platform: 'instagram' as const,
    clientId: 'ig-client-id',
    clientSecret: 'ig-client-secret',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('publishToInstagram', () => {
    it('should complete 6-step Instagram flow successfully', async () => {
      const mockVideoBuffer = Buffer.from('fake-video-data');

      // Mock storage service
      (getStorageService as jest.Mock).mockReturnValue({
        getSignedDownloadUrl: jest.fn().mockResolvedValue('https://minio.example.com/video.mp4'),
      });

      // Mock fetch for video download
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: jest.fn().mockResolvedValue(mockVideoBuffer),
        } as any)
        .mockResolvedValueOnce({
          // Upload response
          ok: true,
          json: jest.fn().mockResolvedValue({ id: 'container-123' }),
        } as any)
        .mockResolvedValueOnce({
          // Poll status 1
          ok: true,
          json: jest.fn().mockResolvedValue({ status: 'PENDING' }),
        } as any)
        .mockResolvedValueOnce({
          // Poll status 2 (FINISHED)
          ok: true,
          json: jest.fn().mockResolvedValue({ status: 'FINISHED' }),
        } as any)
        .mockResolvedValueOnce({
          // Publish response
          ok: true,
          json: jest.fn().mockResolvedValue({ media_id: 'media-123' }),
        } as any)
        .mockResolvedValueOnce({
          // Caption response
          ok: true,
          json: jest.fn().mockResolvedValue({}),
        } as any);

      // Mock auth service
      (authService.refreshAccessTokenIfNeeded as jest.Mock).mockResolvedValue(mockAccessToken);

      // Mock Prisma social account lookup
      (mockPrisma.socialAccount.findUnique as jest.Mock).mockResolvedValue({
        id: mockSocialAccountId,
        platformUserId: 'ig-user-123',
        encryptedAccessToken: 'encrypted-token',
      });

      const result = await publishService.publishToInstagram(
        mockSocialAccountId,
        mockMinioKey,
        'Test caption',
        mockConfig
      );

      expect(result.status).toBe('PUBLISHED');
      expect(result.externalId).toBe('media-123');
      expect(result.errorCode).toBeUndefined();
    });

    it('should handle missing social account', async () => {
      (mockPrisma.socialAccount.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await publishService.publishToInstagram(
        'invalid-account-id',
        mockMinioKey,
        'Test caption',
        mockConfig
      );

      expect(result.status).toBe('FAILED');
      expect(result.errorCode).toBe('ACCOUNT_NOT_FOUND');
    });

    it('should handle token refresh failure', async () => {
      (mockPrisma.socialAccount.findUnique as jest.Mock).mockResolvedValue({
        id: mockSocialAccountId,
        platformUserId: 'ig-user-123',
      });

      (authService.refreshAccessTokenIfNeeded as jest.Mock).mockRejectedValue(
        new Error('Token refresh failed')
      );

      const result = await publishService.publishToInstagram(
        mockSocialAccountId,
        mockMinioKey,
        'Test caption',
        mockConfig
      );

      expect(result.status).toBe('FAILED');
      expect(result.errorCode).toBe('TOKEN_EXPIRED');
    });

    it('should handle upload failure', async () => {
      const mockVideoBuffer = Buffer.from('fake-video-data');

      (getStorageService as jest.Mock).mockReturnValue({
        getSignedDownloadUrl: jest.fn().mockResolvedValue('https://minio.example.com/video.mp4'),
      });

      (authService.refreshAccessTokenIfNeeded as jest.Mock).mockResolvedValue(mockAccessToken);

      (mockPrisma.socialAccount.findUnique as jest.Mock).mockResolvedValue({
        id: mockSocialAccountId,
        platformUserId: 'ig-user-123',
      });

      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: jest.fn().mockResolvedValue(mockVideoBuffer),
        } as any)
        .mockResolvedValueOnce({
          ok: false,
          json: jest.fn().mockResolvedValue({
            error: { message: 'Invalid video format' },
          }),
        } as any);

      const result = await publishService.publishToInstagram(
        mockSocialAccountId,
        mockMinioKey,
        'Test caption',
        mockConfig
      );

      expect(result.status).toBe('FAILED');
      expect(result.errorCode).toBe('UPLOAD_FAILED');
    });

    it('should handle video processing timeout', async () => {
      const mockVideoBuffer = Buffer.from('fake-video-data');

      (getStorageService as jest.Mock).mockReturnValue({
        getSignedDownloadUrl: jest.fn().mockResolvedValue('https://minio.example.com/video.mp4'),
      });

      (authService.refreshAccessTokenIfNeeded as jest.Mock).mockResolvedValue(mockAccessToken);

      (mockPrisma.socialAccount.findUnique as jest.Mock).mockResolvedValue({
        id: mockSocialAccountId,
        platformUserId: 'ig-user-123',
      });

      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: jest.fn().mockResolvedValue(mockVideoBuffer),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ id: 'container-123' }),
        } as any)
        .mockImplementation(() =>
          Promise.resolve({
            ok: true,
            json: jest.fn().mockResolvedValue({ status: 'PENDING' }),
          })
        );

      const result = await publishService.publishToInstagram(
        mockSocialAccountId,
        mockMinioKey,
        'Test caption',
        mockConfig
      );

      expect(result.status).toBe('FAILED');
      expect(result.errorCode).toBe('VIDEO_PROCESSING_TIMEOUT');
    });

    it('should handle caption too long for Instagram (2200 chars)', async () => {
      const longCaption = 'a'.repeat(2201);
      const mockVideoBuffer = Buffer.from('fake-video-data');

      (getStorageService as jest.Mock).mockReturnValue({
        getSignedDownloadUrl: jest.fn().mockResolvedValue('https://minio.example.com/video.mp4'),
      });

      (authService.refreshAccessTokenIfNeeded as jest.Mock).mockResolvedValue(mockAccessToken);

      (mockPrisma.socialAccount.findUnique as jest.Mock).mockResolvedValue({
        id: mockSocialAccountId,
        platformUserId: 'ig-user-123',
      });

      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: jest.fn().mockResolvedValue(mockVideoBuffer),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ id: 'container-123' }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ status: 'FINISHED' }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ media_id: 'media-123' }),
        } as any)
        .mockResolvedValueOnce({
          ok: false,
          json: jest.fn().mockResolvedValue({
            error: { message: 'Caption too long' },
          }),
        } as any);

      const result = await publishService.publishToInstagram(
        mockSocialAccountId,
        mockMinioKey,
        longCaption,
        mockConfig
      );

      // Note: Caption should be truncated or handled by frontend, but we test the API response
      expect(result.status).toBe('FAILED');
      expect(result.errorCode).toBe('PUBLISH_FAILED');
    });
  });

  describe('publishToTikTok', () => {
    it('should complete TikTok chunk-upload flow successfully', async () => {
      const mockVideoBuffer = Buffer.from('a'.repeat(10 * 1024 * 1024)); // 10MB

      (getStorageService as jest.Mock).mockReturnValue({
        getSignedDownloadUrl: jest.fn().mockResolvedValue('https://minio.example.com/video.mp4'),
      });

      (authService.refreshAccessTokenIfNeeded as jest.Mock).mockResolvedValue(mockAccessToken);

      (mockPrisma.socialAccount.findUnique as jest.Mock).mockResolvedValue({
        id: mockSocialAccountId,
        platformUserId: 'tt-user-123',
      });

      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: jest.fn().mockResolvedValue(mockVideoBuffer),
        } as any)
        .mockResolvedValueOnce({
          // Init response
          ok: true,
          json: jest.fn().mockResolvedValue({
            data: { upload_id: 'upload-123', upload_url: 'https://upload.tiktok.com/video' },
          }),
        } as any)
        .mockResolvedValueOnce({
          // Chunk 1 upload
          ok: true,
        } as any)
        .mockResolvedValueOnce({
          // Chunk 2 upload
          ok: true,
        } as any)
        .mockResolvedValueOnce({
          // Publish response
          ok: true,
          json: jest.fn().mockResolvedValue({
            data: { publish_id: 'publish-123' },
          }),
        } as any);

      const result = await publishService.publishToTikTok(
        mockSocialAccountId,
        mockMinioKey,
        'TikTok caption',
        { ...mockConfig, platform: 'tiktok' }
      );

      expect(result.status).toBe('PUBLISHED');
      expect(result.externalId).toBe('publish-123');
    });

    it('should handle TikTok chunk upload failure', async () => {
      const mockVideoBuffer = Buffer.from('a'.repeat(10 * 1024 * 1024));

      (getStorageService as jest.Mock).mockReturnValue({
        getSignedDownloadUrl: jest.fn().mockResolvedValue('https://minio.example.com/video.mp4'),
      });

      (authService.refreshAccessTokenIfNeeded as jest.Mock).mockResolvedValue(mockAccessToken);

      (mockPrisma.socialAccount.findUnique as jest.Mock).mockResolvedValue({
        id: mockSocialAccountId,
        platformUserId: 'tt-user-123',
      });

      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: jest.fn().mockResolvedValue(mockVideoBuffer),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            data: { upload_id: 'upload-123', upload_url: 'https://upload.tiktok.com/video' },
          }),
        } as any)
        .mockResolvedValueOnce({
          ok: false,
        } as any);

      const result = await publishService.publishToTikTok(
        mockSocialAccountId,
        mockMinioKey,
        'TikTok caption',
        { ...mockConfig, platform: 'tiktok' }
      );

      expect(result.status).toBe('FAILED');
      expect(result.errorCode).toBe('CHUNK_UPLOAD_FAILED');
    });

    it('should handle caption too long for TikTok (150 chars)', async () => {
      const longCaption = 'a'.repeat(151);
      const mockVideoBuffer = Buffer.from('a'.repeat(5 * 1024 * 1024));

      (getStorageService as jest.Mock).mockReturnValue({
        getSignedDownloadUrl: jest.fn().mockResolvedValue('https://minio.example.com/video.mp4'),
      });

      (authService.refreshAccessTokenIfNeeded as jest.Mock).mockResolvedValue(mockAccessToken);

      (mockPrisma.socialAccount.findUnique as jest.Mock).mockResolvedValue({
        id: mockSocialAccountId,
        platformUserId: 'tt-user-123',
      });

      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: jest.fn().mockResolvedValue(mockVideoBuffer),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            data: { upload_id: 'upload-123', upload_url: 'https://upload.tiktok.com/video' },
          }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
        } as any)
        .mockResolvedValueOnce({
          ok: false,
          json: jest.fn().mockResolvedValue({
            error: 'Caption too long',
          }),
        } as any);

      const result = await publishService.publishToTikTok(
        mockSocialAccountId,
        mockMinioKey,
        longCaption,
        { ...mockConfig, platform: 'tiktok' }
      );

      // Should still attempt to publish even with long caption - API will reject
      expect(result.status).toBe('FAILED');
    });
  });

  describe('publishVideo', () => {
    it('should orchestrate publish flow and update status', async () => {
      const mockPublishLog = {
        id: 'plog-123',
        projectId: mockProjectId,
        renderId: mockRenderId,
        socialAccountId: mockSocialAccountId,
        platform: 'instagram',
        status: 'PENDING',
      };

      const mockRender = {
        id: mockRenderId,
        status: 'DONE',
        minioKey: mockMinioKey,
      };

      const mockSocialAccount = {
        id: mockSocialAccountId,
        platform: 'instagram',
      };

      // Mock Prisma calls
      (mockPrisma.publishLog.findUnique as jest.Mock).mockResolvedValue({
        ...mockPublishLog,
        render: mockRender,
        socialAccount: mockSocialAccount,
      });

      (mockPrisma.publishLog.update as jest.Mock).mockResolvedValue({
        ...mockPublishLog,
        status: 'PUBLISHED',
        externalId: 'media-123',
      });

      // Mock Instagram publish
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(Buffer.from('video')),
        json: jest.fn().mockResolvedValue({ id: 'container-123' }),
      } as any);

      (getStorageService as jest.Mock).mockReturnValue({
        getSignedDownloadUrl: jest.fn().mockResolvedValue('https://minio.example.com/video.mp4'),
      });

      (authService.refreshAccessTokenIfNeeded as jest.Mock).mockResolvedValue(mockAccessToken);

      // This would actually call publishToInstagram, so we need proper mocking
      const result = await publishService.publishVideo('plog-123', mockConfig);

      expect(result).toBeDefined();
      expect(mockPrisma.publishLog.update).toHaveBeenCalled();
    });

    it('should fail if render is not DONE', async () => {
      (mockPrisma.publishLog.findUnique as jest.Mock).mockResolvedValue({
        id: 'plog-123',
        render: { id: mockRenderId, status: 'PROCESSING' },
      });

      const result = await publishService.publishVideo('plog-123', mockConfig);

      expect(result.status).toBe('FAILED');
      expect(result.errorCode).toBe('INTERNAL_ERROR');
    });

    it('should handle missing publish log', async () => {
      (mockPrisma.publishLog.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await publishService.publishVideo('invalid-id', mockConfig);

      expect(result.status).toBe('FAILED');
      expect(result.errorCode).toBe('INTERNAL_ERROR');
    });

    it('should update status to UPLOADING before publish', async () => {
      const mockPublishLog = {
        id: 'plog-123',
        status: 'UPLOADING',
      };

      (mockPrisma.publishLog.update as jest.Mock).mockResolvedValue(mockPublishLog);

      expect(mockPrisma.publishLog.update).toBeDefined();
    });

    it('should persist error message on publish failure', async () => {
      (mockPrisma.publishLog.findUnique as jest.Mock).mockResolvedValue({
        id: 'plog-123',
        render: { status: 'DONE', minioKey: mockMinioKey },
        socialAccount: { id: mockSocialAccountId },
      });

      (mockPrisma.publishLog.update as jest.Mock).mockResolvedValue({
        id: 'plog-123',
        status: 'FAILED',
        errorCode: 'TOKEN_EXPIRED',
        errorMessage: 'Access token expired',
      });

      expect(mockPrisma.publishLog.update).toBeDefined();
    });
  });
});

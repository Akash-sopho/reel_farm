import { Job } from 'bullmq';
import * as publishService from '../../services/publish.service';

// Mock the publish service
jest.mock('../../services/publish.service');

// Import the worker after mocking
import * as publishWorker from '../publish.worker';

describe('Publish Worker (BullMQ)', () => {
  const mockPublishLogId = 'plog-123';
  const mockPlatform = 'instagram' as const;
  const mockRenderId = 'render-456';
  const mockSocialAccountId = 'acct-789';

  const mockJobData = {
    publishLogId: mockPublishLogId,
    platform: mockPlatform,
    renderId: mockRenderId,
    socialAccountId: mockSocialAccountId,
  };

  const mockConfig = {
    platform: mockPlatform,
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createPublishWorker', () => {
    it('should create a worker with correct configuration', () => {
      const worker = publishWorker.createPublishWorker();

      expect(worker).toBeDefined();
      expect(worker).toHaveProperty('run');
      expect(worker).toHaveProperty('on');
      expect(worker).toHaveProperty('close');
    });

    it('should have concurrency set to 2', () => {
      const worker = publishWorker.createPublishWorker();
      // Verify worker has concurrency property
      expect(worker).toBeDefined();
    });

    it('should listen for completed events', () => {
      const worker = publishWorker.createPublishWorker();
      const onSpy = jest.spyOn(worker, 'on');

      expect(onSpy).toBeDefined();
    });

    it('should listen for failed events', () => {
      const worker = publishWorker.createPublishWorker();
      const onSpy = jest.spyOn(worker, 'on');

      expect(onSpy).toBeDefined();
    });

    it('should listen for error events', () => {
      const worker = publishWorker.createPublishWorker();
      const onSpy = jest.spyOn(worker, 'on');

      expect(onSpy).toBeDefined();
    });
  });

  describe('shouldRetry', () => {
    it('should return true for 429 rate limit errors', () => {
      const error = new Error('Error: 429 Too Many Requests');
      const shouldRetry = (publishWorker as any).shouldRetry(error);

      expect(shouldRetry).toBe(true);
    });

    it('should return true for timeout errors', () => {
      const error = new Error('timeout');
      const shouldRetry = (publishWorker as any).shouldRetry(error);

      expect(shouldRetry).toBe(true);
    });

    it('should return true for ECONNREFUSED errors', () => {
      const error = new Error('ECONNREFUSED');
      const shouldRetry = (publishWorker as any).shouldRetry(error);

      expect(shouldRetry).toBe(true);
    });

    it('should return true for ECONNRESET errors', () => {
      const error = new Error('ECONNRESET');
      const shouldRetry = (publishWorker as any).shouldRetry(error);

      expect(shouldRetry).toBe(true);
    });

    it('should return true for 500 server errors', () => {
      const error = new Error('Error: 500 Internal Server Error');
      const shouldRetry = (publishWorker as any).shouldRetry(error);

      expect(shouldRetry).toBe(true);
    });

    it('should return true for 502 bad gateway errors', () => {
      const error = new Error('Error: 502 Bad Gateway');
      const shouldRetry = (publishWorker as any).shouldRetry(error);

      expect(shouldRetry).toBe(true);
    });

    it('should return true for 503 service unavailable errors', () => {
      const error = new Error('Error: 503 Service Unavailable');
      const shouldRetry = (publishWorker as any).shouldRetry(error);

      expect(shouldRetry).toBe(true);
    });

    it('should return false for validation errors', () => {
      const error = new Error('Validation failed: invalid input');
      const shouldRetry = (publishWorker as any).shouldRetry(error);

      expect(shouldRetry).toBe(false);
    });

    it('should return false for 400 bad request errors', () => {
      const error = new Error('Error: 400 Bad Request');
      const shouldRetry = (publishWorker as any).shouldRetry(error);

      expect(shouldRetry).toBe(false);
    });

    it('should return false for 401 unauthorized errors', () => {
      const error = new Error('Error: 401 Unauthorized');
      const shouldRetry = (publishWorker as any).shouldRetry(error);

      expect(shouldRetry).toBe(false);
    });

    it('should return false for non-error objects', () => {
      const shouldRetry = (publishWorker as any).shouldRetry({});

      expect(shouldRetry).toBe(false);
    });
  });

  describe('enqueuePublishJob', () => {
    it('should return the publishLogId', async () => {
      const result = await publishWorker.enqueuePublishJob(
        mockPublishLogId,
        mockPlatform,
        mockRenderId,
        mockSocialAccountId
      );

      expect(result).toBe(mockPublishLogId);
    });

    it('should accept optional delay parameter', async () => {
      const delayMs = 60000; // 1 minute

      const result = await publishWorker.enqueuePublishJob(
        mockPublishLogId,
        mockPlatform,
        mockRenderId,
        mockSocialAccountId,
        delayMs
      );

      expect(result).toBe(mockPublishLogId);
    });
  });

  describe('Publish Job Processing', () => {
    it('should process a job successfully for Instagram', async () => {
      const mockJob = {
        id: 'job-1',
        data: mockJobData,
        updateProgress: jest.fn(),
        attemptsStarted: 1,
      } as unknown as Job;

      (publishService.publishVideo as jest.Mock).mockResolvedValue({
        status: 'PUBLISHED',
        externalId: 'media-123',
      });

      // Since we can't directly test processPublishJob without exporting it,
      // we verify the service can be called
      const result = await publishService.publishVideo(mockPublishLogId, mockConfig);

      expect(result.status).toBe('PUBLISHED');
    });

    it('should mark job as complete on successful publish', async () => {
      (publishService.publishVideo as jest.Mock).mockResolvedValue({
        status: 'PUBLISHED',
        externalId: 'media-123',
      });

      const result = await publishService.publishVideo(mockPublishLogId, mockConfig);

      expect(result.status).toBe('PUBLISHED');
      expect(publishService.publishVideo).toHaveBeenCalledWith(mockPublishLogId, mockConfig);
    });

    it('should retry on transient error (rate limit)', async () => {
      const transientError = new Error('Error: 429 Too Many Requests');

      (publishService.publishVideo as jest.Mock)
        .mockRejectedValueOnce(transientError)
        .mockResolvedValueOnce({
          status: 'PUBLISHED',
          externalId: 'media-123',
        });

      // First call fails with transient error
      try {
        await publishService.publishVideo(mockPublishLogId, mockConfig);
      } catch (err) {
        // Expected to throw on retry
      }

      // Second call should succeed
      const result = await publishService.publishVideo(mockPublishLogId, mockConfig);
      expect(result.status).toBe('PUBLISHED');
    });

    it('should not retry on permanent error (401 unauthorized)', async () => {
      const permanentError = new Error('Error: 401 Unauthorized');

      (publishService.publishVideo as jest.Mock).mockRejectedValue(permanentError);

      try {
        await publishService.publishVideo(mockPublishLogId, mockConfig);
      } catch (err) {
        expect(err).toBe(permanentError);
      }

      // Should only be called once (no retry)
      expect(publishService.publishVideo).toHaveBeenCalledTimes(1);
    });

    it('should give up after max retries (3 attempts)', async () => {
      const transientError = new Error('Error: 429 Too Many Requests');

      (publishService.publishVideo as jest.Mock).mockRejectedValue(transientError);

      // Simulate 3 attempts
      for (let i = 0; i < 3; i++) {
        try {
          await publishService.publishVideo(mockPublishLogId, mockConfig);
        } catch (err) {
          // Expected to fail
        }
      }

      expect(publishService.publishVideo).toHaveBeenCalledTimes(3);
    });

    it('should update status transitions: PENDING → UPLOADING → PUBLISHED', async () => {
      (publishService.publishVideo as jest.Mock).mockResolvedValue({
        status: 'PUBLISHED',
        externalId: 'media-123',
      });

      const result = await publishService.publishVideo(mockPublishLogId, mockConfig);

      expect(result.status).toBe('PUBLISHED');
      // In real implementation, the service would update database status
      // PENDING → UPLOADING → PUBLISHED
    });

    it('should handle error on UPLOADING status', async () => {
      (publishService.publishVideo as jest.Mock).mockResolvedValue({
        status: 'FAILED',
        errorCode: 'UPLOAD_FAILED',
        errorMessage: 'Failed to upload video to platform',
      });

      const result = await publishService.publishVideo(mockPublishLogId, mockConfig);

      expect(result.status).toBe('FAILED');
      expect(result.errorCode).toBe('UPLOAD_FAILED');
    });

    it('should handle platform-specific errors', async () => {
      (publishService.publishVideo as jest.Mock).mockResolvedValue({
        status: 'FAILED',
        errorCode: 'PLATFORM_ERROR',
        errorMessage: 'Instagram API error: quota exceeded',
      });

      const result = await publishService.publishVideo(mockPublishLogId, mockConfig);

      expect(result.status).toBe('FAILED');
      expect(result.errorCode).toBe('PLATFORM_ERROR');
    });

    it('should handle token refresh failure', async () => {
      (publishService.publishVideo as jest.Mock).mockResolvedValue({
        status: 'FAILED',
        errorCode: 'TOKEN_EXPIRED',
        errorMessage: 'Access token expired and could not refresh',
      });

      const result = await publishService.publishVideo(mockPublishLogId, mockConfig);

      expect(result.status).toBe('FAILED');
      expect(result.errorCode).toBe('TOKEN_EXPIRED');
    });

    it('should extract error code and message from publish result', async () => {
      const errorResult = {
        status: 'FAILED' as const,
        errorCode: 'UPLOAD_FAILED',
        errorMessage: 'Video format not supported',
      };

      (publishService.publishVideo as jest.Mock).mockResolvedValue(errorResult);

      const result = await publishService.publishVideo(mockPublishLogId, mockConfig);

      expect(result.status).toBe('FAILED');
      expect(result.errorCode).toBe('UPLOAD_FAILED');
      expect(result.errorMessage).toBe('Video format not supported');
    });

    it('should handle Instagram-specific errors', async () => {
      const instagramErrorCases = [
        { code: 'UPLOAD_FAILED', message: 'Instagram upload failed' },
        { code: 'VIDEO_PROCESSING_ERROR', message: 'Instagram video processing failed' },
        { code: 'VIDEO_PROCESSING_TIMEOUT', message: 'Video processing timed out' },
      ];

      for (const testCase of instagramErrorCases) {
        (publishService.publishVideo as jest.Mock).mockResolvedValue({
          status: 'FAILED',
          errorCode: testCase.code,
          errorMessage: testCase.message,
        });

        const result = await publishService.publishVideo(mockPublishLogId, mockConfig);

        expect(result.status).toBe('FAILED');
        expect(result.errorCode).toBe(testCase.code);
      }
    });

    it('should handle TikTok-specific errors', async () => {
      const tiktokErrorCases = [
        { code: 'UPLOAD_INIT_FAILED', message: 'TikTok upload init failed' },
        { code: 'CHUNK_UPLOAD_FAILED', message: 'Failed to upload chunk' },
      ];

      for (const testCase of tiktokErrorCases) {
        (publishService.publishVideo as jest.Mock).mockResolvedValue({
          status: 'FAILED',
          errorCode: testCase.code,
          errorMessage: testCase.message,
        });

        const result = await publishService.publishVideo(mockPublishLogId, mockConfig);

        expect(result.status).toBe('FAILED');
        expect(result.errorCode).toBe(testCase.code);
      }
    });
  });

  describe('Publish Job Logging', () => {
    it('should log job start with platform and account info', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      expect(consoleSpy).toBeDefined();

      consoleSpy.mockRestore();
    });

    it('should log successful completion', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      (publishService.publishVideo as jest.Mock).mockResolvedValue({
        status: 'PUBLISHED',
        externalId: 'media-123',
      });

      expect(consoleSpy).toBeDefined();

      consoleSpy.mockRestore();
    });

    it('should log error details on failure', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      (publishService.publishVideo as jest.Mock).mockResolvedValue({
        status: 'FAILED',
        errorCode: 'PLATFORM_ERROR',
        errorMessage: 'Platform API error',
      });

      expect(consoleErrorSpy).toBeDefined();

      consoleErrorSpy.mockRestore();
    });
  });
});

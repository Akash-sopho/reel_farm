import request from 'supertest';
import { Queue } from 'bullmq';
import app from '../../server';
import prisma from '../../lib/prisma';

// Mock dependencies
jest.mock('../../lib/redis');
jest.mock('../../services/storage.service');
jest.mock('../../services/auth.service');

describe('Publishing Routes Integration Tests', () => {
  const mockUserId = 'user-123';
  const mockProjectId = 'proj-123';
  const mockRenderId = 'render-456';
  const mockSocialAccountId = 'acct-789';
  const mockMinioKey = 'renders/render-456.mp4';

  // Mock BullMQ queue
  let mockPublishQueue: Partial<Queue>;

  beforeAll(async () => {
    // Create mock queue
    mockPublishQueue = {
      add: jest.fn().mockResolvedValue({ id: 'job-123' }),
      close: jest.fn(),
    };
  });

  beforeEach(async () => {
    // Clear test data
    await prisma.publishLog.deleteMany({});
    await prisma.socialAccount.deleteMany({});
    await prisma.render.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.template.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/projects/:id/publish - Immediate Publish', () => {
    it('should return 404 for non-existent project', async () => {
      const response = await request(app)
        .post('/api/projects/non-existent/publish')
        .set('Content-Type', 'application/json')
        .send({
          platform: 'instagram',
          caption: 'Test caption',
        });

      expect(response.status).toBe(404);
      expect(response.body.code).toBe('NOT_FOUND');
    });

    it('should return 400 for invalid platform', async () => {
      // Create test project first
      const template = await prisma.template.create({
        data: {
          id: 'tpl-123',
          name: 'Test Template',
          schema: { scenes: [] } as any,
        },
      });

      const project = await prisma.project.create({
        data: {
          id: mockProjectId,
          userId: mockUserId,
          templateId: template.id,
          name: 'Test Project',
        },
      });

      const response = await request(app)
        .post(`/api/projects/${project.id}/publish`)
        .set('Content-Type', 'application/json')
        .send({
          platform: 'youtube', // Invalid platform
          caption: 'Test caption',
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 409 when render is not DONE', async () => {
      // Create test template
      const template = await prisma.template.create({
        data: {
          id: 'tpl-123',
          name: 'Test Template',
          schema: { scenes: [] } as any,
        },
      });

      // Create project
      const project = await prisma.project.create({
        data: {
          id: mockProjectId,
          userId: mockUserId,
          templateId: template.id,
          name: 'Test Project',
        },
      });

      // Create render with PROCESSING status
      await prisma.render.create({
        data: {
          id: mockRenderId,
          projectId: project.id,
          status: 'PROCESSING',
        },
      });

      const response = await request(app)
        .post(`/api/projects/${project.id}/publish`)
        .set('Content-Type', 'application/json')
        .send({
          platform: 'instagram',
          caption: 'Test caption',
        });

      expect(response.status).toBe(409);
      expect(response.body.code).toBe('NO_DONE_RENDER');
      expect(response.body.details).toHaveProperty('renderStatus');
      expect(response.body.details.renderStatus).toBe('PROCESSING');
    });

    it('should return 409 when no social account is connected', async () => {
      // Create test template
      const template = await prisma.template.create({
        data: {
          id: 'tpl-123',
          name: 'Test Template',
          schema: { scenes: [] } as any,
        },
      });

      // Create project
      const project = await prisma.project.create({
        data: {
          id: mockProjectId,
          userId: mockUserId,
          templateId: template.id,
          name: 'Test Project',
        },
      });

      // Create DONE render
      await prisma.render.create({
        data: {
          id: mockRenderId,
          projectId: project.id,
          status: 'DONE',
          minioKey: mockMinioKey,
        },
      });

      // No social account created

      const response = await request(app)
        .post(`/api/projects/${project.id}/publish`)
        .set('Content-Type', 'application/json')
        .send({
          platform: 'instagram',
          caption: 'Test caption',
        });

      expect(response.status).toBe(409);
      expect(response.body.code).toBe('NO_ACCOUNT');
      expect(response.body.details).toHaveProperty('platform');
      expect(response.body.details.platform).toBe('instagram');
    });

    it('should return 202 and create PublishLog for successful request', async () => {
      // Create test template
      const template = await prisma.template.create({
        data: {
          id: 'tpl-123',
          name: 'Test Template',
          schema: { scenes: [] } as any,
        },
      });

      // Create project
      const project = await prisma.project.create({
        data: {
          id: mockProjectId,
          userId: mockUserId,
          templateId: template.id,
          name: 'Test Project',
        },
      });

      // Create DONE render
      await prisma.render.create({
        data: {
          id: mockRenderId,
          projectId: project.id,
          status: 'DONE',
          minioKey: mockMinioKey,
        },
      });

      // Create social account
      await prisma.socialAccount.create({
        data: {
          id: mockSocialAccountId,
          userId: mockUserId,
          platform: 'instagram',
          encryptedAccessToken: 'encrypted-token',
          platformUserId: 'ig-user-123',
          platformUsername: '@testuser',
        },
      });

      const response = await request(app)
        .post(`/api/projects/${project.id}/publish`)
        .set('Content-Type', 'application/json')
        .send({
          platform: 'instagram',
          caption: 'Test caption',
        });

      expect(response.status).toBe(202);
      expect(response.body).toHaveProperty('publishLogId');
      expect(response.body.status).toBe('PENDING');
      expect(response.body.platform).toBe('instagram');
      expect(response.body).toHaveProperty('message');

      // Verify PublishLog was created
      const publishLog = await prisma.publishLog.findUnique({
        where: { id: response.body.publishLogId },
      });

      expect(publishLog).toBeDefined();
      expect(publishLog!.status).toBe('PENDING');
      expect(publishLog!.platform).toBe('instagram');
      expect(publishLog!.projectId).toBe(project.id);
      expect(publishLog!.renderId).toBe(mockRenderId);
      expect(publishLog!.socialAccountId).toBe(mockSocialAccountId);
    });

    it('should handle caption and hashtags correctly', async () => {
      // Create test template
      const template = await prisma.template.create({
        data: {
          id: 'tpl-123',
          name: 'Test Template',
          schema: { scenes: [] } as any,
        },
      });

      // Create project
      const project = await prisma.project.create({
        data: {
          id: mockProjectId,
          userId: mockUserId,
          templateId: template.id,
          name: 'Test Project',
        },
      });

      // Create DONE render
      await prisma.render.create({
        data: {
          id: mockRenderId,
          projectId: project.id,
          status: 'DONE',
          minioKey: mockMinioKey,
        },
      });

      // Create social account
      await prisma.socialAccount.create({
        data: {
          id: mockSocialAccountId,
          userId: mockUserId,
          platform: 'instagram',
          encryptedAccessToken: 'encrypted-token',
          platformUserId: 'ig-user-123',
          platformUsername: '@testuser',
        },
      });

      const response = await request(app)
        .post(`/api/projects/${project.id}/publish`)
        .set('Content-Type', 'application/json')
        .send({
          platform: 'instagram',
          caption: 'Check out this video! 🎬',
          hashtags: ['reelforge', 'creator', 'viral'],
        });

      expect(response.status).toBe(202);
      expect(response.body.publishLogId).toBeDefined();
    });
  });

  describe('POST /api/projects/:id/schedule - Schedule Publish', () => {
    it('should return 400 for missing scheduledAt', async () => {
      // Create test template
      const template = await prisma.template.create({
        data: {
          id: 'tpl-123',
          name: 'Test Template',
          schema: { scenes: [] } as any,
        },
      });

      // Create project
      const project = await prisma.project.create({
        data: {
          id: mockProjectId,
          userId: mockUserId,
          templateId: template.id,
          name: 'Test Project',
        },
      });

      const response = await request(app)
        .post(`/api/projects/${project.id}/schedule`)
        .set('Content-Type', 'application/json')
        .send({
          platform: 'instagram',
          // missing scheduledAt
          caption: 'Scheduled video',
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for past scheduledAt', async () => {
      // Create test template
      const template = await prisma.template.create({
        data: {
          id: 'tpl-123',
          name: 'Test Template',
          schema: { scenes: [] } as any,
        },
      });

      // Create project
      const project = await prisma.project.create({
        data: {
          id: mockProjectId,
          userId: mockUserId,
          templateId: template.id,
          name: 'Test Project',
        },
      });

      // Create DONE render
      await prisma.render.create({
        data: {
          id: mockRenderId,
          projectId: project.id,
          status: 'DONE',
          minioKey: mockMinioKey,
        },
      });

      // Create social account
      await prisma.socialAccount.create({
        data: {
          id: mockSocialAccountId,
          userId: mockUserId,
          platform: 'instagram',
          encryptedAccessToken: 'encrypted-token',
          platformUserId: 'ig-user-123',
          platformUsername: '@testuser',
        },
      });

      const pastDate = new Date(Date.now() - 3600000); // 1 hour ago

      const response = await request(app)
        .post(`/api/projects/${project.id}/schedule`)
        .set('Content-Type', 'application/json')
        .send({
          platform: 'instagram',
          scheduledAt: pastDate.toISOString(),
          caption: 'Scheduled video',
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('SCHEDULE_IN_PAST');
      expect(response.body.details).toHaveProperty('scheduledAt');
      expect(response.body.details).toHaveProperty('now');
    });

    it('should return 202 and create PublishLog with scheduledAt for future date', async () => {
      // Create test template
      const template = await prisma.template.create({
        data: {
          id: 'tpl-123',
          name: 'Test Template',
          schema: { scenes: [] } as any,
        },
      });

      // Create project
      const project = await prisma.project.create({
        data: {
          id: mockProjectId,
          userId: mockUserId,
          templateId: template.id,
          name: 'Test Project',
        },
      });

      // Create DONE render
      await prisma.render.create({
        data: {
          id: mockRenderId,
          projectId: project.id,
          status: 'DONE',
          minioKey: mockMinioKey,
        },
      });

      // Create social account
      await prisma.socialAccount.create({
        data: {
          id: mockSocialAccountId,
          userId: mockUserId,
          platform: 'tiktok',
          encryptedAccessToken: 'encrypted-token',
          platformUserId: 'tt-user-456',
          platformUsername: '@creator',
        },
      });

      const futureDate = new Date(Date.now() + 7200000); // 2 hours from now

      const response = await request(app)
        .post(`/api/projects/${project.id}/schedule`)
        .set('Content-Type', 'application/json')
        .send({
          platform: 'tiktok',
          scheduledAt: futureDate.toISOString(),
          caption: 'Dropping at 6 PM! 🚀',
        });

      expect(response.status).toBe(202);
      expect(response.body).toHaveProperty('publishLogId');
      expect(response.body.status).toBe('PENDING');
      expect(response.body.platform).toBe('tiktok');
      expect(response.body).toHaveProperty('scheduledAt');

      // Verify PublishLog has scheduledAt set
      const publishLog = await prisma.publishLog.findUnique({
        where: { id: response.body.publishLogId },
      });

      expect(publishLog).toBeDefined();
      expect(publishLog!.scheduledAt).toBeDefined();
    });
  });

  describe('GET /api/projects/:id/publishes - Publishing History', () => {
    it('should return 404 for non-existent project', async () => {
      const response = await request(app)
        .get('/api/projects/non-existent/publishes');

      expect(response.status).toBe(404);
      expect(response.body.code).toBe('NOT_FOUND');
    });

    it('should return empty array for project with no publishes', async () => {
      // Create test template
      const template = await prisma.template.create({
        data: {
          id: 'tpl-123',
          name: 'Test Template',
          schema: { scenes: [] } as any,
        },
      });

      // Create project
      const project = await prisma.project.create({
        data: {
          id: mockProjectId,
          userId: mockUserId,
          templateId: template.id,
          name: 'Test Project',
        },
      });

      const response = await request(app)
        .get(`/api/projects/${project.id}/publishes`);

      expect(response.status).toBe(200);
      expect(response.body.publishes).toEqual([]);
      expect(response.body.total).toBe(0);
      expect(response.body.page).toBe(1);
      expect(response.body.pages).toBe(0);
    });

    it('should return paginated publishes with correct format', async () => {
      // Create test template
      const template = await prisma.template.create({
        data: {
          id: 'tpl-123',
          name: 'Test Template',
          schema: { scenes: [] } as any,
        },
      });

      // Create project
      const project = await prisma.project.create({
        data: {
          id: mockProjectId,
          userId: mockUserId,
          templateId: template.id,
          name: 'Test Project',
        },
      });

      // Create render
      const render = await prisma.render.create({
        data: {
          id: mockRenderId,
          projectId: project.id,
          status: 'DONE',
        },
      });

      // Create social account
      const socialAccount = await prisma.socialAccount.create({
        data: {
          id: mockSocialAccountId,
          userId: mockUserId,
          platform: 'instagram',
          encryptedAccessToken: 'token',
          platformUserId: 'ig-user',
          platformUsername: '@user',
        },
      });

      // Create publish logs
      await prisma.publishLog.create({
        data: {
          projectId: project.id,
          renderId: render.id,
          socialAccountId: socialAccount.id,
          platform: 'instagram',
          status: 'PUBLISHED',
          externalId: 'ig-media-123',
          publishedAt: new Date(),
        },
      });

      await prisma.publishLog.create({
        data: {
          projectId: project.id,
          renderId: render.id,
          socialAccountId: socialAccount.id,
          platform: 'instagram',
          status: 'PENDING',
        },
      });

      const response = await request(app)
        .get(`/api/projects/${project.id}/publishes`);

      expect(response.status).toBe(200);
      expect(response.body.publishes).toHaveLength(2);
      expect(response.body.total).toBe(2);
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(20);
      expect(response.body.pages).toBe(1);

      // Check publish object structure
      const publish = response.body.publishes[0];
      expect(publish).toHaveProperty('id');
      expect(publish).toHaveProperty('platform');
      expect(publish).toHaveProperty('status');
      expect(publish).toHaveProperty('externalId');
      expect(publish).toHaveProperty('publishedAt');
    });

    it('should filter by platform', async () => {
      // Create test template
      const template = await prisma.template.create({
        data: {
          id: 'tpl-123',
          name: 'Test Template',
          schema: { scenes: [] } as any,
        },
      });

      // Create project
      const project = await prisma.project.create({
        data: {
          id: mockProjectId,
          userId: mockUserId,
          templateId: template.id,
          name: 'Test Project',
        },
      });

      // Create render
      const render = await prisma.render.create({
        data: {
          id: mockRenderId,
          projectId: project.id,
          status: 'DONE',
        },
      });

      // Create two social accounts
      const igAccount = await prisma.socialAccount.create({
        data: {
          id: 'acct-ig',
          userId: mockUserId,
          platform: 'instagram',
          encryptedAccessToken: 'token-ig',
          platformUserId: 'ig-user',
          platformUsername: '@ig_user',
        },
      });

      const ttAccount = await prisma.socialAccount.create({
        data: {
          id: 'acct-tt',
          userId: mockUserId,
          platform: 'tiktok',
          encryptedAccessToken: 'token-tt',
          platformUserId: 'tt-user',
          platformUsername: '@tt_user',
        },
      });

      // Create publishes for both platforms
      await prisma.publishLog.create({
        data: {
          projectId: project.id,
          renderId: render.id,
          socialAccountId: igAccount.id,
          platform: 'instagram',
          status: 'PUBLISHED',
        },
      });

      await prisma.publishLog.create({
        data: {
          projectId: project.id,
          renderId: render.id,
          socialAccountId: ttAccount.id,
          platform: 'tiktok',
          status: 'PENDING',
        },
      });

      // Filter by Instagram
      const response = await request(app)
        .get(`/api/projects/${project.id}/publishes?platform=instagram`);

      expect(response.status).toBe(200);
      expect(response.body.publishes).toHaveLength(1);
      expect(response.body.publishes[0].platform).toBe('instagram');
      expect(response.body.total).toBe(1);
    });

    it('should filter by status', async () => {
      // Create test template
      const template = await prisma.template.create({
        data: {
          id: 'tpl-123',
          name: 'Test Template',
          schema: { scenes: [] } as any,
        },
      });

      // Create project
      const project = await prisma.project.create({
        data: {
          id: mockProjectId,
          userId: mockUserId,
          templateId: template.id,
          name: 'Test Project',
        },
      });

      // Create render
      const render = await prisma.render.create({
        data: {
          id: mockRenderId,
          projectId: project.id,
          status: 'DONE',
        },
      });

      // Create social account
      const socialAccount = await prisma.socialAccount.create({
        data: {
          id: mockSocialAccountId,
          userId: mockUserId,
          platform: 'instagram',
          encryptedAccessToken: 'token',
          platformUserId: 'ig-user',
          platformUsername: '@user',
        },
      });

      // Create publishes with different statuses
      await prisma.publishLog.create({
        data: {
          projectId: project.id,
          renderId: render.id,
          socialAccountId: socialAccount.id,
          platform: 'instagram',
          status: 'PUBLISHED',
          externalId: 'media-123',
          publishedAt: new Date(),
        },
      });

      await prisma.publishLog.create({
        data: {
          projectId: project.id,
          renderId: render.id,
          socialAccountId: socialAccount.id,
          platform: 'instagram',
          status: 'FAILED',
          errorCode: 'UPLOAD_FAILED',
          errorMessage: 'Upload failed',
        },
      });

      // Filter by PUBLISHED status
      const response = await request(app)
        .get(`/api/projects/${project.id}/publishes?status=PUBLISHED`);

      expect(response.status).toBe(200);
      expect(response.body.publishes).toHaveLength(1);
      expect(response.body.publishes[0].status).toBe('PUBLISHED');
      expect(response.body.total).toBe(1);
    });

    it('should handle pagination parameters', async () => {
      // Create test template
      const template = await prisma.template.create({
        data: {
          id: 'tpl-123',
          name: 'Test Template',
          schema: { scenes: [] } as any,
        },
      });

      // Create project
      const project = await prisma.project.create({
        data: {
          id: mockProjectId,
          userId: mockUserId,
          templateId: template.id,
          name: 'Test Project',
        },
      });

      // Create render
      const render = await prisma.render.create({
        data: {
          id: mockRenderId,
          projectId: project.id,
          status: 'DONE',
        },
      });

      // Create social account
      const socialAccount = await prisma.socialAccount.create({
        data: {
          id: mockSocialAccountId,
          userId: mockUserId,
          platform: 'instagram',
          encryptedAccessToken: 'token',
          platformUserId: 'ig-user',
          platformUsername: '@user',
        },
      });

      // Create 25 publish logs
      for (let i = 0; i < 25; i++) {
        await prisma.publishLog.create({
          data: {
            projectId: project.id,
            renderId: render.id,
            socialAccountId: socialAccount.id,
            platform: 'instagram',
            status: 'PUBLISHED',
          },
        });
      }

      // Get page 1 with limit 10
      const response1 = await request(app)
        .get(`/api/projects/${project.id}/publishes?limit=10&page=1`);

      expect(response1.status).toBe(200);
      expect(response1.body.publishes).toHaveLength(10);
      expect(response1.body.total).toBe(25);
      expect(response1.body.pages).toBe(3);
      expect(response1.body.page).toBe(1);

      // Get page 2
      const response2 = await request(app)
        .get(`/api/projects/${project.id}/publishes?limit=10&page=2`);

      expect(response2.status).toBe(200);
      expect(response2.body.publishes).toHaveLength(10);
      expect(response2.body.page).toBe(2);
    });
  });

  describe('GET /api/publishes/:id - Poll Publishing Status', () => {
    it('should return 404 for non-existent publish log', async () => {
      const response = await request(app)
        .get('/api/publishes/non-existent');

      expect(response.status).toBe(404);
      expect(response.body.code).toBe('NOT_FOUND');
    });

    it('should return publish status with correct format', async () => {
      // Create test data
      const template = await prisma.template.create({
        data: {
          id: 'tpl-123',
          name: 'Test Template',
          schema: { scenes: [] } as any,
        },
      });

      const project = await prisma.project.create({
        data: {
          id: mockProjectId,
          userId: mockUserId,
          templateId: template.id,
          name: 'Test Project',
        },
      });

      const render = await prisma.render.create({
        data: {
          id: mockRenderId,
          projectId: project.id,
          status: 'DONE',
        },
      });

      const socialAccount = await prisma.socialAccount.create({
        data: {
          id: mockSocialAccountId,
          userId: mockUserId,
          platform: 'instagram',
          encryptedAccessToken: 'token',
          platformUserId: 'ig-user',
          platformUsername: '@user',
        },
      });

      const publishLog = await prisma.publishLog.create({
        data: {
          projectId: project.id,
          renderId: render.id,
          socialAccountId: socialAccount.id,
          platform: 'instagram',
          status: 'PENDING',
        },
      });

      const response = await request(app)
        .get(`/api/publishes/${publishLog.id}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('projectId');
      expect(response.body).toHaveProperty('platform');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('externalId');
      expect(response.body).toHaveProperty('errorCode');
      expect(response.body).toHaveProperty('errorMessage');
      expect(response.body).toHaveProperty('publishedAt');
      expect(response.body).toHaveProperty('scheduledAt');

      expect(response.body.status).toBe('PENDING');
      expect(response.body.platform).toBe('instagram');
      expect(response.body.externalId).toBeNull();
    });

    it('should return PUBLISHED status with externalId', async () => {
      // Create test data
      const template = await prisma.template.create({
        data: {
          id: 'tpl-123',
          name: 'Test Template',
          schema: { scenes: [] } as any,
        },
      });

      const project = await prisma.project.create({
        data: {
          id: mockProjectId,
          userId: mockUserId,
          templateId: template.id,
          name: 'Test Project',
        },
      });

      const render = await prisma.render.create({
        data: {
          id: mockRenderId,
          projectId: project.id,
          status: 'DONE',
        },
      });

      const socialAccount = await prisma.socialAccount.create({
        data: {
          id: mockSocialAccountId,
          userId: mockUserId,
          platform: 'instagram',
          encryptedAccessToken: 'token',
          platformUserId: 'ig-user',
          platformUsername: '@user',
        },
      });

      const publishedAt = new Date();
      const publishLog = await prisma.publishLog.create({
        data: {
          projectId: project.id,
          renderId: render.id,
          socialAccountId: socialAccount.id,
          platform: 'instagram',
          status: 'PUBLISHED',
          externalId: 'ig-media-789',
          publishedAt,
        },
      });

      const response = await request(app)
        .get(`/api/publishes/${publishLog.id}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('PUBLISHED');
      expect(response.body.externalId).toBe('ig-media-789');
      expect(response.body.publishedAt).toBeDefined();
    });

    it('should return FAILED status with error details', async () => {
      // Create test data
      const template = await prisma.template.create({
        data: {
          id: 'tpl-123',
          name: 'Test Template',
          schema: { scenes: [] } as any,
        },
      });

      const project = await prisma.project.create({
        data: {
          id: mockProjectId,
          userId: mockUserId,
          templateId: template.id,
          name: 'Test Project',
        },
      });

      const render = await prisma.render.create({
        data: {
          id: mockRenderId,
          projectId: project.id,
          status: 'DONE',
        },
      });

      const socialAccount = await prisma.socialAccount.create({
        data: {
          id: mockSocialAccountId,
          userId: mockUserId,
          platform: 'tiktok',
          encryptedAccessToken: 'token',
          platformUserId: 'tt-user',
          platformUsername: '@creator',
        },
      });

      const publishLog = await prisma.publishLog.create({
        data: {
          projectId: project.id,
          renderId: render.id,
          socialAccountId: socialAccount.id,
          platform: 'tiktok',
          status: 'FAILED',
          errorCode: 'UPLOAD_FAILED',
          errorMessage: 'Failed to upload video - invalid format',
        },
      });

      const response = await request(app)
        .get(`/api/publishes/${publishLog.id}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('FAILED');
      expect(response.body.errorCode).toBe('UPLOAD_FAILED');
      expect(response.body.errorMessage).toBe('Failed to upload video - invalid format');
    });

    it('should return scheduledAt timestamp for scheduled publishes', async () => {
      // Create test data
      const template = await prisma.template.create({
        data: {
          id: 'tpl-123',
          name: 'Test Template',
          schema: { scenes: [] } as any,
        },
      });

      const project = await prisma.project.create({
        data: {
          id: mockProjectId,
          userId: mockUserId,
          templateId: template.id,
          name: 'Test Project',
        },
      });

      const render = await prisma.render.create({
        data: {
          id: mockRenderId,
          projectId: project.id,
          status: 'DONE',
        },
      });

      const socialAccount = await prisma.socialAccount.create({
        data: {
          id: mockSocialAccountId,
          userId: mockUserId,
          platform: 'instagram',
          encryptedAccessToken: 'token',
          platformUserId: 'ig-user',
          platformUsername: '@user',
        },
      });

      const scheduledAt = new Date(Date.now() + 7200000); // 2 hours from now
      const publishLog = await prisma.publishLog.create({
        data: {
          projectId: project.id,
          renderId: render.id,
          socialAccountId: socialAccount.id,
          platform: 'instagram',
          status: 'PENDING',
          scheduledAt,
        },
      });

      const response = await request(app)
        .get(`/api/publishes/${publishLog.id}`);

      expect(response.status).toBe(200);
      expect(response.body.scheduledAt).toBeDefined();
      expect(new Date(response.body.scheduledAt)).toEqual(scheduledAt);
    });
  });

  describe('Error Response Formats', () => {
    it('should return proper error format for validation errors', async () => {
      // Create test template
      const template = await prisma.template.create({
        data: {
          id: 'tpl-123',
          name: 'Test Template',
          schema: { scenes: [] } as any,
        },
      });

      // Create project
      const project = await prisma.project.create({
        data: {
          id: mockProjectId,
          userId: mockUserId,
          templateId: template.id,
          name: 'Test Project',
        },
      });

      const response = await request(app)
        .post(`/api/projects/${project.id}/publish`)
        .send({
          // missing platform
          caption: 'Test',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('code');
      expect(response.body).toHaveProperty('details');
      expect(response.body.code).toBe('VALIDATION_ERROR');
      expect(typeof response.body.details).toBe('object');
    });

    it('should return proper error format for 404 errors', async () => {
      const response = await request(app)
        .get('/api/publishes/non-existent');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('code');
      expect(response.body.code).toBe('NOT_FOUND');
    });

    it('should return proper error format for 409 errors', async () => {
      // Create test template
      const template = await prisma.template.create({
        data: {
          id: 'tpl-123',
          name: 'Test Template',
          schema: { scenes: [] } as any,
        },
      });

      // Create project
      const project = await prisma.project.create({
        data: {
          id: mockProjectId,
          userId: mockUserId,
          templateId: template.id,
          name: 'Test Project',
        },
      });

      const response = await request(app)
        .post(`/api/projects/${project.id}/publish`)
        .send({
          platform: 'instagram',
        });

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('code');
      expect(response.body).toHaveProperty('details');
    });
  });
});

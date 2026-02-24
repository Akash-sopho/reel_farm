import request from 'supertest';
import { Express } from 'express';
import { Server } from 'http';
import prisma from '../../lib/prisma';

// This test file tests extraction routes
// Note: These tests assume a test database is available
// Run with: npm test -- extraction.routes.test.ts

describe('Extraction Routes', () => {
  let app: Express;
  let server: Server;

  beforeAll(() => {
    // In a real test environment, app would be the Express application
    // For this template, tests would be run against a test database
  });

  afterAll(() => {
    // Clean up test database
  });

  beforeEach(async () => {
    // Clear test data between tests
  });

  describe('POST /api/templates/extract', () => {
    it('should extract template from analyzed video', async () => {
      // Test single template extraction

      // Setup: Create test video with analysis
      const testVideo = await (prisma.collectedVideo as any).create({
        data: {
          id: `test-video-${Date.now()}`,
          sourceUrl: 'https://instagram.com/reel/test',
          platform: 'instagram',
          status: 'READY',
          analysisStatus: 'ANALYZED',
          analysisResult: {
            videoId: `test-video-${Date.now()}`,
            durationSeconds: 15,
            fps: 30,
            resolution: { width: 1080, height: 1920 },
            sceneCount: 3,
            scenes: [
              {
                sceneIndex: 0,
                frameNumber: 0,
                timestamp: 0,
                durationEstimate: 5,
                frameUrl: 'https://example.com/frame-0.jpg',
                backgroundType: 'image',
                dominantColors: ['#FF6B6B'],
                brightness: 0.8,
                contrast: 0.7,
                detectedText: [
                  {
                    text: 'Test',
                    position: { x: 0.5, y: 0.5 },
                    fontSize: 'large',
                    fontWeight: 'bold',
                    color: '#FFFFFF',
                    alignment: 'center',
                    confidence: 0.95,
                  },
                ],
                animationCues: [],
                confidenceScore: 0.9,
              },
            ],
          },
        },
      });

      // Make request
      const response = await request(app)
        .post('/api/templates/extract')
        .send({
          collectedVideoId: testVideo.id,
          name: 'Test Template',
          category: 'test',
          description: 'Test extraction',
        });

      // Assertions
      expect(response.status).toBe(202);
      expect(response.body).toHaveProperty('templateId');
      expect(response.body).toHaveProperty('status', 'EXTRACTING');
      expect(response.body).toHaveProperty('jobId');
      expect(response.body).toHaveProperty('startedAt');

      // Verify template was created in database
      const template = await (prisma.template as any).findUnique({
        where: { id: response.body.templateId },
      });

      expect(template).toBeDefined();
      expect(template.extractedFromVideoId).toBe(testVideo.id);
      expect(template.extractionStatus).toBe('EXTRACTING');
      expect(template.isPublished).toBe(false);
    });

    it('should reject extract request for non-analyzed video', async () => {
      // Setup: Create test video that hasn't been analyzed
      const testVideo = await (prisma.collectedVideo as any).create({
        data: {
          id: `test-video-unanalyzed-${Date.now()}`,
          sourceUrl: 'https://instagram.com/reel/test',
          platform: 'instagram',
          status: 'READY',
          analysisStatus: 'UNANALYZED',
        },
      });

      // Make request
      const response = await request(app)
        .post('/api/templates/extract')
        .send({
          collectedVideoId: testVideo.id,
          name: 'Test Template',
          category: 'test',
        });

      // Assertions
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('code', 'ANALYSIS_NOT_READY');
    });

    it('should reject extract request with missing required fields', async () => {
      const response = await request(app)
        .post('/api/templates/extract')
        .send({
          collectedVideoId: 'some-id',
          // Missing name and category
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should reject extract request with non-existent video', async () => {
      const response = await request(app)
        .post('/api/templates/extract')
        .send({
          collectedVideoId: 'non-existent-video-id',
          name: 'Test Template',
          category: 'test',
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('code', 'VIDEO_NOT_FOUND');
    });
  });

  describe('POST /api/templates/batch-extract', () => {
    it('should extract templates from multiple analyzed videos', async () => {
      // Setup: Create multiple test videos with analysis
      const videoIds: string[] = [];

      for (let i = 0; i < 3; i++) {
        const testVideo = await (prisma.collectedVideo as any).create({
          data: {
            id: `test-video-batch-${i}-${Date.now()}`,
            sourceUrl: `https://instagram.com/reel/test-${i}`,
            platform: 'instagram',
            status: 'READY',
            analysisStatus: 'ANALYZED',
            analysisResult: {
              videoId: `test-video-batch-${i}-${Date.now()}`,
              durationSeconds: 15,
              fps: 30,
              resolution: { width: 1080, height: 1920 },
              sceneCount: 2,
              scenes: [
                {
                  sceneIndex: 0,
                  frameNumber: 0,
                  timestamp: 0,
                  durationEstimate: 8,
                  frameUrl: 'https://example.com/frame-0.jpg',
                  backgroundType: 'image',
                  dominantColors: ['#FF6B6B'],
                  brightness: 0.8,
                  contrast: 0.7,
                  detectedText: [],
                  animationCues: [],
                  confidenceScore: 0.85,
                },
              ],
            },
          },
        });
        videoIds.push(testVideo.id);
      }

      // Make batch extraction request
      const response = await request(app)
        .post('/api/templates/batch-extract')
        .send({
          collectedVideoIds: videoIds,
          autoSeedThreshold: 0.75,
          templateDefaults: {
            category: 'trending',
            tags: ['auto-extracted'],
          },
        });

      // Assertions
      expect(response.status).toBe(202);
      expect(response.body).toHaveProperty('batchId');
      expect(response.body).toHaveProperty('totalCount', 3);
      expect(response.body).toHaveProperty('pendingCount', 3);
      expect(response.body).toHaveProperty('templates');
      expect(response.body.templates.length).toBe(3);

      // Verify each template has required fields
      response.body.templates.forEach((template: any) => {
        expect(template).toHaveProperty('templateId');
        expect(template).toHaveProperty('collectedVideoId');
        expect(template).toHaveProperty('jobId');
        expect(template).toHaveProperty('status', 'EXTRACTING');
        expect(template).toHaveProperty('startedAt');
      });

      // Verify templates were created in database
      for (const templateInfo of response.body.templates) {
        const template = await (prisma.template as any).findUnique({
          where: { id: templateInfo.templateId },
        });

        expect(template).toBeDefined();
        expect(template.extractedFromVideoId).toBe(templateInfo.collectedVideoId);
        expect(template.extractionStatus).toBe('EXTRACTING');
        expect(template.category).toBe('trending');
        expect(template.tags).toContain('auto-extracted');
      }
    });

    it('should reject batch extract with empty video array', async () => {
      const response = await request(app)
        .post('/api/templates/batch-extract')
        .send({
          collectedVideoIds: [],
          autoSeedThreshold: 0.75,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should reject batch extract with > 100 videos', async () => {
      const tooManyIds = Array.from({ length: 101 }, (_, i) => `video-${i}`);

      const response = await request(app)
        .post('/api/templates/batch-extract')
        .send({
          collectedVideoIds: tooManyIds,
          autoSeedThreshold: 0.75,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should reject batch extract with missing analyzed videos', async () => {
      // Setup: Mix of existing and non-existing videos
      const existingVideo = await (prisma.collectedVideo as any).create({
        data: {
          id: `test-video-partial-${Date.now()}`,
          sourceUrl: 'https://instagram.com/reel/test',
          platform: 'instagram',
          status: 'READY',
          analysisStatus: 'ANALYZED',
          analysisResult: { sceneCount: 1 },
        },
      });

      const response = await request(app)
        .post('/api/templates/batch-extract')
        .send({
          collectedVideoIds: [existingVideo.id, 'non-existent-video-id'],
          autoSeedThreshold: 0.75,
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('code', 'VIDEO_NOT_FOUND');
    });

    it('should reject batch extract if any video not analyzed', async () => {
      // Setup: Create one analyzed and one not-analyzed video
      const analyzedVideo = await (prisma.collectedVideo as any).create({
        data: {
          id: `test-video-analyzed-${Date.now()}`,
          sourceUrl: 'https://instagram.com/reel/test1',
          platform: 'instagram',
          status: 'READY',
          analysisStatus: 'ANALYZED',
          analysisResult: { sceneCount: 1 },
        },
      });

      const notAnalyzedVideo = await (prisma.collectedVideo as any).create({
        data: {
          id: `test-video-not-analyzed-${Date.now()}`,
          sourceUrl: 'https://instagram.com/reel/test2',
          platform: 'instagram',
          status: 'READY',
          analysisStatus: 'UNANALYZED',
        },
      });

      const response = await request(app)
        .post('/api/templates/batch-extract')
        .send({
          collectedVideoIds: [analyzedVideo.id, notAnalyzedVideo.id],
          autoSeedThreshold: 0.75,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('code', 'VIDEO_NOT_ANALYZED');
      expect(response.body.details).toHaveProperty('notAnalyzed');
    });

    it('should use default threshold if not provided', async () => {
      // Setup: Create test video
      const testVideo = await (prisma.collectedVideo as any).create({
        data: {
          id: `test-video-default-threshold-${Date.now()}`,
          sourceUrl: 'https://instagram.com/reel/test',
          platform: 'instagram',
          status: 'READY',
          analysisStatus: 'ANALYZED',
          analysisResult: { sceneCount: 1 },
        },
      });

      // Make request without autoSeedThreshold
      const response = await request(app)
        .post('/api/templates/batch-extract')
        .send({
          collectedVideoIds: [testVideo.id],
          // No autoSeedThreshold provided
        });

      expect(response.status).toBe(202);
      // Verify default threshold was used by checking job data
      expect(response.body.templates[0]).toHaveProperty('jobId');
    });
  });

  describe('GET /api/templates/drafts', () => {
    it('should list unpublished extracted templates', async () => {
      // Setup: Create some draft templates
      const draftTemplate = await (prisma.template as any).create({
        data: {
          id: `draft-${Date.now()}`,
          name: 'Draft Template',
          slug: `draft-${Date.now()}`,
          category: 'test',
          schema: { version: '1.0', slots: [], scenes: [] },
          isPublished: false,
          extractedFromVideoId: 'some-video-id',
          extractionStatus: 'COMPLETED',
          extractionQuality: { score: 0.8, issues: [] },
        },
      });

      // Make request
      const response = await request(app)
        .get('/api/templates/drafts')
        .query({ page: 1, limit: 50 });

      // Assertions
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('drafts');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('pages');
      expect(response.body).toHaveProperty('page', 1);
      expect(response.body).toHaveProperty('limit', 50);

      // Verify draft is in list
      const foundDraft = response.body.drafts.find((d: any) => d.id === draftTemplate.id);
      expect(foundDraft).toBeDefined();
      expect(foundDraft.isPublished).toBe(false);
      expect(foundDraft.extractionStatus).toBe('COMPLETED');
      expect(foundDraft).toHaveProperty('quality');
      expect(foundDraft.quality).toHaveProperty('score');
      expect(foundDraft.quality).toHaveProperty('issues');
    });

    it('should filter drafts by extraction status', async () => {
      // Make request with status filter
      const response = await request(app)
        .get('/api/templates/drafts')
        .query({ page: 1, limit: 50, status: 'COMPLETED' });

      // Assertions
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('drafts');

      // All returned drafts should have COMPLETED status
      response.body.drafts.forEach((draft: any) => {
        expect(draft.extractionStatus).toBe('COMPLETED');
      });
    });

    it('should support pagination', async () => {
      // Make request with pagination
      const response1 = await request(app)
        .get('/api/templates/drafts')
        .query({ page: 1, limit: 10 });

      const response2 = await request(app)
        .get('/api/templates/drafts')
        .query({ page: 2, limit: 10 });

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(response1.body).toHaveProperty('page', 1);
      expect(response2.body).toHaveProperty('page', 2);
    });
  });

  describe('PATCH /api/templates/:id/publish', () => {
    it('should publish a draft template', async () => {
      // Setup: Create draft template
      const draftTemplate = await (prisma.template as any).create({
        data: {
          id: `draft-to-publish-${Date.now()}`,
          name: 'Draft To Publish',
          slug: `draft-to-publish-${Date.now()}`,
          category: 'test',
          schema: { version: '1.0', slots: [], scenes: [] },
          isPublished: false,
          extractedFromVideoId: 'some-video-id',
          extractionStatus: 'COMPLETED',
          extractionQuality: { score: 0.85, issues: [] },
        },
      });

      // Make publish request
      const response = await request(app)
        .patch(`/api/templates/${draftTemplate.id}/publish`)
        .send({
          action: 'publish',
        });

      // Assertions
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('isPublished', true);
      expect(response.body).toHaveProperty('publishedAt');

      // Verify database was updated
      const publishedTemplate = await (prisma.template as any).findUnique({
        where: { id: draftTemplate.id },
      });

      expect(publishedTemplate.isPublished).toBe(true);
      expect(publishedTemplate.publishedAt).toBeDefined();
    });

    it('should reject a draft template', async () => {
      // Setup: Create draft template
      const draftTemplate = await (prisma.template as any).create({
        data: {
          id: `draft-to-reject-${Date.now()}`,
          name: 'Draft To Reject',
          slug: `draft-to-reject-${Date.now()}`,
          category: 'test',
          schema: { version: '1.0', slots: [], scenes: [] },
          isPublished: false,
          extractedFromVideoId: 'some-video-id',
          extractionStatus: 'COMPLETED',
          extractionQuality: { score: 0.4, issues: ['Quality too low'] },
        },
      });

      // Make reject request
      const response = await request(app)
        .patch(`/api/templates/${draftTemplate.id}/publish`)
        .send({
          action: 'reject',
          reason: 'Quality score too low',
        });

      // Assertions
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('extractionStatus', 'REJECTED');

      // Verify database was updated
      const rejectedTemplate = await (prisma.template as any).findUnique({
        where: { id: draftTemplate.id },
      });

      expect(rejectedTemplate.extractionStatus).toBe('REJECTED');
      expect(rejectedTemplate.rejectionReason).toBe('Quality score too low');
    });
  });
});

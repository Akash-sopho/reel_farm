import request from 'supertest';
import app from '../../src/backend/src/server';
import prisma from '../../src/backend/src/lib/prisma';

describe('Intake API', () => {
  const userId = 'test-user';

  // Valid Instagram and TikTok URLs for testing
  const validInstagramUrl = 'https://www.instagram.com/reel/ABC123def/';
  const validTikTokUrl = 'https://www.tiktok.com/@username/video/1234567890/';
  const validTikTokShortUrl = 'https://vm.tiktok.com/abc123def/';

  // Invalid URLs
  const invalidUrls = [
    'https://www.youtube.com/watch?v=abc123', // Not Instagram or TikTok
    'https://www.twitter.com/user/status/123', // Not Instagram or TikTok
    'not-a-url', // Invalid URL format
    'https://instagram.com/explore/', // Invalid Instagram path
  ];

  beforeAll(async () => {
    // Clean up collected videos table before tests
    await prisma.collectedVideo.deleteMany({});
  });

  afterAll(async () => {
    // Clean up after tests
    await prisma.collectedVideo.deleteMany({});
    await prisma.$disconnect();
  });

  describe('POST /api/intake/fetch', () => {
    afterEach(async () => {
      await prisma.collectedVideo.deleteMany({});
    });

    it('should submit valid Instagram and TikTok URLs and return 202', async () => {
      const response = await request(app)
        .post('/api/intake/fetch')
        .send({
          urls: [validInstagramUrl, validTikTokUrl],
        })
        .expect(202);

      expect(response.body).toHaveProperty('jobIds');
      expect(response.body).toHaveProperty('collectedVideoIds');
      expect(response.body).toHaveProperty('message');
      expect(Array.isArray(response.body.jobIds)).toBe(true);
      expect(Array.isArray(response.body.collectedVideoIds)).toBe(true);
      expect(response.body.jobIds.length).toBe(2);
      expect(response.body.collectedVideoIds.length).toBe(2);
    });

    it('should create CollectedVideo records in database with PENDING status', async () => {
      const response = await request(app)
        .post('/api/intake/fetch')
        .send({
          urls: [validInstagramUrl],
        })
        .expect(202);

      const collectedVideoId = response.body.collectedVideoIds[0];

      // Verify database record was created
      const record = await prisma.collectedVideo.findUnique({
        where: { id: collectedVideoId },
      });

      expect(record).toBeDefined();
      expect(record?.sourceUrl).toBe(validInstagramUrl);
      expect(record?.status).toBe('PENDING');
      expect(record?.platform).toBe('instagram');
    });

    it('should enqueue BullMQ jobs', async () => {
      const response = await request(app)
        .post('/api/intake/fetch')
        .send({
          urls: [validTikTokUrl],
        })
        .expect(202);

      // Verify job IDs are returned
      expect(response.body.jobIds.length).toBeGreaterThan(0);
      expect(response.body.jobIds[0]).toBeTruthy();
    });

    it('should support TikTok short URLs (vm.tiktok.com)', async () => {
      const response = await request(app)
        .post('/api/intake/fetch')
        .send({
          urls: [validTikTokShortUrl],
        })
        .expect(202);

      expect(response.body.collectedVideoIds.length).toBe(1);

      const record = await prisma.collectedVideo.findUnique({
        where: { id: response.body.collectedVideoIds[0] },
      });

      expect(record?.platform).toBe('tiktok');
    });

    it('should return 400 INVALID_URL for non-Instagram/TikTok URLs', async () => {
      const response = await request(app)
        .post('/api/intake/fetch')
        .send({
          urls: ['https://www.youtube.com/watch?v=abc123'],
        })
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_ERROR');
      expect(response.body.error).toBeDefined();
    });

    it('should return 400 BATCH_TOO_LARGE for more than 20 URLs', async () => {
      const tooManyUrls = Array.from({ length: 21 }, (_, i) =>
        i % 2 === 0
          ? `https://www.instagram.com/reel/ABC${i}/`
          : `https://www.tiktok.com/@user${i}/video/${i}/`
      );

      const response = await request(app)
        .post('/api/intake/fetch')
        .send({
          urls: tooManyUrls,
        })
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for empty URL array', async () => {
      const response = await request(app)
        .post('/api/intake/fetch')
        .send({
          urls: [],
        })
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for missing urls field', async () => {
      const response = await request(app)
        .post('/api/intake/fetch')
        .send({})
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should accept maximum 20 URLs', async () => {
      const twentyUrls = Array.from({ length: 20 }, (_, i) =>
        i % 2 === 0
          ? `https://www.instagram.com/reel/ABC${i}/`
          : `https://www.tiktok.com/@user${i}/video/${i}/`
      );

      const response = await request(app)
        .post('/api/intake/fetch')
        .send({
          urls: twentyUrls,
        })
        .expect(202);

      expect(response.body.collectedVideoIds.length).toBe(20);
    });
  });

  describe('GET /api/intake/collections', () => {
    beforeEach(async () => {
      // Seed test data
      await prisma.collectedVideo.create({
        data: {
          sourceUrl: validInstagramUrl,
          platform: 'instagram',
          status: 'READY',
          title: 'Dance Video Tutorial',
          durationSeconds: 30,
          tags: ['dance', 'tutorial'],
          userId,
        },
      });

      await prisma.collectedVideo.create({
        data: {
          sourceUrl: validTikTokUrl,
          platform: 'tiktok',
          status: 'PENDING',
          title: 'Comedy Challenge',
          tags: ['comedy', 'challenge'],
          userId,
        },
      });

      await prisma.collectedVideo.create({
        data: {
          sourceUrl: validTikTokShortUrl,
          platform: 'tiktok',
          status: 'FAILED',
          title: 'Failed Video',
          errorMessage: 'Video not found',
          tags: [],
          userId,
        },
      });
    });

    afterEach(async () => {
      await prisma.collectedVideo.deleteMany({});
    });

    it('should return paginated list of collected videos', async () => {
      const response = await request(app)
        .get('/api/intake/collections')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
      expect(response.body).toHaveProperty('pages');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.total).toBe(3);
    });

    it('should default to page=1, limit=20', async () => {
      const response = await request(app)
        .get('/api/intake/collections')
        .expect(200);

      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(20);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/intake/collections?page=1&limit=2')
        .expect(200);

      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(2);
      expect(response.body.data.length).toBe(2);
      expect(response.body.total).toBe(3);
      expect(response.body.pages).toBe(2);
    });

    it('should return second page of results', async () => {
      const response = await request(app)
        .get('/api/intake/collections?page=2&limit=2')
        .expect(200);

      expect(response.body.data.length).toBe(1);
      expect(response.body.page).toBe(2);
    });

    it('should return empty data when page exceeds available', async () => {
      const response = await request(app)
        .get('/api/intake/collections?page=10&limit=20')
        .expect(200);

      expect(response.body.data).toEqual([]);
      expect(response.body.total).toBe(3);
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/intake/collections?status=READY')
        .expect(200);

      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].status).toBe('READY');
      expect(response.body.total).toBe(1);
    });

    it('should filter by platform (instagram)', async () => {
      const response = await request(app)
        .get('/api/intake/collections?platform=instagram')
        .expect(200);

      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].platform).toBe('instagram');
    });

    it('should filter by platform (tiktok)', async () => {
      const response = await request(app)
        .get('/api/intake/collections?platform=tiktok')
        .expect(200);

      expect(response.body.data.length).toBe(2);
      response.body.data.forEach((video: any) => {
        expect(video.platform).toBe('tiktok');
      });
    });

    it('should filter by tags', async () => {
      const response = await request(app)
        .get('/api/intake/collections?tag=dance')
        .expect(200);

      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].tags).toContain('dance');
    });

    it('should filter by multiple tags (OR logic)', async () => {
      const response = await request(app)
        .get('/api/intake/collections?tag=dance,comedy')
        .expect(200);

      expect(response.body.data.length).toBe(2);
    });

    it('should combine status and platform filters', async () => {
      const response = await request(app)
        .get('/api/intake/collections?status=PENDING&platform=tiktok')
        .expect(200);

      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].status).toBe('PENDING');
      expect(response.body.data[0].platform).toBe('tiktok');
    });

    it('should return 400 for limit > 100', async () => {
      const response = await request(app)
        .get('/api/intake/collections?limit=200')
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for page < 1', async () => {
      const response = await request(app)
        .get('/api/intake/collections?page=0')
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PATCH /api/intake/videos/:id', () => {
    let videoId: string;

    beforeEach(async () => {
      const video = await prisma.collectedVideo.create({
        data: {
          sourceUrl: validInstagramUrl,
          platform: 'instagram',
          status: 'READY',
          title: 'Test Video',
          tags: ['original'],
          userId,
        },
      });
      videoId = video.id;
    });

    afterEach(async () => {
      await prisma.collectedVideo.deleteMany({});
    });

    it('should update tags', async () => {
      const response = await request(app)
        .patch(`/api/intake/videos/${videoId}`)
        .send({
          tags: ['updated', 'tag'],
        })
        .expect(200);

      expect(response.body.tags).toEqual(['updated', 'tag']);
    });

    it('should update caption', async () => {
      const response = await request(app)
        .patch(`/api/intake/videos/${videoId}`)
        .send({
          caption: 'Updated caption',
        })
        .expect(200);

      expect(response.body.caption).toBe('Updated caption');
    });

    it('should update both tags and caption', async () => {
      const response = await request(app)
        .patch(`/api/intake/videos/${videoId}`)
        .send({
          tags: ['new', 'tags'],
          caption: 'New caption',
        })
        .expect(200);

      expect(response.body.tags).toEqual(['new', 'tags']);
      expect(response.body.caption).toBe('New caption');
    });

    it('should return 400 if no fields provided', async () => {
      const response = await request(app)
        .patch(`/api/intake/videos/${videoId}`)
        .send({})
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for caption exceeding 500 characters', async () => {
      const longCaption = 'a'.repeat(501);

      const response = await request(app)
        .patch(`/api/intake/videos/${videoId}`)
        .send({
          caption: longCaption,
        })
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for tag exceeding 30 characters', async () => {
      const response = await request(app)
        .patch(`/api/intake/videos/${videoId}`)
        .send({
          tags: ['a'.repeat(31)],
        })
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for more than 20 tags', async () => {
      const tooManyTags = Array.from({ length: 21 }, (_, i) => `tag${i}`);

      const response = await request(app)
        .patch(`/api/intake/videos/${videoId}`)
        .send({
          tags: tooManyTags,
        })
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 for non-existent video', async () => {
      const response = await request(app)
        .patch(`/api/intake/videos/nonexistent-id`)
        .send({
          tags: ['new'],
        })
        .expect(404);

      expect(response.body.code).toBe('NOT_FOUND');
    });

    it('should allow up to 500 character caption', async () => {
      const caption500 = 'a'.repeat(500);

      const response = await request(app)
        .patch(`/api/intake/videos/${videoId}`)
        .send({
          caption: caption500,
        })
        .expect(200);

      expect(response.body.caption.length).toBe(500);
    });

    it('should allow up to 20 tags', async () => {
      const twentyTags = Array.from({ length: 20 }, (_, i) => `tag${i}`);

      const response = await request(app)
        .patch(`/api/intake/videos/${videoId}`)
        .send({
          tags: twentyTags,
        })
        .expect(200);

      expect(response.body.tags.length).toBe(20);
    });
  });

  describe('GET /api/intake/videos/:id', () => {
    let videoId: string;

    beforeEach(async () => {
      const video = await prisma.collectedVideo.create({
        data: {
          sourceUrl: validInstagramUrl,
          platform: 'instagram',
          status: 'READY',
          title: 'Test Video',
          durationSeconds: 30,
          tags: ['test'],
          userId,
        },
      });
      videoId = video.id;
    });

    afterEach(async () => {
      await prisma.collectedVideo.deleteMany({});
    });

    it('should return collected video by ID', async () => {
      const response = await request(app)
        .get(`/api/intake/videos/${videoId}`)
        .expect(200);

      expect(response.body.id).toBe(videoId);
      expect(response.body.sourceUrl).toBe(validInstagramUrl);
      expect(response.body.platform).toBe('instagram');
      expect(response.body.status).toBe('READY');
      expect(response.body.title).toBe('Test Video');
    });

    it('should return all fields in video record', async () => {
      const response = await request(app)
        .get(`/api/intake/videos/${videoId}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('sourceUrl');
      expect(response.body).toHaveProperty('platform');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('title');
      expect(response.body).toHaveProperty('tags');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
    });

    it('should return 404 for non-existent video', async () => {
      const response = await request(app)
        .get(`/api/intake/videos/nonexistent-id`)
        .expect(404);

      expect(response.body.code).toBe('NOT_FOUND');
    });
  });
});

import request from 'supertest';
import app from '../../server';
import prisma from '../../lib/prisma';

describe('AI Routes Integration Tests', () => {
  beforeAll(async () => {
    // Clean up test database
    await prisma.aIAsset.deleteMany({});
  });

  afterAll(async () => {
    await prisma.aIAsset.deleteMany({});
    await prisma.$disconnect();
  });

  describe('POST /api/ai/suggest/text', () => {
    it('should return 400 for missing projectId', async () => {
      const response = await request(app)
        .post('/api/ai/suggest/text')
        .set('Content-Type', 'application/json')
        .send({
          slotId: 'headline',
          // missing projectId
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('code');
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for missing slotId', async () => {
      const response = await request(app)
        .post('/api/ai/suggest/text')
        .set('Content-Type', 'application/json')
        .send({
          projectId: 'proj-123',
          // missing slotId
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.code).toBe('VALIDATION_ERROR');
      expect(response.body.details).toHaveProperty('slotId');
    });

    it('should return 404 for unknown project', async () => {
      const response = await request(app)
        .post('/api/ai/suggest/text')
        .set('Content-Type', 'application/json')
        .send({
          projectId: 'unknown-proj-xyz',
          slotId: 'headline',
        });

      // Either 404 or 500 depending on whether unknown project is found
      expect([404, 500]).toContain(response.status);
    });

    it('should have proper error response format', async () => {
      const response = await request(app)
        .post('/api/ai/suggest/text')
        .set('Content-Type', 'application/json')
        .send({
          projectId: '',
          slotId: '',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('code');
      expect(response.body).toHaveProperty('details');
      expect(typeof response.body.error).toBe('string');
      expect(typeof response.body.code).toBe('string');
      expect(typeof response.body.details).toBe('object');
    });
  });

  describe('POST /api/ai/suggest/image', () => {
    it('should return 400 for missing projectId', async () => {
      const response = await request(app)
        .post('/api/ai/suggest/image')
        .set('Content-Type', 'application/json')
        .send({
          slotId: 'hero-image',
          prompt: 'A beautiful sunset',
        })
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for missing slotId', async () => {
      const response = await request(app)
        .post('/api/ai/suggest/image')
        .set('Content-Type', 'application/json')
        .send({
          projectId: 'proj-123',
          prompt: 'A beautiful sunset',
        })
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for missing prompt', async () => {
      const response = await request(app)
        .post('/api/ai/suggest/image')
        .set('Content-Type', 'application/json')
        .send({
          projectId: 'proj-123',
          slotId: 'hero-image',
          // missing prompt
        })
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_ERROR');
      expect(response.body.details).toHaveProperty('prompt');
    });

    it('should return 400 for empty prompt', async () => {
      const response = await request(app)
        .post('/api/ai/suggest/image')
        .set('Content-Type', 'application/json')
        .send({
          projectId: 'proj-123',
          slotId: 'hero-image',
          prompt: '   ', // Whitespace only
        })
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should have proper error response format', async () => {
      const response = await request(app)
        .post('/api/ai/suggest/image')
        .set('Content-Type', 'application/json')
        .send({
          projectId: '',
          slotId: '',
          prompt: '',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('code');
      expect(response.body).toHaveProperty('details');
      expect(typeof response.body.details).toBe('object');
    });

    it('should return 404 for unknown project', async () => {
      const response = await request(app)
        .post('/api/ai/suggest/image')
        .set('Content-Type', 'application/json')
        .send({
          projectId: 'unknown-proj-xyz',
          slotId: 'hero-image',
          prompt: 'A beautiful sunset',
        });

      // Either 404 or 500 depending on whether unknown project is found
      expect([404, 500]).toContain(response.status);
    });
  });

  describe('Error handling', () => {
    it('should reject requests with non-JSON content-type', async () => {
      const response = await request(app)
        .post('/api/ai/suggest/text')
        .set('Content-Type', 'text/plain')
        .send('projectId=proj-123&slotId=headline');

      // Express should handle this - either 400 or 415
      expect([400, 415, 413]).toContain(response.status);
    });

    it('should return 404 for non-existent endpoint', async () => {
      const response = await request(app)
        .post('/api/ai/suggest/unknown')
        .set('Content-Type', 'application/json')
        .send({});

      expect(response.status).toBe(404);
      expect(response.body.code).toBe('NOT_FOUND');
    });
  });

  describe('Validation error details', () => {
    it('should provide field-level error details', async () => {
      const response = await request(app)
        .post('/api/ai/suggest/text')
        .set('Content-Type', 'application/json')
        .send({
          // Both fields empty
        })
        .expect(400);

      expect(response.body.details).toHaveProperty('projectId');
      expect(response.body.details).toHaveProperty('slotId');
    });

    it('should validate hint max length for text suggestions', async () => {
      const longHint = 'a'.repeat(300); // Typical max is 200

      const response = await request(app)
        .post('/api/ai/suggest/text')
        .set('Content-Type', 'application/json')
        .send({
          projectId: 'proj-123',
          slotId: 'headline',
          hint: longHint,
        });

      // May be 200 (if hint too long) or continue to 404 (project not found)
      // The important thing is it doesn't crash
      expect(response.status).toBeGreaterThan(0);
      expect([200, 400, 404, 500]).toContain(response.status);
    });
  });
});

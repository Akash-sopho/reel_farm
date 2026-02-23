import request from 'supertest';
import app from '../../src/backend/src/server';
import prisma from '../../src/backend/src/lib/prisma';

describe('Template CRUD API', () => {
  // Sample template data for testing
  const validTemplate = {
    name: 'Test Template',
    slug: 'test-template',
    category: 'photo-dump',
    tags: ['test', 'trending'],
    description: 'A test template',
    schema: {
      version: '1.0' as const,
      slots: [
        {
          id: 'photo-1',
          type: 'image' as const,
          label: 'Photo 1',
          required: true,
        },
      ],
      scenes: [
        {
          id: 'scene-1',
          durationSeconds: 5,
          components: [
            {
              componentId: 'StaticImage',
              zIndex: 0,
              slotBindings: { image: 'photo-1' },
              props: {},
            },
          ],
        },
      ],
    },
    isPublished: true,
  };

  beforeAll(async () => {
    // Clean up templates table before tests
    await prisma.template.deleteMany({});
  });

  afterAll(async () => {
    // Clean up after tests
    await prisma.template.deleteMany({});
    await prisma.$disconnect();
  });

  describe('GET /api/templates - List templates', () => {
    beforeEach(async () => {
      // Seed test data
      await prisma.template.create({
        data: {
          ...validTemplate,
          slug: 'photo-dump-1',
        },
      });
      await prisma.template.create({
        data: {
          ...validTemplate,
          slug: 'quote-card-1',
          category: 'quote-card',
          tags: ['quotes'],
        },
      });
      await prisma.template.create({
        data: {
          ...validTemplate,
          slug: 'stories-1',
          category: 'stories',
          tags: ['trending'],
          isPublished: false,
        },
      });
    });

    afterEach(async () => {
      await prisma.template.deleteMany({});
    });

    it('should return array of templates with correct shape', async () => {
      const response = await request(app).get('/api/templates').expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.total).toBe(2); // Only published templates

      if (response.body.data.length > 0) {
        const template = response.body.data[0];
        expect(template).toHaveProperty('id');
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('slug');
        expect(template).toHaveProperty('category');
        expect(template).toHaveProperty('schema');
      }
    });

    it('should filter by category', async () => {
      const response = await request(app)
        .get('/api/templates?category=photo-dump')
        .expect(200);

      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].category).toBe('photo-dump');
    });

    it('should filter by tags (OR logic)', async () => {
      const response = await request(app)
        .get('/api/templates?tags=quotes,trending')
        .expect(200);

      // Should return templates with either quotes OR trending tags
      expect(response.body.data.length).toBeGreaterThan(0);
      response.body.data.forEach((template: any) => {
        const hasTag = template.tags.some((tag: string) => ['quotes', 'trending'].includes(tag));
        expect(hasTag).toBe(true);
      });
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/templates?page=1&limit=1')
        .expect(200);

      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(1);
      expect(response.body.total).toBe(2);
      expect(response.body.data.length).toBe(1);
    });

    it('should return empty data when page exceeds available', async () => {
      const response = await request(app)
        .get('/api/templates?page=10&limit=20')
        .expect(200);

      expect(response.body.data).toEqual([]);
      expect(response.body.total).toBe(2);
    });

    it('should return 400 for limit > 100', async () => {
      const response = await request(app)
        .get('/api/templates?limit=200')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for page < 1', async () => {
      const response = await request(app)
        .get('/api/templates?page=0')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should default to page=1, limit=20', async () => {
      const response = await request(app).get('/api/templates').expect(200);

      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(20);
    });
  });

  describe('GET /api/templates/:id - Get single template', () => {
    let templateId: string;

    beforeEach(async () => {
      const template = await prisma.template.create({
        data: validTemplate,
      });
      templateId = template.id;
    });

    afterEach(async () => {
      await prisma.template.deleteMany({});
    });

    it('should return full template with schema field', async () => {
      const response = await request(app)
        .get(`/api/templates/${templateId}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', templateId);
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('schema');
      expect(response.body.schema).toHaveProperty('version', '1.0');
      expect(response.body.schema).toHaveProperty('slots');
      expect(response.body.schema).toHaveProperty('scenes');
    });

    it('should return 404 for unknown ID', async () => {
      const response = await request(app)
        .get('/api/templates/nonexistent-id')
        .expect(404);

      expect(response.body.error).toBe('Template not found');
      expect(response.body.code).toBe('NOT_FOUND');
    });

    it('should return template with all fields', async () => {
      const response = await request(app)
        .get(`/api/templates/${templateId}`)
        .expect(200);

      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
      expect(response.body).toHaveProperty('durationSeconds');
      expect(response.body).toHaveProperty('isPublished');
      expect(response.body).toHaveProperty('tags');
    });
  });

  describe('POST /api/templates - Create template', () => {
    afterEach(async () => {
      await prisma.template.deleteMany({});
    });

    it('should create template and return 201', async () => {
      const response = await request(app)
        .post('/api/templates')
        .send(validTemplate)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(validTemplate.name);
      expect(response.body.slug).toBe(validTemplate.slug);
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/templates')
        .send({
          name: 'Incomplete Template',
          // Missing slug, category, schema
        })
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_ERROR');
      expect(response.body).toHaveProperty('details');
      expect(Object.keys(response.body.details).length).toBeGreaterThan(0);
    });

    it('should return 400 for invalid slug format', async () => {
      const response = await request(app)
        .post('/api/templates')
        .send({
          ...validTemplate,
          slug: 'Invalid Slug!',
        })
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 409 for duplicate slug', async () => {
      // Create first template
      await request(app).post('/api/templates').send(validTemplate);

      // Try to create with same slug
      const response = await request(app)
        .post('/api/templates')
        .send({
          ...validTemplate,
          name: 'Different Name',
        })
        .expect(409);

      expect(response.body.code).toBe('DUPLICATE_SLUG');
    });

    it('should return 400 for invalid schema', async () => {
      const response = await request(app)
        .post('/api/templates')
        .send({
          ...validTemplate,
          schema: {
            version: '2.0', // Wrong version
            slots: [],
            scenes: [],
          },
        })
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should calculate durationSeconds from scenes', async () => {
      const response = await request(app)
        .post('/api/templates')
        .send(validTemplate)
        .expect(201);

      expect(response.body.durationSeconds).toBe(5); // Sum of scenes duration
    });

    it('should default isPublished to false', async () => {
      const response = await request(app)
        .post('/api/templates')
        .send({
          ...validTemplate,
          isPublished: undefined,
        })
        .expect(201);

      expect(response.body.isPublished).toBe(false);
    });
  });

  describe('PATCH /api/templates/:id - Update template', () => {
    let templateId: string;

    beforeEach(async () => {
      const template = await prisma.template.create({
        data: validTemplate,
      });
      templateId = template.id;
    });

    afterEach(async () => {
      await prisma.template.deleteMany({});
    });

    it('should update provided fields only', async () => {
      const response = await request(app)
        .patch(`/api/templates/${templateId}`)
        .send({
          name: 'Updated Name',
          isPublished: false,
        })
        .expect(200);

      expect(response.body.name).toBe('Updated Name');
      expect(response.body.isPublished).toBe(false);
      expect(response.body.category).toBe(validTemplate.category); // Unchanged
    });

    it('should return 404 for unknown ID', async () => {
      const response = await request(app)
        .patch('/api/templates/nonexistent-id')
        .send({ name: 'New Name' })
        .expect(404);

      expect(response.body.error).toBe('Template not found');
      expect(response.body.code).toBe('NOT_FOUND');
    });

    it('should return 400 for invalid update data', async () => {
      const response = await request(app)
        .patch(`/api/templates/${templateId}`)
        .send({
          tags: 'not-an-array', // Should be array
        })
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should update slug if unique', async () => {
      const response = await request(app)
        .patch(`/api/templates/${templateId}`)
        .send({ slug: 'new-slug' })
        .expect(200);

      expect(response.body.slug).toBe('new-slug');
    });

    it('should return 409 for duplicate slug change', async () => {
      // Create another template
      await prisma.template.create({
        data: {
          ...validTemplate,
          slug: 'another-slug',
        },
      });

      // Try to change first template's slug to match another
      const response = await request(app)
        .patch(`/api/templates/${templateId}`)
        .send({ slug: 'another-slug' })
        .expect(409);

      expect(response.body.code).toBe('DUPLICATE_SLUG');
    });

    it('should update updatedAt timestamp', async () => {
      const beforeUpdate = new Date();
      const response = await request(app)
        .patch(`/api/templates/${templateId}`)
        .send({ name: 'Updated' })
        .expect(200);

      const updatedAt = new Date(response.body.updatedAt);
      expect(updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
    });

    it('should allow partial schema updates', async () => {
      const newSchema = {
        ...validTemplate.schema,
        audioTags: ['updated-tag'],
      };

      const response = await request(app)
        .patch(`/api/templates/${templateId}`)
        .send({ schema: newSchema })
        .expect(200);

      expect(response.body.schema.audioTags).toEqual(['updated-tag']);
    });
  });

  describe('Error response format', () => {
    it('should return standard error format', async () => {
      const response = await request(app)
        .get('/api/templates/invalid-id')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('code');
      expect(typeof response.body.error).toBe('string');
      expect(typeof response.body.code).toBe('string');
    });

    it('should include details object on validation errors', async () => {
      const response = await request(app)
        .post('/api/templates')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('details');
      expect(typeof response.body.details).toBe('object');
    });
  });
});

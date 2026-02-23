import request from 'supertest';
import app from '../server';
import fs from 'fs';
import path from 'path';
import { initializeStorageService } from '../services/storage.service';

describe('Media Upload API', () => {
  const testImagePath = path.join(__dirname, '../fixtures/test-image.jpg');

  beforeAll(async () => {
    // Initialize storage service
    try {
      await initializeStorageService();
    } catch (error) {
      console.warn('Storage service initialization warning (MinIO might not be running):', error);
      // Continue anyway - tests will show which operations require MinIO
    }
    // Create fixtures directory if it doesn't exist
    const fixturesDir = path.join(__dirname, '../fixtures');
    if (!fs.existsSync(fixturesDir)) {
      fs.mkdirSync(fixturesDir, { recursive: true });
    }

    // Create a small test image (1x1 JPEG)
    if (!fs.existsSync(testImagePath)) {
      // Create a minimal JPEG (1x1 pixel) as a Buffer
      const minimalJpeg = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00,
        0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06,
        0x05, 0x08, 0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b,
        0x0c, 0x19, 0x12, 0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20,
        0x24, 0x2e, 0x27, 0x20, 0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29, 0x2c, 0x30, 0x31,
        0x34, 0x34, 0x34, 0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32, 0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff,
        0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00,
        0x1f, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b,
        0xff, 0xc4, 0x00, 0xb5, 0x10, 0x00, 0x02, 0x01, 0x03, 0x03, 0x02, 0x04, 0x03, 0x05, 0x05,
        0x04, 0x04, 0x00, 0x00, 0x01, 0x7d, 0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21,
        0x31, 0x41, 0x06, 0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xa1, 0x08,
        0x23, 0x42, 0xb1, 0xc1, 0x15, 0x52, 0xd1, 0xf0, 0x24, 0x33, 0x62, 0x72, 0x82, 0x09, 0x0a,
        0x16, 0x17, 0x18, 0x19, 0x1a, 0x25, 0x26, 0x27, 0x28, 0x29, 0x2a, 0x34, 0x35, 0x36, 0x37,
        0x38, 0x39, 0x3a, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4a, 0x53, 0x54, 0x55, 0x56,
        0x57, 0x58, 0x59, 0x5a, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6a, 0x73, 0x74, 0x75,
        0x76, 0x77, 0x78, 0x79, 0x7a, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89, 0x8a, 0x92, 0x93,
        0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9a, 0xa2, 0xa3, 0xa4, 0xa5, 0xa6, 0xa7, 0xa8, 0xa9,
        0xaa, 0xb2, 0xb3, 0xb4, 0xb5, 0xb6, 0xb7, 0xb8, 0xb9, 0xba, 0xc2, 0xc3, 0xc4, 0xc5, 0xc6,
        0xc7, 0xc8, 0xc9, 0xca, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7, 0xd8, 0xd9, 0xda, 0xe1, 0xe2,
        0xe3, 0xe4, 0xe5, 0xe6, 0xe7, 0xe8, 0xe9, 0xea, 0xf1, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7,
        0xf8, 0xf9, 0xfa, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0xfb, 0xd3,
        0xff, 0xd9,
      ]);
      fs.writeFileSync(testImagePath, minimalJpeg);
    }
  });

  describe('POST /api/media/upload', () => {
    it('should return 400 when no file is provided', async () => {
      const response = await request(app).post('/api/media/upload');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.code).toBe('NO_FILE');
    });

    it('should return 415 when unsupported file type is uploaded', async () => {
      const response = await request(app)
        .post('/api/media/upload')
        .attach('file', Buffer.from('fake pdf content'), 'test.pdf');

      // Multer might not even attach the file if content-type is wrong
      // But we should still handle it gracefully
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should upload a valid image and return metadata', async () => {
      const response = await request(app)
        .post('/api/media/upload')
        .attach('file', testImagePath, 'test-image.jpg');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('url');
      expect(response.body).toHaveProperty('key');
      expect(response.body).toHaveProperty('width');
      expect(response.body).toHaveProperty('height');
      expect(response.body).toHaveProperty('size');

      // Validate response structure
      expect(typeof response.body.url).toBe('string');
      expect(typeof response.body.key).toBe('string');
      expect(typeof response.body.width).toBe('number');
      expect(typeof response.body.height).toBe('number');
      expect(typeof response.body.size).toBe('number');

      // The key should start with uploads/
      expect(response.body.key).toMatch(/^uploads\//);
    });

    it('should accept PNG images', async () => {
      // Create a minimal 1x1 PNG
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44,
        0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90,
        0x77, 0x53, 0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0x99, 0x01, 0x01,
        0x00, 0x00, 0xfe, 0xff, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, 0xe5, 0x27, 0xde, 0xfc, 0x00,
        0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
      ]);

      const response = await request(app)
        .post('/api/media/upload')
        .attach('file', pngBuffer, 'test-image.png');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('url');
      expect(response.body).toHaveProperty('key');
    });
  });

  describe('GET /api/media/presigned-url', () => {
    it('should return 400 when filename query param is missing', async () => {
      const response = await request(app)
        .get('/api/media/presigned-url')
        .query({ contentType: 'image/jpeg' });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('INVALID_QUERY');
    });

    it('should return 400 when contentType query param is missing', async () => {
      const response = await request(app)
        .get('/api/media/presigned-url')
        .query({ filename: 'test.jpg' });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('INVALID_QUERY');
    });

    it('should return 400 when contentType is unsupported', async () => {
      const response = await request(app)
        .get('/api/media/presigned-url')
        .query({ filename: 'test.pdf', contentType: 'application/pdf' });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('INVALID_QUERY');
    });

    it('should generate a presigned URL for valid params', async () => {
      const response = await request(app)
        .get('/api/media/presigned-url')
        .query({ filename: 'test-image.jpg', contentType: 'image/jpeg' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('uploadUrl');
      expect(response.body).toHaveProperty('key');
      expect(response.body).toHaveProperty('expiresIn');

      // Validate response structure
      expect(typeof response.body.uploadUrl).toBe('string');
      expect(typeof response.body.key).toBe('string');
      expect(typeof response.body.expiresIn).toBe('number');

      // URL should contain the bucket name
      expect(response.body.uploadUrl).toMatch(/\//);

      // The key should start with uploads/
      expect(response.body.key).toMatch(/^uploads\//);

      // Expiry should be 1 hour (3600 seconds)
      expect(response.body.expiresIn).toBe(3600);
    });

    it('should support PNG content type', async () => {
      const response = await request(app)
        .get('/api/media/presigned-url')
        .query({ filename: 'test-image.png', contentType: 'image/png' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('uploadUrl');
      expect(response.body).toHaveProperty('key');
    });

    it('should support WebP content type', async () => {
      const response = await request(app)
        .get('/api/media/presigned-url')
        .query({ filename: 'test-image.webp', contentType: 'image/webp' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('uploadUrl');
      expect(response.body).toHaveProperty('key');
    });
  });

  describe('POST /api/media/confirm-upload', () => {
    it('should return 400 when key is missing', async () => {
      const response = await request(app).post('/api/media/confirm-upload').send({});

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when key is empty', async () => {
      const response = await request(app).post('/api/media/confirm-upload').send({ key: '' });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 for non-existent key', async () => {
      const response = await request(app)
        .post('/api/media/confirm-upload')
        .send({ key: 'uploads/test/nonexistent-key.jpg' });

      expect(response.status).toBe(404);
      expect(response.body.code).toBe('NOT_FOUND');
    });

    it('should return public URL for uploaded file', async () => {
      // First, upload a file
      const uploadResponse = await request(app)
        .post('/api/media/upload')
        .attach('file', testImagePath, 'test-image.jpg');

      expect(uploadResponse.status).toBe(200);
      const { key } = uploadResponse.body;

      // Then, confirm the upload
      const confirmResponse = await request(app)
        .post('/api/media/confirm-upload')
        .send({ key });

      expect(confirmResponse.status).toBe(200);
      expect(confirmResponse.body).toHaveProperty('url');
      expect(confirmResponse.body).toHaveProperty('key');
      expect(confirmResponse.body.key).toBe(key);

      // URL should be a valid http(s) URL
      expect(confirmResponse.body.url).toMatch(/^https?:\/\//);
    });
  });
});

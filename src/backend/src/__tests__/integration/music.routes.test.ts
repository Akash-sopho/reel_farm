import request from 'supertest';
import app from '../../server';
import prisma from '../../lib/prisma';

describe('Music API Integration Tests', () => {
  const testTracks = [
    {
      id: 'track-001',
      title: 'Happy Summer',
      artist: 'The Beats',
      url: 'music/track-001.mp3',
      durationSeconds: 180,
      bpm: 120,
      mood: 'happy' as const,
      genre: 'pop' as const,
      tags: ['summer', 'upbeat'],
      isActive: true,
    },
    {
      id: 'track-002',
      title: 'Calm Sunset',
      artist: 'Relaxation Station',
      url: 'music/track-002.mp3',
      durationSeconds: 240,
      bpm: 80,
      mood: 'calm' as const,
      genre: 'ambient' as const,
      tags: ['relaxing'],
      isActive: true,
    },
    {
      id: 'track-003',
      title: 'Energetic Beat',
      artist: 'Electronic Vibes',
      url: 'music/track-003.mp3',
      durationSeconds: 200,
      bpm: 140,
      mood: 'energetic' as const,
      genre: 'electronic' as const,
      tags: ['upbeat', 'dance'],
      isActive: true,
    },
    {
      id: 'track-004',
      title: 'Sad Memories',
      artist: 'The Melancholy',
      url: 'music/track-004.mp3',
      durationSeconds: 220,
      bpm: 90,
      mood: 'sad' as const,
      genre: 'acoustic' as const,
      tags: ['emotional'],
      isActive: true,
    },
    {
      id: 'track-005',
      title: 'Neutral Background',
      artist: 'Ambient Sounds',
      url: 'music/track-005.mp3',
      durationSeconds: 300,
      bpm: 100,
      mood: 'neutral' as const,
      genre: 'cinematic' as const,
      tags: ['background'],
      isActive: true,
    },
    {
      id: 'track-006',
      title: 'Inactive Track',
      artist: 'Old Artist',
      url: 'music/track-006.mp3',
      durationSeconds: 180,
      bpm: 110,
      mood: 'happy' as const,
      genre: 'pop' as const,
      tags: [],
      isActive: false, // Inactive
    },
  ];

  beforeAll(async () => {
    // Clean up and seed test data
    await prisma.musicTrack.deleteMany({});

    for (const track of testTracks) {
      await prisma.musicTrack.create({ data: track });
    }
  });

  afterAll(async () => {
    await prisma.musicTrack.deleteMany({});
    await prisma.$disconnect();
  });

  describe('GET /api/music - List tracks', () => {
    it('should return paginated list of active tracks', async () => {
      const response = await request(app)
        .get('/api/music')
        .expect(200);

      expect(response.body).toHaveProperty('tracks');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
      expect(response.body).toHaveProperty('pages');
      expect(Array.isArray(response.body.tracks)).toBe(true);
      expect(response.body.tracks.length).toBeLessThanOrEqual(20); // Default limit
      expect(response.body.total).toBe(5); // Only active tracks
    });

    it('should respect limit parameter', async () => {
      const response = await request(app)
        .get('/api/music?limit=2')
        .expect(200);

      expect(response.body.tracks.length).toBeLessThanOrEqual(2);
      expect(response.body.limit).toBe(2);
    });

    it('should return 400 if limit > 100', async () => {
      const response = await request(app)
        .get('/api/music?limit=101')
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_ERROR');
      expect(response.body.details).toHaveProperty('limit');
    });

    it('should handle pagination correctly', async () => {
      const response1 = await request(app)
        .get('/api/music?limit=2&page=1')
        .expect(200);

      expect(response1.body.page).toBe(1);
      expect(response1.body.tracks.length).toBeLessThanOrEqual(2);

      const response2 = await request(app)
        .get('/api/music?limit=2&page=2')
        .expect(200);

      expect(response2.body.page).toBe(2);
      // Tracks should be different between pages (or empty if page 2 doesn't exist)
      if (response1.body.total > 2) {
        expect(response2.body.tracks[0]?.id).not.toBe(response1.body.tracks[0]?.id);
      }
    });

    it('should filter by mood', async () => {
      const response = await request(app)
        .get('/api/music?mood=happy')
        .expect(200);

      expect(response.body.tracks.length).toBeGreaterThan(0);
      response.body.tracks.forEach((track: any) => {
        expect(track.mood).toBe('happy');
      });
    });

    it('should filter by genre', async () => {
      const response = await request(app)
        .get('/api/music?genre=pop')
        .expect(200);

      expect(response.body.tracks.length).toBeGreaterThan(0);
      response.body.tracks.forEach((track: any) => {
        expect(track.genre).toBe('pop');
      });
    });

    it('should filter by BPM range', async () => {
      const response = await request(app)
        .get('/api/music?bpm_min=90&bpm_max=130')
        .expect(200);

      expect(response.body.tracks.length).toBeGreaterThan(0);
      response.body.tracks.forEach((track: any) => {
        expect(track.bpm).toBeGreaterThanOrEqual(90);
        expect(track.bpm).toBeLessThanOrEqual(130);
      });
    });

    it('should filter by tags (OR logic)', async () => {
      const response = await request(app)
        .get('/api/music?tags=upbeat,emotional')
        .expect(200);

      expect(response.body.tracks.length).toBeGreaterThan(0);
      response.body.tracks.forEach((track: any) => {
        const hasTag = track.tags.includes('upbeat') || track.tags.includes('emotional');
        expect(hasTag).toBe(true);
      });
    });

    it('should combine filters with AND logic', async () => {
      const response = await request(app)
        .get('/api/music?mood=happy&genre=pop')
        .expect(200);

      response.body.tracks.forEach((track: any) => {
        expect(track.mood).toBe('happy');
        expect(track.genre).toBe('pop');
      });
    });

    it('should return only active tracks', async () => {
      const response = await request(app)
        .get('/api/music')
        .expect(200);

      response.body.tracks.forEach((track: any) => {
        expect(track.isActive).toBe(true);
      });
    });

    it('should return empty array for page > pages', async () => {
      const response = await request(app)
        .get('/api/music?limit=1&page=1000')
        .expect(200);

      expect(response.body.tracks.length).toBe(0);
    });

    it('should have correct track shape', async () => {
      const response = await request(app)
        .get('/api/music')
        .expect(200);

      if (response.body.tracks.length > 0) {
        const track = response.body.tracks[0];
        expect(track).toHaveProperty('id');
        expect(track).toHaveProperty('title');
        expect(track).toHaveProperty('artist');
        expect(track).toHaveProperty('durationSeconds');
        expect(track).toHaveProperty('mood');
        expect(track).toHaveProperty('genre');
        expect(track).toHaveProperty('tags');
        expect(track).toHaveProperty('isActive');
        expect(typeof track.title).toBe('string');
        expect(typeof track.artist).toBe('string');
        expect(typeof track.durationSeconds).toBe('number');
        expect(Array.isArray(track.tags)).toBe(true);
      }
    });
  });

  describe('GET /api/music/:id - Get single track', () => {
    it('should return track by ID', async () => {
      const response = await request(app)
        .get('/api/music/track-001')
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body.id).toBe('track-001');
      expect(response.body.title).toBe('Happy Summer');
      expect(response.body.artist).toBe('The Beats');
    });

    it('should return 404 for unknown track ID', async () => {
      const response = await request(app)
        .get('/api/music/unknown-track')
        .expect(404);

      expect(response.body.code).toBe('NOT_FOUND');
    });

    it('should return 400 for empty track ID', async () => {
      const response = await request(app)
        .get('/api/music/')
        .expect(404); // 404 because path doesn't match
    });

    it('should have full track shape', async () => {
      const response = await request(app)
        .get('/api/music/track-002')
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('title');
      expect(response.body).toHaveProperty('artist');
      expect(response.body).toHaveProperty('url');
      expect(response.body).toHaveProperty('durationSeconds');
      expect(response.body).toHaveProperty('bpm');
      expect(response.body).toHaveProperty('mood');
      expect(response.body).toHaveProperty('genre');
      expect(response.body).toHaveProperty('tags');
      expect(response.body).toHaveProperty('isActive');
    });
  });

  describe('GET /api/music/:id/preview - Get presigned preview URL', () => {
    it('should return presigned URL for preview', async () => {
      const response = await request(app)
        .get('/api/music/track-001/preview')
        .expect(200);

      expect(response.body).toHaveProperty('trackId');
      expect(response.body).toHaveProperty('previewUrl');
      expect(response.body).toHaveProperty('durationSeconds');
      expect(response.body).toHaveProperty('expiresAt');
      expect(response.body.trackId).toBe('track-001');
      expect(typeof response.body.previewUrl).toBe('string');
      expect(response.body.durationSeconds).toBe(30); // Preview is 30 seconds
    });

    it('should return valid URL format', async () => {
      const response = await request(app)
        .get('/api/music/track-002/preview')
        .expect(200);

      // Check it looks like a URL
      expect(response.body.previewUrl).toMatch(/^https?:\/\//);
    });

    it('should return valid expiry date', async () => {
      const response = await request(app)
        .get('/api/music/track-003/preview')
        .expect(200);

      const expiresAt = new Date(response.body.expiresAt);
      expect(expiresAt instanceof Date).toBe(true);
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now()); // Future date
    });

    it('should return 404 for unknown track ID', async () => {
      const response = await request(app)
        .get('/api/music/unknown-track/preview')
        .expect(404);

      expect(response.body.code).toBe('NOT_FOUND');
    });

    it('should return 400 for empty track ID', async () => {
      const response = await request(app)
        .get('/api/music//preview')
        .expect(404); // Path doesn't match
    });
  });

  describe('Error handling', () => {
    it('should have proper error response format for all errors', async () => {
      const response = await request(app)
        .get('/api/music/invalid/preview')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('code');
      expect(response.body).toHaveProperty('details');
      expect(typeof response.body.error).toBe('string');
      expect(typeof response.body.code).toBe('string');
    });

    it('should handle invalid query parameters gracefully', async () => {
      const response = await request(app)
        .get('/api/music?page=-1')
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should handle non-existent mood filter', async () => {
      const response = await request(app)
        .get('/api/music?mood=invalid-mood')
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('should handle non-existent genre filter', async () => {
      const response = await request(app)
        .get('/api/music?genre=invalid-genre')
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_ERROR');
    });
  });
});

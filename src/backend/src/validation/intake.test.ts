import {
  isValidIntakeUrl,
  detectPlatform,
  FetchUrlsSchema,
  CollectionsQuerySchema,
  UpdateCollectedVideoSchema,
} from './intake';

describe('URL Validation (intake.ts)', () => {
  describe('isValidIntakeUrl', () => {
    describe('Instagram URLs', () => {
      it('should accept Instagram reel URLs', () => {
        expect(isValidIntakeUrl('https://www.instagram.com/reel/ABC123def/')).toBe(true);
        expect(isValidIntakeUrl('https://instagram.com/reel/XYZ789xyz/')).toBe(true);
        expect(isValidIntakeUrl('http://www.instagram.com/reel/test123/')).toBe(true);
      });

      it('should accept Instagram post URLs', () => {
        expect(isValidIntakeUrl('https://www.instagram.com/p/ABC123def/')).toBe(true);
        expect(isValidIntakeUrl('https://instagram.com/p/XYZ789xyz/')).toBe(true);
      });

      it('should accept URLs with hyphens and underscores in ID', () => {
        expect(isValidIntakeUrl('https://www.instagram.com/reel/ABC-123_def/')).toBe(true);
      });

      it('should reject Instagram profile URLs', () => {
        expect(isValidIntakeUrl('https://www.instagram.com/username/')).toBe(false);
      });

      it('should reject Instagram explore URLs', () => {
        expect(isValidIntakeUrl('https://www.instagram.com/explore/')).toBe(false);
      });
    });

    describe('TikTok URLs', () => {
      it('should accept TikTok video URLs', () => {
        expect(isValidIntakeUrl('https://www.tiktok.com/@username/video/1234567890/')).toBe(true);
        expect(isValidIntakeUrl('https://tiktok.com/@user_name/video/9876543210/')).toBe(true);
        expect(isValidIntakeUrl('https://m.tiktok.com/@username/video/1234567890/')).toBe(true);
      });

      it('should accept TikTok short URLs', () => {
        expect(isValidIntakeUrl('https://vm.tiktok.com/abc123def/')).toBe(true);
        expect(isValidIntakeUrl('https://vt.tiktok.com/xyz789xyz/')).toBe(true);
        expect(isValidIntakeUrl('http://vm.tiktok.com/test123/')).toBe(true);
      });

      it('should accept TikTok URLs with dots and hyphens in username', () => {
        expect(isValidIntakeUrl('https://www.tiktok.com/@user.name/video/1234567890/')).toBe(true);
        expect(isValidIntakeUrl('https://www.tiktok.com/@user-name/video/1234567890/')).toBe(true);
      });

      it('should reject TikTok profile URLs', () => {
        expect(isValidIntakeUrl('https://www.tiktok.com/@username')).toBe(false);
      });
    });

    describe('Invalid URLs', () => {
      it('should reject YouTube URLs', () => {
        expect(isValidIntakeUrl('https://www.youtube.com/watch?v=abc123')).toBe(false);
      });

      it('should reject Twitter/X URLs', () => {
        expect(isValidIntakeUrl('https://twitter.com/user/status/123')).toBe(false);
      });

      it('should reject non-URL strings', () => {
        expect(isValidIntakeUrl('not-a-url')).toBe(false);
      });

      it('should reject empty strings', () => {
        expect(isValidIntakeUrl('')).toBe(false);
      });

      it('should reject URLs without protocol', () => {
        expect(isValidIntakeUrl('www.instagram.com/reel/abc123/')).toBe(false);
      });
    });
  });

  describe('detectPlatform', () => {
    it('should detect Instagram platform', () => {
      expect(detectPlatform('https://www.instagram.com/reel/ABC123/')).toBe('instagram');
      expect(detectPlatform('https://instagram.com/p/XYZ789/')).toBe('instagram');
    });

    it('should detect TikTok platform', () => {
      expect(detectPlatform('https://www.tiktok.com/@user/video/123/')).toBe('tiktok');
      expect(detectPlatform('https://vm.tiktok.com/abc123/')).toBe('tiktok');
      expect(detectPlatform('https://vt.tiktok.com/xyz789/')).toBe('tiktok');
    });

    it('should return null for invalid URLs', () => {
      expect(detectPlatform('https://www.youtube.com/watch?v=abc')).toBe(null);
      expect(detectPlatform('not-a-url')).toBe(null);
    });
  });

  describe('FetchUrlsSchema', () => {
    it('should accept valid request with Instagram URL', () => {
      const result = FetchUrlsSchema.parse({
        urls: ['https://www.instagram.com/reel/ABC123/'],
      });
      expect(result.urls.length).toBe(1);
    });

    it('should accept valid request with TikTok URL', () => {
      const result = FetchUrlsSchema.parse({
        urls: ['https://www.tiktok.com/@user/video/123/'],
      });
      expect(result.urls.length).toBe(1);
    });

    it('should accept request with multiple valid URLs', () => {
      const result = FetchUrlsSchema.parse({
        urls: [
          'https://www.instagram.com/reel/ABC123/',
          'https://vm.tiktok.com/xyz789/',
          'https://www.tiktok.com/@user/video/456/',
        ],
      });
      expect(result.urls.length).toBe(3);
    });

    it('should reject empty array', () => {
      expect(() => {
        FetchUrlsSchema.parse({ urls: [] });
      }).toThrow();
    });

    it('should reject array with more than 20 URLs', () => {
      const urls = Array.from({ length: 21 }, (_, i) =>
        i % 2 === 0 ? `https://www.instagram.com/reel/ABC${i}/` : `https://vm.tiktok.com/xyz${i}/`
      );
      expect(() => {
        FetchUrlsSchema.parse({ urls });
      }).toThrow();
    });

    it('should accept exactly 20 URLs', () => {
      const urls = Array.from({ length: 20 }, (_, i) =>
        i % 2 === 0 ? `https://www.instagram.com/reel/ABC${i}/` : `https://vm.tiktok.com/xyz${i}/`
      );
      const result = FetchUrlsSchema.parse({ urls });
      expect(result.urls.length).toBe(20);
    });

    it('should reject invalid URLs in batch', () => {
      expect(() => {
        FetchUrlsSchema.parse({
          urls: [
            'https://www.instagram.com/reel/ABC123/',
            'https://www.youtube.com/watch?v=invalid',
          ],
        });
      }).toThrow();
    });

    it('should reject non-URL strings', () => {
      expect(() => {
        FetchUrlsSchema.parse({
          urls: ['not-a-url'],
        });
      }).toThrow();
    });

    it('should reject missing urls field', () => {
      expect(() => {
        FetchUrlsSchema.parse({});
      }).toThrow();
    });
  });

  describe('CollectionsQuerySchema', () => {
    it('should accept minimal query params with defaults', () => {
      const result = CollectionsQuerySchema.parse({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should accept page and limit', () => {
      const result = CollectionsQuerySchema.parse({
        page: 2,
        limit: 10,
      });
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
    });

    it('should accept status filter', () => {
      const result = CollectionsQuerySchema.parse({
        status: 'READY',
      });
      expect(result.status).toBe('READY');
    });

    it('should accept platform filter', () => {
      const result = CollectionsQuerySchema.parse({
        platform: 'instagram',
      });
      expect(result.platform).toBe('instagram');
    });

    it('should accept tag filter as string', () => {
      const result = CollectionsQuerySchema.parse({
        tag: 'dance',
      });
      expect(result.tag).toBe('dance');
    });

    it('should accept tag filter as array', () => {
      const result = CollectionsQuerySchema.parse({
        tag: ['dance', 'music'],
      });
      expect(Array.isArray(result.tag)).toBe(true);
      expect(result.tag).toEqual(['dance', 'music']);
    });

    it('should coerce string page to number', () => {
      const result = CollectionsQuerySchema.parse({
        page: '2',
        limit: '10',
      });
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(typeof result.page).toBe('number');
    });

    it('should reject page < 1', () => {
      expect(() => {
        CollectionsQuerySchema.parse({ page: 0 });
      }).toThrow();
    });

    it('should reject limit > 100', () => {
      expect(() => {
        CollectionsQuerySchema.parse({ limit: 101 });
      }).toThrow();
    });

    it('should reject limit < 1', () => {
      expect(() => {
        CollectionsQuerySchema.parse({ limit: 0 });
      }).toThrow();
    });

    it('should reject invalid status', () => {
      expect(() => {
        CollectionsQuerySchema.parse({ status: 'INVALID' });
      }).toThrow();
    });

    it('should reject invalid platform', () => {
      expect(() => {
        CollectionsQuerySchema.parse({ platform: 'youtube' });
      }).toThrow();
    });
  });

  describe('UpdateCollectedVideoSchema', () => {
    it('should accept tags update', () => {
      const result = UpdateCollectedVideoSchema.parse({
        tags: ['dance', 'music'],
      });
      expect(result.tags).toEqual(['dance', 'music']);
    });

    it('should accept caption update', () => {
      const result = UpdateCollectedVideoSchema.parse({
        caption: 'Updated caption',
      });
      expect(result.caption).toBe('Updated caption');
    });

    it('should accept both tags and caption', () => {
      const result = UpdateCollectedVideoSchema.parse({
        tags: ['new'],
        caption: 'New caption',
      });
      expect(result.tags).toEqual(['new']);
      expect(result.caption).toBe('New caption');
    });

    it('should reject empty object', () => {
      const result = UpdateCollectedVideoSchema.parse({});
      expect(Object.keys(result).length).toBe(0);
    });

    it('should allow undefined tags', () => {
      const result = UpdateCollectedVideoSchema.parse({
        caption: 'Caption only',
      });
      expect(result.tags).toBeUndefined();
      expect(result.caption).toBe('Caption only');
    });

    it('should allow undefined caption', () => {
      const result = UpdateCollectedVideoSchema.parse({
        tags: ['tag'],
      });
      expect(result.tags).toEqual(['tag']);
      expect(result.caption).toBeUndefined();
    });

    it('should reject tags with more than 30 characters', () => {
      expect(() => {
        UpdateCollectedVideoSchema.parse({
          tags: ['a'.repeat(31)],
        });
      }).toThrow();
    });

    it('should accept tags with exactly 30 characters', () => {
      const result = UpdateCollectedVideoSchema.parse({
        tags: ['a'.repeat(30)],
      });
      expect(result.tags[0].length).toBe(30);
    });

    it('should reject more than 20 tags', () => {
      expect(() => {
        UpdateCollectedVideoSchema.parse({
          tags: Array.from({ length: 21 }, (_, i) => `tag${i}`),
        });
      }).toThrow();
    });

    it('should accept exactly 20 tags', () => {
      const result = UpdateCollectedVideoSchema.parse({
        tags: Array.from({ length: 20 }, (_, i) => `tag${i}`),
      });
      expect(result.tags?.length).toBe(20);
    });

    it('should reject caption longer than 500 characters', () => {
      expect(() => {
        UpdateCollectedVideoSchema.parse({
          caption: 'a'.repeat(501),
        });
      }).toThrow();
    });

    it('should accept caption with exactly 500 characters', () => {
      const result = UpdateCollectedVideoSchema.parse({
        caption: 'a'.repeat(500),
      });
      expect(result.caption?.length).toBe(500);
    });
  });
});

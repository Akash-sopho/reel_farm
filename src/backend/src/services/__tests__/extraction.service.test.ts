import { extractTemplate, ExtractionError } from '../extraction.service';
import prisma from '../../lib/prisma';
import OpenAI from 'openai';

// Mock OpenAI
jest.mock('openai');
jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    template: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    collectedVideo: {
      findUnique: jest.fn(),
    },
  },
}));

describe('ExtractionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('extractTemplate()', () => {
    const templateId = 'template-123';
    const videoId = 'video-456';

    const mockVideoAnalysis = {
      videoId,
      durationSeconds: 15,
      fps: 30,
      resolution: { width: 1080, height: 1920 },
      sceneCount: 3,
      analysisStartedAt: '2026-02-24T10:00:00Z',
      analysisCompletedAt: '2026-02-24T10:05:00Z',
      ffmpegVersion: '6.0',
      gpt4oModel: 'gpt-4o',
      scenes: [
        {
          sceneIndex: 0,
          frameNumber: 0,
          timestamp: 0,
          durationEstimate: 5,
          frameUrl: 'https://example.com/frame-0.jpg',
          backgroundType: 'image',
          dominantColors: ['#FF6B6B', '#FFE66D', '#95E1D3'],
          brightness: 0.8,
          contrast: 0.7,
          detectedText: [
            {
              text: 'Summer Vibes',
              position: { x: 0.5, y: 0.2 },
              fontSize: 'large',
              fontWeight: 'bold',
              color: '#FFFFFF',
              alignment: 'center',
              confidence: 0.95,
            },
          ],
          animationCues: ['fade-in'],
          confidenceScore: 0.9,
        },
        {
          sceneIndex: 1,
          frameNumber: 5,
          timestamp: 5,
          durationEstimate: 5,
          frameUrl: 'https://example.com/frame-5.jpg',
          backgroundType: 'image',
          dominantColors: ['#4ECDC4', '#44A08D'],
          brightness: 0.75,
          contrast: 0.6,
          detectedText: [],
          animationCues: [],
          confidenceScore: 0.8,
        },
        {
          sceneIndex: 2,
          frameNumber: 10,
          timestamp: 10,
          durationEstimate: 5,
          frameUrl: 'https://example.com/frame-10.jpg',
          backgroundType: 'video',
          dominantColors: ['#F38181', '#AA96DA'],
          brightness: 0.7,
          contrast: 0.65,
          detectedText: [
            {
              text: 'Subscribe!',
              position: { x: 0.5, y: 0.85 },
              fontSize: 'medium',
              fontWeight: 'normal',
              color: '#FFFFFF',
              alignment: 'center',
              confidence: 0.92,
            },
          ],
          animationCues: ['slide-up'],
          confidenceScore: 0.88,
        },
      ],
    };

    const mockTemplateSchema = {
      version: '1.0',
      slots: [
        {
          id: 'main-image',
          type: 'image',
          label: 'Main Background',
          required: true,
          constraints: { minWidth: 1080, minHeight: 1920 },
        },
        {
          id: 'title-text',
          type: 'text',
          label: 'Title',
          required: false,
          placeholder: 'Enter title',
          constraints: { maxLength: 50 },
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
              slotBindings: { image: 'main-image' },
              props: { opacity: 1 },
            },
          ],
        },
        {
          id: 'scene-2',
          durationSeconds: 5,
          components: [
            {
              componentId: 'KenBurnsImage',
              zIndex: 0,
              slotBindings: { image: 'main-image' },
              props: { speed: 0.5 },
            },
          ],
        },
        {
          id: 'scene-3',
          durationSeconds: 5,
          components: [
            {
              componentId: 'AnimatedText',
              zIndex: 1,
              slotBindings: { text: 'title-text' },
              props: { animation: 'fade-in' },
            },
          ],
        },
      ],
      transitions: ['fade'],
    };

    it('should successfully extract template with quality score', async () => {
      const mockPrisma = prisma as jest.Mocked<typeof prisma>;
      const mockOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;

      // Mock template fetching
      mockPrisma.template.findUnique.mockResolvedValueOnce({ id: templateId });

      // Mock template update with successful extraction
      mockPrisma.template.update.mockResolvedValueOnce({
        id: templateId,
        schema: mockTemplateSchema,
        extractionStatus: 'COMPLETED',
        extractionQuality: { score: 0.85, issues: [] },
      });

      // Mock OpenAI response with valid schema
      const mockOpenAIInstance = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValueOnce({
              choices: [
                {
                  message: {
                    content: JSON.stringify(mockTemplateSchema),
                  },
                },
              ],
            }),
          },
        },
      };
      mockOpenAI.mockImplementationOnce(() => mockOpenAIInstance as any);

      const result = await extractTemplate(templateId, mockVideoAnalysis);

      expect(result).toBeDefined();
      expect(result.version).toBe('1.0');
      expect(result.scenes.length).toBe(3);
      expect(result.slots.length).toBe(2);

      // Verify database was updated
      expect(mockPrisma.template.update).toHaveBeenCalledWith({
        where: { id: templateId },
        data: expect.objectContaining({
          schema: mockTemplateSchema,
          extractionStatus: 'COMPLETED',
          extractionError: null,
        }),
      });
    });

    it('should handle GPT-4o response with markdown wrapping', async () => {
      const mockPrisma = prisma as jest.Mocked<typeof prisma>;
      const mockOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;

      mockPrisma.template.findUnique.mockResolvedValueOnce({ id: templateId });
      mockPrisma.template.update.mockResolvedValueOnce({
        id: templateId,
        schema: mockTemplateSchema,
        extractionStatus: 'COMPLETED',
      });

      // Mock OpenAI response with markdown wrapping
      const mockOpenAIInstance = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValueOnce({
              choices: [
                {
                  message: {
                    content: `\`\`\`json\n${JSON.stringify(mockTemplateSchema)}\n\`\`\``,
                  },
                },
              ],
            }),
          },
        },
      };
      mockOpenAI.mockImplementationOnce(() => mockOpenAIInstance as any);

      const result = await extractTemplate(templateId, mockVideoAnalysis);

      expect(result).toBeDefined();
      expect(result.version).toBe('1.0');
    });

    it('should throw TEMPLATE_NOT_FOUND error if template does not exist', async () => {
      const mockPrisma = prisma as jest.Mocked<typeof prisma>;

      mockPrisma.template.findUnique.mockResolvedValueOnce(null);

      await expect(extractTemplate(templateId, mockVideoAnalysis)).rejects.toThrow(
        ExtractionError
      );

      await expect(extractTemplate(templateId, mockVideoAnalysis)).rejects.toMatchObject({
        code: 'TEMPLATE_NOT_FOUND',
      });
    });

    it('should handle schema validation failure', async () => {
      const mockPrisma = prisma as jest.Mocked<typeof prisma>;
      const mockOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;

      mockPrisma.template.findUnique.mockResolvedValueOnce({ id: templateId });

      // Mock OpenAI response with invalid schema (missing required fields)
      const invalidSchema = { version: '1.0', slots: 'invalid' };
      const mockOpenAIInstance = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValueOnce({
              choices: [
                {
                  message: {
                    content: JSON.stringify(invalidSchema),
                  },
                },
              ],
            }),
          },
        },
      };
      mockOpenAI.mockImplementationOnce(() => mockOpenAIInstance as any);

      await expect(extractTemplate(templateId, mockVideoAnalysis)).rejects.toThrow(
        ExtractionError
      );

      await expect(extractTemplate(templateId, mockVideoAnalysis)).rejects.toMatchObject({
        code: 'SCHEMA_VALIDATION_ERROR',
      });
    });

    it('should handle malformed JSON response from GPT-4o', async () => {
      const mockPrisma = prisma as jest.Mocked<typeof prisma>;
      const mockOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;

      mockPrisma.template.findUnique.mockResolvedValueOnce({ id: templateId });

      // Mock OpenAI response with invalid JSON
      const mockOpenAIInstance = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValueOnce({
              choices: [
                {
                  message: {
                    content: 'This is not valid JSON at all {',
                  },
                },
              ],
            }),
          },
        },
      };
      mockOpenAI.mockImplementationOnce(() => mockOpenAIInstance as any);

      await expect(extractTemplate(templateId, mockVideoAnalysis)).rejects.toThrow(
        ExtractionError
      );

      await expect(extractTemplate(templateId, mockVideoAnalysis)).rejects.toMatchObject({
        code: 'SCHEMA_PARSE_ERROR',
      });
    });

    it('should store quality score in database', async () => {
      const mockPrisma = prisma as jest.Mocked<typeof prisma>;
      const mockOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;

      mockPrisma.template.findUnique.mockResolvedValueOnce({ id: templateId });
      mockPrisma.template.update.mockResolvedValueOnce({
        id: templateId,
        extractionStatus: 'COMPLETED',
        extractionQuality: { score: 0.8, issues: ['Scene count mismatch'] },
      });

      const mockOpenAIInstance = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValueOnce({
              choices: [
                {
                  message: {
                    content: JSON.stringify(mockTemplateSchema),
                  },
                },
              ],
            }),
          },
        },
      };
      mockOpenAI.mockImplementationOnce(() => mockOpenAIInstance as any);

      await extractTemplate(templateId, mockVideoAnalysis);

      const updateCall = (mockPrisma.template.update as jest.Mock).mock.calls[1];
      expect(updateCall[0].data).toHaveProperty('extractionQuality');
      expect(updateCall[0].data.extractionQuality).toHaveProperty('score');
      expect(updateCall[0].data.extractionQuality).toHaveProperty('issues');
    });

    it('should compute quality score for template with all requirements met', async () => {
      const mockPrisma = prisma as jest.Mocked<typeof prisma>;
      const mockOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;

      mockPrisma.template.findUnique.mockResolvedValueOnce({ id: templateId });

      // High-quality response: correct scene count, has text slots, has image slots
      const highQualitySchema = {
        version: '1.0',
        slots: [
          { id: 'img-1', type: 'image', label: 'Image 1', required: true },
          { id: 'txt-1', type: 'text', label: 'Text 1', required: false },
          { id: 'txt-2', type: 'text', label: 'Text 2', required: false },
        ],
        scenes: [
          { id: 's1', durationSeconds: 5, components: [] },
          { id: 's2', durationSeconds: 5, components: [] },
          { id: 's3', durationSeconds: 5, components: [] },
        ],
        transitions: ['fade'],
      };

      mockPrisma.template.update.mockResolvedValueOnce({
        id: templateId,
        extractionStatus: 'COMPLETED',
        extractionQuality: { score: 0.95, issues: [] },
      });

      const mockOpenAIInstance = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValueOnce({
              choices: [
                {
                  message: {
                    content: JSON.stringify(highQualitySchema),
                  },
                },
              ],
            }),
          },
        },
      };
      mockOpenAI.mockImplementationOnce(() => mockOpenAIInstance as any);

      await extractTemplate(templateId, mockVideoAnalysis);

      const updateCall = (mockPrisma.template.update as jest.Mock).mock.calls[1];
      const qualityScore = updateCall[0].data.extractionQuality.score;

      expect(qualityScore).toBeGreaterThanOrEqual(0.8);
      expect(qualityScore).toBeLessThanOrEqual(1.0);
    });
  });
});

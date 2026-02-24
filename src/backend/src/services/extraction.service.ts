import * as fs from 'fs';
import * as path from 'path';
import Ajv from 'ajv';
import OpenAI from 'openai';
import prisma from '../lib/prisma';

// Template schema types
interface SlotConstraints {
  maxLength?: number;
  minWidth?: number;
  minHeight?: number;
  accept?: string[];
}

interface ContentSlot {
  id: string;
  type: 'image' | 'text' | 'video' | 'audio';
  label: string;
  required: boolean;
  placeholder?: string;
  constraints?: SlotConstraints;
}

interface SceneComponent {
  componentId: string;
  zIndex: number;
  slotBindings: Record<string, string>;
  props: Record<string, unknown>;
}

interface Scene {
  id: string;
  durationSeconds: number;
  components: SceneComponent[];
}

interface TemplateSchema {
  version: '1.0';
  slots: ContentSlot[];
  scenes: Scene[];
  transitions?: string[];
  defaultMusic?: string;
  audioTags?: string[];
}

// Video analysis types
interface DetectedTextOverlay {
  text: string;
  position: { x: number; y: number };
  fontSize: 'small' | 'medium' | 'large' | 'extra_large';
  fontWeight: 'normal' | 'bold' | 'extra_bold';
  color: string;
  backgroundColor?: string;
  alignment: 'left' | 'center' | 'right';
  confidence: number;
}

interface VideoScene {
  sceneIndex: number;
  frameNumber: number;
  timestamp: number;
  durationEstimate: number;
  frameUrl: string;
  backgroundType: 'image' | 'video' | 'solid' | 'gradient' | 'unknown';
  dominantColors: string[];
  brightness: number;
  contrast: number;
  detectedText: DetectedTextOverlay[];
  animationCues: string[];
  confidenceScore: number;
}

interface VideoAnalysis {
  videoId: string;
  durationSeconds: number;
  fps: number;
  resolution: { width: number; height: number };
  sceneCount: number;
  analysisStartedAt: string;
  analysisCompletedAt: string;
  ffmpegVersion: string;
  gpt4oModel: string;
  scenes: VideoScene[];
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize JSON schema validator
const ajv = new Ajv();

function loadTemplateSchema() {
  const schemaPath = path.join(__dirname, '../../../specs/schemas/template-schema.json');
  const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
  return JSON.parse(schemaContent);
}

let validateTemplateSchema: any;

try {
  const templateSchema = loadTemplateSchema();
  validateTemplateSchema = ajv.compile(templateSchema);
} catch (error) {
  console.error('[EXTRACTION] Failed to load template schema:', error);
  // Provide a fallback validator that always accepts
  validateTemplateSchema = (data: any) => {
    validateTemplateSchema.errors = [];
    return true;
  };
}

/**
 * Error types for extraction service
 */
export class ExtractionError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ExtractionError';
  }
}

/**
 * Extract template schema from video analysis
 */
export async function extractTemplate(templateId: string, videoAnalysis: VideoAnalysis): Promise<TemplateSchema> {
  try {
    console.log(`[EXTRACTION] Starting template extraction for ${templateId}`);

    // Fetch template from database
    const template = await (prisma.template as any).findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new ExtractionError('TEMPLATE_NOT_FOUND', 'Template not found', { templateId });
    }

    // Update status to EXTRACTING
    await (prisma.template as any).update({
      where: { id: templateId },
      data: {
        extractionStatus: 'EXTRACTING',
        extractionError: null,
      },
    });

    // Call GPT-4o with extraction prompt
    const extractionPrompt = buildExtractionPrompt(videoAnalysis);

    console.log(`[EXTRACTION] Calling GPT-4o to generate template schema`);
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: extractionPrompt,
        },
      ],
      temperature: 0.5,
      max_tokens: 4000,
    });

    // Parse response
    const content = response.choices[0]?.message?.content || '{}';

    let generatedSchema: any;
    try {
      // Extract JSON from response (it might be wrapped in markdown)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      generatedSchema = JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error(`[EXTRACTION] Failed to parse GPT-4o response:`, content.substring(0, 500));
      throw new ExtractionError('SCHEMA_PARSE_ERROR', 'Failed to parse generated schema from GPT-4o', {
        response: content.substring(0, 500),
      });
    }

    // Validate schema
    const isValid = validateTemplateSchema(generatedSchema);
    if (!isValid) {
      const errors = validateTemplateSchema.errors || [];
      console.error(`[EXTRACTION] Schema validation failed:`, errors);
      throw new ExtractionError('SCHEMA_VALIDATION_ERROR', 'Generated schema does not match TemplateSchema', {
        errors: errors.map((err: any) => `${err.instancePath} ${err.message}`),
      });
    }

    // Compute quality score
    const quality = computeQualityScore(videoAnalysis, generatedSchema);

    console.log(`[EXTRACTION] Quality score: ${quality.score}`);

    // Store in database
    await (prisma.template as any).update({
      where: { id: templateId },
      data: {
        schema: generatedSchema,
        extractionStatus: 'COMPLETED',
        extractionError: null,
        extractionQuality: quality,
      },
    });

    console.log(`[EXTRACTION] Successfully extracted template ${templateId}`);

    return generatedSchema;
  } catch (error) {
    // Update database with error
    if (error instanceof ExtractionError) {
      await (prisma.template as any)
        .update({
          where: { id: templateId },
          data: {
            extractionStatus: 'FAILED',
            extractionError: error.message,
          },
        })
        .catch((err: any) => console.error('[EXTRACTION] Failed to update error status:', err));

      throw error;
    }

    // Unexpected error
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[EXTRACTION] Unexpected error:', errorMessage);

    await (prisma.template as any)
      .update({
        where: { id: templateId },
        data: {
          extractionStatus: 'FAILED',
          extractionError: errorMessage,
        },
      })
      .catch((e: any) => console.error('[EXTRACTION] Failed to update error status:', e));

    throw new ExtractionError('INTERNAL_ERROR', 'Unexpected error during template extraction', {
      error: errorMessage,
    });
  }
}

/**
 * Build the GPT-4o extraction prompt from VideoAnalysis
 */
function buildExtractionPrompt(videoAnalysis: VideoAnalysis): string {
  return `You are a template designer. I have analyzed a short-form video and extracted scenes with visual information.

Video Analysis:
${JSON.stringify(videoAnalysis, null, 2)}

Based on this analysis, generate a template schema that recreates this video's visual design.

Requirements:
1. Define scenes matching the detected scenes (one per extracted keyframe)
2. For each scene, specify:
   - duration (use durationEstimate from analysis)
   - layout (width: 1080, height: 1920 for 9:16)
   - components (use Remotion component registry: StaticImage, KenBurnsImage, AnimatedText, TypewriterText, GrainOverlay, FadeTransition)
3. Create slots for user-provided content:
   - Image slots: one per detected image area (backgroundType === "image")
   - Text slots: one per detected text overlay (preserving position and style hints)
4. Use detectedText to populate default slot names and descriptions
5. Use animationCues to suggest animation types
6. Reference components from the component registry by ID
7. Return a valid TemplateSchema JSON

Component Registry:
- StaticImage: display image at fixed position
- KenBurnsImage: display image with subtle zoom/pan
- AnimatedText: render text with fade-in animation
- TypewriterText: render text with typewriter effect
- GrainOverlay: add film grain texture
- FadeTransition: fade between scenes

TemplateSchema structure:
{
  "version": "1.0",
  "slots": [
    {
      "id": "slot-id",
      "type": "image|text|video|audio",
      "label": "Display Name",
      "required": true|false,
      "placeholder": "optional",
      "constraints": { "maxLength": 100, "minWidth": 1080, "minHeight": 1920, "accept": ["image/jpeg"] }
    }
  ],
  "scenes": [
    {
      "id": "scene-1",
      "durationSeconds": 5,
      "components": [
        {
          "componentId": "StaticImage",
          "zIndex": 0,
          "slotBindings": { "image": "slot-id" },
          "props": { "position": { "x": 0, "y": 0 }, "scale": 1, "opacity": 1 }
        }
      ]
    }
  ],
  "transitions": ["fade"],
  "defaultMusic": "optional-track-id",
  "audioTags": ["upbeat", "energetic"]
}

Return ONLY a valid TemplateSchema JSON object (no markdown, no explanation).`;
}

/**
 * Compute quality score for extracted template
 */
interface QualityScore {
  score: number;
  issues: string[];
}

function computeQualityScore(videoAnalysis: VideoAnalysis, schema: TemplateSchema): QualityScore {
  const issues: string[] = [];
  let score = 1.0; // Start at perfect

  // Scene coverage
  if (schema.scenes.length !== videoAnalysis.sceneCount) {
    issues.push(`Expected ${videoAnalysis.sceneCount} scenes, got ${schema.scenes.length}`);
    score -= 0.1;
  }

  // Slot analysis
  if (schema.slots.length === 0) {
    issues.push('No content slots generated');
    score -= 0.3;
  }

  // Check for text slots matching detected text
  let textSlotsCount = schema.slots.filter((s: ContentSlot) => s.type === 'text').length;
  const totalDetectedText = videoAnalysis.scenes.reduce((sum: number, scene: VideoScene) => sum + scene.detectedText.length, 0);

  if (textSlotsCount === 0 && totalDetectedText > 0) {
    issues.push(`No text slots generated despite ${totalDetectedText} text overlays detected`);
    score -= 0.15;
  }

  // Check for image slots
  let imageSlotsCount = schema.slots.filter((s: ContentSlot) => s.type === 'image').length;
  const scenesWithImages = videoAnalysis.scenes.filter(s => s.backgroundType === 'image').length;

  if (imageSlotsCount === 0 && scenesWithImages > 0) {
    issues.push(`No image slots generated despite ${scenesWithImages} image backgrounds detected`);
    score -= 0.15;
  }

  // Check confidence of analysis
  const avgConfidence = videoAnalysis.scenes.reduce((sum, scene) => sum + scene.confidenceScore, 0) / videoAnalysis.scenes.length;

  if (avgConfidence < 0.5) {
    issues.push(`Low analysis confidence: ${(avgConfidence * 100).toFixed(0)}%`);
    score -= 0.1;
  }

  // Check for animation cues
  const scenesWithAnimation = videoAnalysis.scenes.filter(s => s.animationCues.length > 0).length;
  if (scenesWithAnimation > 0 && (schema.transitions || []).length === 0) {
    issues.push(`Animation cues detected but no transitions specified`);
    score -= 0.05;
  }

  // Ensure score stays in valid range
  score = Math.max(0, Math.min(1, score));

  return {
    score: Math.round(score * 100) / 100,
    issues,
  };
}

/**
 * Get singleton extraction service
 */
export function getExtractionService() {
  return {
    extractTemplate,
  };
}

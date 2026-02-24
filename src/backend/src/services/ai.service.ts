import * as fs from 'fs';
import * as path from 'path';
import OpenAI from 'openai';
import { createRedisClient, getRedisClient } from '../lib/redis';
import prisma from '../lib/prisma';
import { getStorageService } from './storage.service';
import { v4 as uuidv4 } from 'uuid';

/**
 * AI Service - Centralizes all OpenAI API calls for ReelForge
 * Handles: GPT-4o text suggestions, DALL-E 3 image generation,
 * rate limiting, prompt templating, cost tracking
 */

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Rate limit constants (requests per minute per user)
const RATE_LIMITS = {
  text: 10,
  image: 5,
};

// Cost estimates (in USD)
const COSTS = {
  textSuggestion: 0.0015, // ~145 tokens at GPT-4o pricing
  dalleImage: 0.02, // DALL-E 3 at 1024x1024
};

/**
 * Error types for AI service
 */
export class AIError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AIError';
  }
}

/**
 * Load prompt template from file
 */
function loadPromptTemplate(filename: string): string {
  const filepath = path.join(__dirname, '../prompts', filename);
  return fs.readFileSync(filepath, 'utf-8');
}

/**
 * Replace placeholders in prompt template
 */
function renderPrompt(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(`{${key}}`, value || '(not provided)');
  }
  return result;
}

/**
 * Check rate limit for user
 */
async function checkRateLimit(userId: string, endpoint: 'text' | 'image'): Promise<void> {
  try {
    const redis = getRedisClient();
    const key = `ai-limit:${userId}:${endpoint}`;
    const limit = RATE_LIMITS[endpoint];

    const count = await redis.incr(key);

    // Set expiry on first request in this minute
    if (count === 1) {
      await redis.expire(key, 60);
    }

    if (count > limit) {
      const ttl = await redis.ttl(key);
      const resetAt = new Date(Date.now() + Math.max(ttl, 0) * 1000).toISOString();

      throw new AIError('RATE_LIMITED', 'Rate limit exceeded', {
        limit,
        window: '1 minute',
        resetAt,
      });
    }
  } catch (error) {
    // If Redis is not available, log warning but allow request
    if (error instanceof AIError) {
      throw error;
    }
    console.warn('[AI-SERVICE] Redis rate limiting unavailable:', error instanceof Error ? error.message : error);
  }
}

/**
 * Generate text suggestions using GPT-4o
 */
export async function generateTextSuggestions(
  projectId: string,
  userId: string,
  slotId: string,
  hint?: string
): Promise<{
  suggestions: string[];
  assetId: string;
  tokensUsed: number;
  cost: number;
}> {
  try {
    // Rate limit check
    await checkRateLimit(userId, 'text');

    // Fetch project and template
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { template: true },
    });

    if (!project) {
      throw new AIError('NOT_FOUND', 'Project not found', { projectId });
    }

    if (project.userId !== userId) {
      throw new AIError('UNAUTHORIZED', 'User does not own this project');
    }

    // Parse template schema
    const schema = project.template.schema as any;
    const slot = schema.slots?.find((s: any) => s.id === slotId);

    if (!slot) {
      throw new AIError('VALIDATION_ERROR', 'Slot not found in template', { slotId });
    }

    if (slot.type !== 'text') {
      throw new AIError('VALIDATION_ERROR', `Slot is type '${slot.type}', not 'text'`, {
        slotId,
      });
    }

    // Load and render prompt
    const template = loadPromptTemplate('ai-text-suggestions.txt');
    const prompt = renderPrompt(template, {
      slotType: slot.type,
      slotLabel: slot.label || slotId,
      slotDescription: slot.description || '',
      userHint: hint?.substring(0, 200) || '(no hint provided)',
    });

    // Call OpenAI GPT-4o
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 150,
    });

    // Parse response
    const content = response.choices[0]?.message?.content || '[]';
    let suggestions: string[];

    try {
      suggestions = JSON.parse(content);
      if (!Array.isArray(suggestions)) {
        throw new Error('Response is not an array');
      }
    } catch (e) {
      throw new AIError('OPENAI_ERROR', 'Failed to parse OpenAI response', {
        content: content.substring(0, 100),
      });
    }

    // Ensure exactly 3 suggestions
    suggestions = suggestions.slice(0, 3);

    // Track usage
    const tokensUsed = response.usage?.total_tokens || 0;
    const cost = COSTS.textSuggestion;

    // Store AI asset
    const assetId = uuidv4();
    await prisma.aIAsset.create({
      data: {
        id: assetId,
        projectId,
        slotId,
        type: 'TEXT',
        prompt,
        outputUrl: null,
        tokensUsed,
        cost,
      },
    });

    return {
      suggestions,
      assetId,
      tokensUsed,
      cost,
    };
  } catch (error) {
    // Handle OpenAI API errors
    if (error instanceof OpenAI.APIError) {
      const details: Record<string, unknown> = {
        openaiMessage: error.message,
        openaiCode: error.code,
      };

      throw new AIError('OPENAI_ERROR', 'Failed to generate text suggestions', details);
    }

    // Re-throw AIError
    if (error instanceof AIError) {
      throw error;
    }

    // Unexpected error
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[AI-SERVICE] Unexpected error in generateTextSuggestions:', errorMessage);
    throw new AIError('INTERNAL_ERROR', 'Unexpected error generating suggestions');
  }
}

/**
 * Generate image using DALL-E 3
 */
export async function generateImage(
  projectId: string,
  userId: string,
  slotId: string,
  userPrompt: string
): Promise<{
  imageUrl: string;
  assetId: string;
  cost: number;
}> {
  try {
    // Rate limit check
    await checkRateLimit(userId, 'image');

    // Fetch project and template
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { template: true },
    });

    if (!project) {
      throw new AIError('NOT_FOUND', 'Project not found', { projectId });
    }

    if (project.userId !== userId) {
      throw new AIError('UNAUTHORIZED', 'User does not own this project');
    }

    // Parse template schema
    const schema = project.template.schema as any;
    const slot = schema.slots?.find((s: any) => s.id === slotId);

    if (!slot) {
      throw new AIError('VALIDATION_ERROR', 'Slot not found in template', { slotId });
    }

    if (slot.type !== 'image') {
      throw new AIError('VALIDATION_ERROR', `Slot is type '${slot.type}', not 'image'`, {
        slotId,
      });
    }

    // Load and render prompt for image enhancement
    const template = loadPromptTemplate('ai-image-description.txt');
    const enhancedPrompt = renderPrompt(template, {
      slotLabel: slot.label || slotId,
      slotDescription: slot.description || '',
      userPrompt: userPrompt.substring(0, 1000),
    });

    // Call OpenAI DALL-E 3
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: enhancedPrompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
    });

    const imageData = response.data?.[0];
    const imageUrl = imageData?.url;
    if (!imageUrl) {
      throw new AIError('OPENAI_ERROR', 'DALL-E 3 did not return an image URL');
    }

    // Download image and upload to MinIO
    const storage = getStorageService();
    const assetId = uuidv4();
    const minioKey = `ai-assets/${assetId}.png`;

    // Download from DALL-E URL
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new AIError('STORAGE_ERROR', 'Failed to download generated image from DALL-E');
    }

    const arrayBuffer = await imageResponse.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer as ArrayBuffer);

    // Upload to MinIO (key, buffer, contentType)
    await storage.uploadFile(minioKey, imageBuffer, 'image/png');

    // Generate presigned URL
    const presignedUrl = await storage.getSignedDownloadUrl(minioKey, 3600);

    // Store AI asset
    const cost = COSTS.dalleImage;
    await prisma.aIAsset.create({
      data: {
        id: assetId,
        projectId,
        slotId,
        type: 'IMAGE',
        prompt: enhancedPrompt,
        outputUrl: presignedUrl,
        tokensUsed: null,
        cost,
      },
    });

    return {
      imageUrl: presignedUrl,
      assetId,
      cost,
    };
  } catch (error) {
    // Handle OpenAI API errors
    if (error instanceof OpenAI.APIError) {
      const details: Record<string, unknown> = {
        openaiMessage: error.message,
        openaiCode: error.code,
      };

      throw new AIError('OPENAI_ERROR', 'Failed to generate image', details);
    }

    // Re-throw AIError
    if (error instanceof AIError) {
      throw error;
    }

    // Unexpected error
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[AI-SERVICE] Unexpected error in generateImage:', errorMessage);
    throw new AIError('INTERNAL_ERROR', 'Unexpected error generating image');
  }
}

/**
 * Get singleton AI service instance
 */
export function getAIService() {
  return {
    generateTextSuggestions,
    generateImage,
  };
}

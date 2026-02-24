import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import sharp from 'sharp';
import OpenAI from 'openai';
import prisma from '../lib/prisma';
import { getStorageService } from './storage.service';
// Import types from shared package
interface DetectedTextOverlay {
  text: string;
  position: {
    x: number;
    y: number;
  };
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
  resolution: {
    width: number;
    height: number;
  };
  sceneCount: number;
  analysisStartedAt: string;
  analysisCompletedAt: string;
  ffmpegVersion: string;
  gpt4oModel: string;
  scenes: VideoScene[];
}

const execAsync = promisify(exec);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Error types for video analysis service
 */
export class VideoAnalysisError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'VideoAnalysisError';
  }
}

/**
 * Extract frames from video using ffmpeg
 * Returns array of frame file paths
 */
async function extractKeyframes(videoPath: string, outputDir: string): Promise<string[]> {
  try {
    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Extract keyframes at 1 fps, prioritizing I-frames
    const command = `ffmpeg -i "${videoPath}" -vf "fps=1,select='eq(pict_type,I)'" -vsync 0 "${outputDir}/frame-%04d.jpg"`;

    console.log(`[VIDEO-ANALYSIS] Running ffmpeg: ${command}`);
    await execAsync(command, { maxBuffer: 10 * 1024 * 1024 });

    // Get list of extracted frames
    const files = fs.readdirSync(outputDir)
      .filter(f => f.startsWith('frame-') && f.endsWith('.jpg'))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    console.log(`[VIDEO-ANALYSIS] Extracted ${files.length} keyframes`);

    // Limit to 20 frames maximum
    const limitedFiles = files.slice(0, 20);

    // Return full paths
    return limitedFiles.map(f => path.join(outputDir, f));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[VIDEO-ANALYSIS] ffmpeg failed:', errorMessage);
    throw new VideoAnalysisError('FRAME_EXTRACTION_ERROR', 'Failed to extract keyframes from video', {
      videoPath,
      error: errorMessage,
    });
  }
}

/**
 * Generate thumbnail from frame and upload to MinIO
 */
async function uploadFrameToStorage(framePath: string, frameIndex: number, videoId: string): Promise<string> {
  try {
    // Generate thumbnail (300px width, maintain aspect)
    const imageBuffer = await sharp(framePath)
      .resize(300, 533, {
        fit: 'cover',
      })
      .jpeg({ quality: 85 })
      .toBuffer();

    // Upload to MinIO
    const storage = getStorageService();
    const key = `video-analysis/${videoId}/frame-${String(frameIndex).padStart(4, '0')}.jpg`;
    const result = await storage.uploadFile(key, imageBuffer, 'image/jpeg');

    console.log(`[VIDEO-ANALYSIS] Uploaded frame ${frameIndex} to ${key}`);
    return result.url;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[VIDEO-ANALYSIS] Failed to upload frame:', errorMessage);
    throw new VideoAnalysisError('STORAGE_ERROR', 'Failed to upload frame to storage', {
      frameIndex,
      error: errorMessage,
    });
  }
}

/**
 * Analyze a single frame with GPT-4o Vision
 */
async function analyzeFrameWithGPT(
  frameUrl: string,
  frameNumber: number,
  timestamp: number,
  videoDuration: number,
  retries: number = 3
): Promise<Partial<VideoScene>> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Fetch frame from URL and convert to base64
      const frameResponse = await fetch(frameUrl);
      if (!frameResponse.ok) {
        throw new Error(`Failed to fetch frame from URL: ${frameResponse.statusText}`);
      }

      const arrayBuffer = await frameResponse.arrayBuffer();
      const base64Image = Buffer.from(arrayBuffer as ArrayBuffer).toString('base64');

      // Call GPT-4o Vision with frame
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `You are an expert video template designer and visual content analyzer.
Your task is to analyze this keyframe from a 9:16 short-form video (Instagram Reel or TikTok).

Frame number: ${frameNumber}
Timestamp: ${timestamp}s
Video duration: ${videoDuration}s

Analyze and describe:
1. What is the background? (solid color, photo, video clip, etc.)
2. What text overlays do you see? (transcribe exactly, note position and style)
3. What color palette dominates? (3-5 main colors)
4. What animation or transition effects might be applied?
5. Overall visual design quality (1-10)?

Return ONLY a valid JSON object with these fields:
{
  "backgroundType": "image" | "video" | "solid" | "gradient" | "unknown",
  "dominantColors": ["#RRGGBB", ...],
  "brightness": 0-100,
  "contrast": 0-100,
  "detectedText": [{"text": "...", "position": {"x": 0-1, "y": 0-1}, "fontSize": "small"|"medium"|"large"|"extra_large", "fontWeight": "normal"|"bold"|"extra_bold", "color": "#RRGGBB", "alignment": "left"|"center"|"right", "confidence": 0-1}],
  "animationCues": ["fade_in", "slide_left", ...],
  "confidenceScore": 0-1
}`,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      });

      // Parse response
      const content = response.choices[0]?.message?.content || '{}';

      let analysisData: any;
      try {
        // Extract JSON from response (it might be wrapped in markdown)
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No JSON found in response');
        }
        analysisData = JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.warn(`[VIDEO-ANALYSIS] Failed to parse GPT response on attempt ${attempt}:`, content.substring(0, 200));
        if (attempt === retries) {
          throw e;
        }
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        continue;
      }

      // Validate and normalize response
      const scene: Partial<VideoScene> = {
        backgroundType: analysisData.backgroundType || 'unknown',
        dominantColors: (analysisData.dominantColors || []).slice(0, 5),
        brightness: Math.min(100, Math.max(0, analysisData.brightness || 50)),
        contrast: Math.min(100, Math.max(0, analysisData.contrast || 50)),
        detectedText: (analysisData.detectedText || []).map((text: any) => ({
          text: text.text || '',
          position: {
            x: Math.min(1, Math.max(0, text.position?.x || 0)),
            y: Math.min(1, Math.max(0, text.position?.y || 0)),
          },
          fontSize: text.fontSize || 'medium',
          fontWeight: text.fontWeight || 'normal',
          color: text.color || '#FFFFFF',
          backgroundColor: text.backgroundColor,
          alignment: text.alignment || 'center',
          confidence: Math.min(1, Math.max(0, text.confidence || 0.8)),
        })),
        animationCues: analysisData.animationCues || [],
        confidenceScore: Math.min(1, Math.max(0, analysisData.confidenceScore || 0.7)),
      };

      console.log(`[VIDEO-ANALYSIS] Analyzed frame ${frameNumber} successfully`);
      return scene;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[VIDEO-ANALYSIS] GPT-4o analysis failed on attempt ${attempt}/${retries}:`, errorMessage);

      if (attempt === retries) {
        throw new VideoAnalysisError('VIDEO_ANALYSIS_FAILED', 'Failed to analyze frame with GPT-4o Vision', {
          frameNumber,
          error: errorMessage,
        });
      }

      // Wait before retry with exponential backoff
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }

  throw new VideoAnalysisError('VIDEO_ANALYSIS_FAILED', 'Max retries exceeded for frame analysis', {
    frameNumber,
  });
}

/**
 * Get video metadata using ffprobe
 */
async function getVideoMetadata(
  videoPath: string
): Promise<{ duration: number; fps: number; width: number; height: number }> {
  try {
    const command = `ffprobe -v error -select_streams v:0 -show_entries stream=duration,r_frame_rate,width,height -of csv=p=0 "${videoPath}"`;

    const { stdout } = await execAsync(command);
    const [durationStr, fpsStr, widthStr, heightStr] = stdout.trim().split(',');

    const duration = parseFloat(durationStr) || 15;
    const [fpsNum, fpsDen] = fpsStr.split('/');
    const fps = fpsDen ? parseInt(fpsNum) / parseInt(fpsDen) : parseInt(fpsNum);
    const width = parseInt(widthStr) || 1080;
    const height = parseInt(heightStr) || 1920;

    return { duration, fps: Math.round(fps), width, height };
  } catch (error) {
    console.warn('[VIDEO-ANALYSIS] Failed to get video metadata, using defaults:', error);
    return { duration: 15, fps: 30, width: 1080, height: 1920 };
  }
}

/**
 * Main analysis function
 */
export async function analyzeVideo(videoId: string): Promise<VideoAnalysis> {
  const tempDir = path.join(os.tmpdir(), `video-analysis-${videoId}`);
  const storage = getStorageService();

  try {
    // Get collected video from database
    const collectedVideo = await prisma.collectedVideo.findUnique({
      where: { id: videoId },
    });

    if (!collectedVideo) {
      throw new VideoAnalysisError('VIDEO_NOT_FOUND', 'Collected video not found', { videoId });
    }

    if (collectedVideo.status !== 'READY') {
      throw new VideoAnalysisError('VIDEO_NOT_READY', 'Video has not finished downloading', {
        videoId,
        status: collectedVideo.status,
      });
    }

    if (!collectedVideo.videoUrl) {
      throw new VideoAnalysisError('VIDEO_NOT_READY', 'Video URL not available', { videoId });
    }

    // Get presigned URL for video (videoUrl is stored as MinIO key)
    const videoUrl = collectedVideo.videoUrl.startsWith('http')
      ? collectedVideo.videoUrl
      : await storage.getSignedDownloadUrl(collectedVideo.videoUrl, 3600);

    console.log(`[VIDEO-ANALYSIS] Starting analysis for video ${videoId}`);

    // Update status to ANALYZING
    await (prisma.collectedVideo as any).update({
      where: { id: videoId },
      data: {
        analysisStatus: 'ANALYZING',
        analysisError: null,
      },
    });

    // Get video metadata
    const metadata = await getVideoMetadata(videoUrl);

    // Extract keyframes
    const framePaths = await extractKeyframes(videoUrl, tempDir);

    if (framePaths.length === 0) {
      throw new VideoAnalysisError('FRAME_EXTRACTION_ERROR', 'No keyframes could be extracted from video', {
        videoId,
      });
    }

    // Upload frames and analyze
    const scenes: VideoScene[] = [];
    const analysisStartedAt = new Date().toISOString();

    for (let i = 0; i < framePaths.length; i++) {
      const framePath = framePaths[i];
      const frameNumber = i * Math.floor(metadata.fps); // Approximate frame number
      const timestamp = (i * metadata.duration) / framePaths.length;

      try {
        // Upload frame to storage
        const frameUrl = await uploadFrameToStorage(framePath, i, videoId);

        // Analyze frame with GPT-4o Vision
        const analysisData = await analyzeFrameWithGPT(frameUrl, frameNumber, timestamp, metadata.duration);

        // Compile scene
        const scene: VideoScene = {
          sceneIndex: i,
          frameNumber,
          timestamp: Math.round(timestamp * 100) / 100,
          durationEstimate: Math.round((metadata.duration / framePaths.length) * 100) / 100,
          frameUrl,
          backgroundType: (analysisData.backgroundType || 'unknown') as any,
          dominantColors: analysisData.dominantColors || [],
          brightness: analysisData.brightness || 50,
          contrast: analysisData.contrast || 50,
          detectedText: analysisData.detectedText || [],
          animationCues: analysisData.animationCues || [],
          confidenceScore: analysisData.confidenceScore || 0.7,
        };

        scenes.push(scene);
      } catch (error) {
        // Log error but continue with other frames
        console.error(`[VIDEO-ANALYSIS] Failed to analyze frame ${i}:`, error);
      }
    }

    if (scenes.length === 0) {
      throw new VideoAnalysisError('VIDEO_ANALYSIS_FAILED', 'Failed to analyze any frames from video', {
        videoId,
      });
    }

    // Compile final VideoAnalysis
    const analysis: VideoAnalysis = {
      videoId,
      durationSeconds: Math.round(metadata.duration * 100) / 100,
      fps: metadata.fps,
      resolution: {
        width: metadata.width,
        height: metadata.height,
      },
      sceneCount: scenes.length,
      analysisStartedAt,
      analysisCompletedAt: new Date().toISOString(),
      ffmpegVersion: 'ffmpeg (from system)',
      gpt4oModel: 'gpt-4o',
      scenes,
    };

    // Store in database
    await (prisma.collectedVideo as any).update({
      where: { id: videoId },
      data: {
        analysisStatus: 'ANALYZED',
        analysisResult: analysis,
        analysisError: null,
      },
    });

    console.log(`[VIDEO-ANALYSIS] Analysis complete for video ${videoId}: ${scenes.length} scenes analyzed`);

    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }

    return analysis;
  } catch (error) {
    // Update database with error
    if (error instanceof VideoAnalysisError) {
      await (prisma.collectedVideo as any).update({
        where: { id: videoId },
        data: {
          analysisStatus: 'FAILED',
          analysisError: error.message,
        },
      }).catch((e: any) => console.error('[VIDEO-ANALYSIS] Failed to update error status:', e));

      throw error;
    }

    // Unexpected error
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[VIDEO-ANALYSIS] Unexpected error:', errorMessage);

    await (prisma.collectedVideo as any).update({
      where: { id: videoId },
      data: {
        analysisStatus: 'FAILED',
        analysisError: errorMessage,
      },
    }).catch((e: any) => console.error('[VIDEO-ANALYSIS] Failed to update error status:', e));

    throw new VideoAnalysisError('INTERNAL_ERROR', 'Unexpected error during video analysis', {
      error: errorMessage,
    });
  } finally {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (e) {
        console.warn('[VIDEO-ANALYSIS] Failed to clean up temp directory:', e);
      }
    }
  }
}

/**
 * Get singleton analysis service
 */
export function getVideoAnalysisService() {
  return {
    analyzeVideo,
  };
}

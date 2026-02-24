/**
 * Video Analysis types for template extraction
 */

export interface DetectedTextOverlay {
  text: string;
  position: {
    x: number; // 0-1, normalized X coordinate
    y: number; // 0-1, normalized Y coordinate
  };
  fontSize: 'small' | 'medium' | 'large' | 'extra_large';
  fontWeight: 'normal' | 'bold' | 'extra_bold';
  color: string; // hex code
  backgroundColor?: string; // hex code if text has background
  alignment: 'left' | 'center' | 'right';
  confidence: number; // 0-1, OCR confidence
}

export interface VideoScene {
  // Frame extraction metadata
  sceneIndex: number; // 0-indexed scene number
  frameNumber: number; // absolute frame number in video
  timestamp: number; // seconds in video
  durationEstimate: number; // estimated duration of this scene (seconds)
  frameUrl: string; // S3/MinIO URL to extracted JPEG

  // Visual composition
  backgroundType: 'image' | 'video' | 'solid' | 'gradient' | 'unknown';
  dominantColors: string[]; // hex codes
  brightness: number; // 0-100
  contrast: number; // 0-100

  // Text detection via GPT-4o Vision
  detectedText: DetectedTextOverlay[];

  // Animation cues
  animationCues: string[]; // e.g. ["fade_in", "text_slide", "pan_left"]

  // Confidence scores
  confidenceScore: number; // 0-1
}

export interface VideoAnalysis {
  // Metadata
  videoId: string;
  durationSeconds: number;
  fps: number;
  resolution: {
    width: number;
    height: number;
  };
  sceneCount: number;
  analysisStartedAt: string; // ISO 8601
  analysisCompletedAt: string;
  ffmpegVersion: string;
  gpt4oModel: string;

  // Per-scene analysis
  scenes: VideoScene[];
}

/**
 * Template types (mirrors @reelforge/shared for now to avoid monorepo import issues)
 */

export interface TemplateSchema {
  version: '1.0';
  slots: any[];
  scenes: any[];
  transitions?: string[];
  defaultMusic?: string;
  audioTags?: string[];
}

export interface Template {
  id: string;
  name: string;
  slug: string;
  category: string;
  tags: string[];
  description: string;
  schema: TemplateSchema;
  thumbnailUrl: string | null;
  durationSeconds: number;
  isPublished: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

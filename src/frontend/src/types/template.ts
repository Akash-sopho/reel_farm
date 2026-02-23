/**
 * Template types for frontend
 * Mirrors types from src/shared/types/template.ts
 */

export type SlotType = 'image' | 'text' | 'video' | 'audio';

export interface SlotConstraints {
  maxLength?: number;
  minWidth?: number;
  minHeight?: number;
  accept?: string[];
}

export interface ContentSlot {
  id: string;
  type: SlotType;
  label: string;
  required: boolean;
  placeholder?: string;
  constraints?: SlotConstraints;
}

export interface SlotFill {
  slotId: string;
  type: SlotType;
  value: string;
}

export interface SceneComponent {
  componentId: string;
  zIndex: number;
  slotBindings: Record<string, string>;
  props: Record<string, unknown>;
}

export interface Scene {
  id: string;
  durationSeconds: number;
  components: SceneComponent[];
}

export interface TemplateSchema {
  version: '1.0';
  slots: ContentSlot[];
  scenes: Scene[];
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
  createdAt: string;
  updatedAt: string;
}
